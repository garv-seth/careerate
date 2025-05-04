import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

// Onboarding steps
export enum OnboardingStep {
  CLOSED = "closed",
  WELCOME = "welcome",
  RESUME_UPLOAD = "resume-upload",
  CAREER_STAGE = "career-stage",
  INDUSTRY_FOCUS = "industry-focus",
  CAREER_GOALS = "career-goals",
  LEARNING_PREFERENCES = "learning-preferences",
  TIME_AVAILABILITY = "time-availability",
  SKILLS_ASSESSMENT = "skills-assessment",
  COMPLETE = "complete",
}

// Career stage options
export enum CareerStage {
  STUDENT = "student",
  ENTRY_LEVEL = "entry-level",
  MID_LEVEL = "mid-level",
  SENIOR_LEVEL = "senior-level",
  EXECUTIVE = "executive",
  CAREER_CHANGER = "career-changer",
}

// Learning style options
export enum LearningStyle {
  VISUAL = "visual",
  INTERACTIVE = "interactive",
  READING = "reading",
  AUDIO = "audio",
  PRACTICAL = "practical",
}

// Time availability options
export enum TimeAvailability {
  MINIMAL = "minimal", // < 2 hours/week
  LIMITED = "limited", // 2-5 hours/week
  MODERATE = "moderate", // 5-10 hours/week
  SUBSTANTIAL = "substantial", // 10-15 hours/week
  EXTENSIVE = "extensive", // 15+ hours/week
}

// Industry options
export const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Marketing",
  "Sales",
  "Design",
  "Engineering",
  "Consulting",
  "Media",
  "Entertainment",
  "Manufacturing",
  "Retail",
  "Hospitality",
  "Government",
  "Non-profit",
  "Legal",
  "Real Estate",
  "Construction",
  "Agriculture",
  "Energy",
  "Transportation",
];

// Onboarding profile data
export interface OnboardingProfile {
  userId?: string;
  resumeText?: string | null;
  lastScan?: Date | null;
  careerStage?: CareerStage;
  industryFocus?: string[];
  careerGoals?: string;
  preferredLearningStyle?: LearningStyle;
  timeAvailability?: TimeAvailability;
}

// Context type
interface OnboardingContextType {
  // State
  currentStep: OnboardingStep;
  profile: OnboardingProfile;
  isVisible: boolean;
  isLoading: boolean;
  activeSkillMap: Record<string, { current: number; target: number }>;
  
  // Methods
  nextStep: () => void;
  prevStep: () => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  goToStep: (step: OnboardingStep) => void;
  updateProfile: (data: Partial<OnboardingProfile>) => void;
  submitProfile: () => Promise<void>;
  uploadResume: (file: File) => Promise<void>;
  resetOnboarding: () => void;
  updateSkill: (skillName: string, current: number, target: number) => void;
}

