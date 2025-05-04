import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OnboardingData } from '@/components/onboarding/OnboardingWizard';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  onboardingData: OnboardingData | null;
  saveOnboardingData: (data: OnboardingData) => Promise<void>;
  contextualMode: boolean;
  setContextualMode: (mode: boolean) => void;
  resetOnboarding: () => void;
}

const defaultOnboardingData: OnboardingData = {
  careerStage: '',
  industryFocus: [],
  careerGoals: '',
  resumeFile: null,
  skills: [],
  preferredLearningStyle: '',
  timeAvailability: ''
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [contextualMode, setContextualMode] = useState<boolean>(false);
  const { toast } = useToast();

  // Check if onboarding is complete from local storage on initial load
  useEffect(() => {
    const storedData = localStorage.getItem('onboardingData');
    const completed = localStorage.getItem('onboardingComplete');
    
    if (storedData) {
      setOnboardingData(JSON.parse(storedData));
    }
    
    if (completed === 'true') {
      setIsOnboardingComplete(true);
    } else {
      // If no record of completion, show onboarding on first load
      // But don't show it in contextual mode initially
      setShowOnboarding(!contextualMode);
    }
  }, [contextualMode]);

  const saveOnboardingData = async (data: OnboardingData) => {
    try {
      // Create a copy without the resumeFile for local storage
      const dataForStorage = { ...data };
      delete dataForStorage.resumeFile;
      
      // Save to local storage
      localStorage.setItem('onboardingData', JSON.stringify(dataForStorage));
      localStorage.setItem('onboardingComplete', 'true');
      
      // Update state
      setOnboardingData(data);
      setIsOnboardingComplete(true);
      setShowOnboarding(false);
      
      // If we have a resume file, upload it
      if (data.resumeFile) {
        const formData = new FormData();
        formData.append('resume', data.resumeFile);
        
        // Upload the resume
        await apiRequest('POST', '/api/upload-resume', formData, true);
        
        // Invalidate any relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/user-profile'] });
      }
      
      // Create or update user profile with onboarding data
      await apiRequest('POST', '/api/user-profile', {
        careerStage: data.careerStage,
        industryFocus: data.industryFocus,
        careerGoals: data.careerGoals,
        skills: data.skills,
        preferredLearningStyle: data.preferredLearningStyle,
        timeAvailability: data.timeAvailability
      });
      
      toast({
        title: "Onboarding complete!",
        description: "Your personalized career acceleration plan is ready.",
      });
      
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast({
        title: "Error saving your data",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const resetOnboarding = () => {
    localStorage.removeItem('onboardingComplete');
    localStorage.removeItem('onboardingData');
    setOnboardingData(null);
    setIsOnboardingComplete(false);
    setShowOnboarding(true);
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingComplete,
        showOnboarding,
        setShowOnboarding,
        onboardingData,
        saveOnboardingData,
        contextualMode,
        setContextualMode,
        resetOnboarding
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  
  return context;
}