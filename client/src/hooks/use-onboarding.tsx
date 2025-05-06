import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

// Enums for typed options
export enum CareerStage {
  STUDENT = 'student',
  ENTRY_LEVEL = 'entry_level',
  MID_LEVEL = 'mid_level',
  SENIOR_LEVEL = 'senior_level',
  EXECUTIVE = 'executive',
  CAREER_CHANGER = 'career_changer'
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDIO = 'audio',
  READING = 'reading',
  PRACTICAL = 'practical',
  INTERACTIVE = 'interactive'
}

export enum TimeAvailability {
  MINIMAL = 'minimal',
  LIMITED = 'limited',
  MODERATE = 'moderate',
  SUBSTANTIAL = 'substantial',
  EXTENSIVE = 'extensive'
}

// Types for onboarding data
export type Skill = {
  name: string;
  level: number; // 1-10
  interest: number; // 1-10
};

export type OnboardingData = {
  careerStage?: CareerStage;
  industryFocus?: string[];
  careerGoals?: string;
  preferredLearningStyle?: LearningStyle;
  timeAvailability?: TimeAvailability;
  skills: Skill[];
  extractedSkills?: string[];
  resumeFile?: File | null;
  resumeAnalysisComplete?: boolean;
  currentStep: number;
};

// Context type
type OnboardingContextType = {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  totalSteps: number;
  isLoading: boolean;
  isComplete: boolean;
  uploadResume: () => Promise<void>;
  isUploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  resumeFile: File | null;
  setResumeFile: (file: File | null) => void;
  submitOnboarding: () => Promise<void>;
  isSubmitting: boolean;
};

// Default values
const defaultOnboardingData: OnboardingData = {
  skills: [],
  currentStep: 0,
};

// Create context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider component
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [totalSteps] = useState(7); // Welcome, Resume, Career Stage, Industry, Goals, Learning, Time, Skills
  
  // Fetch onboarding status
  const { 
    data: statusData, 
    isLoading: isStatusLoading 
  } = useQuery({
    queryKey: ['/api/onboarding/onboarding-status'],
    enabled: isAuthenticated,
  });
  
  // Fetch profile data if onboarding is complete
  const { 
    data: profileData, 
    isLoading: isProfileLoading 
  } = useQuery({
    queryKey: ['/api/onboarding/user-profile'],
    enabled: isAuthenticated && statusData?.isComplete === true,
  });
  
  // Submit onboarding data
  const { 
    mutateAsync: submitOnboardingData,
    isPending: isSubmitting
  } = useMutation({
    mutationFn: async (data: Omit<OnboardingData, 'currentStep' | 'resumeFile' | 'resumeAnalysisComplete'>) => {
      const response = await fetch('/api/onboarding/user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save onboarding data');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/user-profile'] });
    },
  });
  
  // Initialize data from profile if available
  useEffect(() => {
    if (profileData) {
      const {
        careerStage,
        industryFocus,
        careerGoals,
        preferredLearningStyle,
        timeAvailability,
        skills,
        resumeText,
      } = profileData;
      
      setData(prevData => ({
        ...prevData,
        careerStage,
        industryFocus,
        careerGoals,
        preferredLearningStyle,
        timeAvailability,
        skills: skills || [],
        resumeAnalysisComplete: !!resumeText,
      }));
    }
  }, [profileData]);
  
  // Update data function
  const updateData = (newData: Partial<OnboardingData>) => {
    setData(prevData => ({ ...prevData, ...newData }));
  };
  
  // Navigation functions
  const nextStep = () => {
    if (data.currentStep < totalSteps - 1) {
      updateData({ currentStep: data.currentStep + 1 });
    }
  };
  
  const prevStep = () => {
    if (data.currentStep > 0) {
      updateData({ currentStep: data.currentStep - 1 });
    }
  };
  
  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      updateData({ currentStep: step });
    }
  };
  
  // Resume upload function
  const uploadResume = async () => {
    if (!resumeFile) {
      setUploadError('No file selected');
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      
      const response = await fetch('/api/onboarding/upload-resume', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload resume');
      }
      
      const data = await response.json();
      
      setUploadSuccess(true);
      updateData({ 
        extractedSkills: data.analysis?.skills || [],
        resumeAnalysisComplete: true 
      });
      
      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/user-profile'] });
      
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Final submission
  const submitOnboarding = async () => {
    const submissionData = {
      careerStage: data.careerStage,
      industryFocus: data.industryFocus,
      careerGoals: data.careerGoals,
      preferredLearningStyle: data.preferredLearningStyle,
      timeAvailability: data.timeAvailability,
      skills: data.skills
    };
    
    await submitOnboardingData(submissionData);
  };
  
  // Check if onboarding is complete
  const isComplete = !!(
    data.careerStage &&
    data.industryFocus?.length &&
    data.careerGoals &&
    data.preferredLearningStyle &&
    data.timeAvailability &&
    data.skills.length
  );
  
  const isLoading = isStatusLoading || isProfileLoading;
  
  // Context value
  const value: OnboardingContextType = {
    data,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    totalSteps,
    isLoading,
    isComplete,
    uploadResume,
    isUploading,
    uploadError,
    uploadSuccess,
    resumeFile,
    setResumeFile,
    submitOnboarding,
    isSubmitting,
  };
  
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Hook for using the onboarding context
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  
  return context;
}