export const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Get auth context for user ID
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.CLOSED);
  const [profile, setProfile] = useState<OnboardingProfile>({});
  const [isVisible, setIsVisible] = useState(false);
  const [activeSkillMap, setActiveSkillMap] = useState<Record<string, { current: number; target: number }>>({});
  
  // Fetch onboarding status when user changes
  const { data: onboardingStatus, isLoading } = useQuery({
    queryKey: ["/api/onboarding/onboarding-status"],
    queryFn: async () => {
      if (!user) return { completed: false, profile: null };
      const res = await fetch("/api/onboarding/onboarding-status");
      if (!res.ok) {
        if (res.status === 404) {
          return { completed: false, profile: null };
        }
        throw new Error("Failed to fetch onboarding status");
      }
      return res.json();
    },
    enabled: !!user,
  });
  
  // Get profile data
  const { data: profileData } = useQuery({
    queryKey: ["/api/onboarding/user-profile"],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch("/api/onboarding/user-profile");
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch user profile");
      }
      return res.json();
    },
    enabled: !!user,
  });
  
  // Upload resume mutation
  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);
      
      const res = await fetch("/api/onboarding/upload-resume", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to upload resume");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Resume uploaded",
        description: "Your resume has been successfully uploaded and analyzed.",
      });
      
      setProfile((prev) => ({
        ...prev,
        resumeText: data.resumeText,
      }));
      
      // Extract skills from the response
      if (data.skills && Array.isArray(data.skills)) {
        const skillMap: Record<string, { current: number; target: number }> = {};
        data.skills.forEach((skill: string) => {
          skillMap[skill] = { current: 1, target: 3 };
        });
        setActiveSkillMap(skillMap);
      }
      
      nextStep();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Submit profile mutation
  const submitProfileMutation = useMutation({
    mutationFn: async (profileData: OnboardingProfile) => {
      const res = await apiRequest(
        "POST", 
        "/api/onboarding/user-profile", 
        profileData
      );
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to save profile");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile saved",
        description: "Your profile has been successfully saved.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/onboarding-status"] });
      
      setCurrentStep(OnboardingStep.COMPLETE);
      
      // After a short delay, close the onboarding
      setTimeout(() => {
        setIsVisible(false);
        setCurrentStep(OnboardingStep.CLOSED);
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize with profile data when it loads
  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
    }
  }, [profileData]);
  
  // Open onboarding for new users
  useEffect(() => {
    if (user && onboardingStatus && !onboardingStatus.completed && currentStep === OnboardingStep.CLOSED) {
      openOnboarding();
    }
  }, [user, onboardingStatus, currentStep]);

  // Navigation functions
  const nextStep = () => {
    switch (currentStep) {
      case OnboardingStep.WELCOME:
        setCurrentStep(OnboardingStep.RESUME_UPLOAD);
        break;
      case OnboardingStep.RESUME_UPLOAD:
        setCurrentStep(OnboardingStep.CAREER_STAGE);
        break;
      case OnboardingStep.CAREER_STAGE:
        setCurrentStep(OnboardingStep.INDUSTRY_FOCUS);
        break;
      case OnboardingStep.INDUSTRY_FOCUS:
        setCurrentStep(OnboardingStep.CAREER_GOALS);
        break;
      case OnboardingStep.CAREER_GOALS:
        setCurrentStep(OnboardingStep.LEARNING_PREFERENCES);
        break;
      case OnboardingStep.LEARNING_PREFERENCES:
        setCurrentStep(OnboardingStep.TIME_AVAILABILITY);
        break;
      case OnboardingStep.TIME_AVAILABILITY:
        setCurrentStep(OnboardingStep.SKILLS_ASSESSMENT);
        break;
      case OnboardingStep.SKILLS_ASSESSMENT:
        submitProfile();
        break;
      default:
        break;
    }
  };
  
  const prevStep = () => {
    switch (currentStep) {
      case OnboardingStep.RESUME_UPLOAD:
        setCurrentStep(OnboardingStep.WELCOME);
        break;
      case OnboardingStep.CAREER_STAGE:
        setCurrentStep(OnboardingStep.RESUME_UPLOAD);
        break;
      case OnboardingStep.INDUSTRY_FOCUS:
        setCurrentStep(OnboardingStep.CAREER_STAGE);
        break;
      case OnboardingStep.CAREER_GOALS:
        setCurrentStep(OnboardingStep.INDUSTRY_FOCUS);
        break;
      case OnboardingStep.LEARNING_PREFERENCES:
        setCurrentStep(OnboardingStep.CAREER_GOALS);
        break;
      case OnboardingStep.TIME_AVAILABILITY:
        setCurrentStep(OnboardingStep.LEARNING_PREFERENCES);
        break;
      case OnboardingStep.SKILLS_ASSESSMENT:
        setCurrentStep(OnboardingStep.TIME_AVAILABILITY);
        break;
      default:
        break;
    }
  };
  
  const openOnboarding = () => {
    setIsVisible(true);
    setCurrentStep(OnboardingStep.WELCOME);
  };
  
  const closeOnboarding = () => {
    setIsVisible(false);
    setCurrentStep(OnboardingStep.CLOSED);
  };
  
  const goToStep = (step: OnboardingStep) => {
    setCurrentStep(step);
  };
  
  const updateProfile = (data: Partial<OnboardingProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...data,
    }));
  };
  
  const submitProfile = async () => {
    if (!user) return;
    
    // Combine profile data with skills
    const finalProfile = {
      ...profile,
      skills: Object.entries(activeSkillMap).map(([name, levels]) => ({
        name,
        currentLevel: levels.current,
        targetLevel: levels.target,
      })),
    };
    
    await submitProfileMutation.mutateAsync(finalProfile);
  };
  
  const uploadResume = async (file: File) => {
    await uploadResumeMutation.mutateAsync(file);
  };
  
  const resetOnboarding = () => {
    setProfile({});
    setActiveSkillMap({});
    setCurrentStep(OnboardingStep.WELCOME);
  };
  
  const updateSkill = (skillName: string, current: number, target: number) => {
    setActiveSkillMap((prev) => ({
      ...prev,
      [skillName]: { current, target },
    }));
  };
  
  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        profile,
        isVisible,
        isLoading,
        activeSkillMap,
        nextStep,
        prevStep,
        openOnboarding,
        closeOnboarding,
        goToStep,
        updateProfile,
        submitProfile,
        uploadResume,
        resetOnboarding,
        updateSkill,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}