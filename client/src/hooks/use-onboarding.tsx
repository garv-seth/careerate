import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OnboardingData } from '@/components/onboarding/OnboardingWizard';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface OnboardingContextType {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  isOnboardingComplete: boolean;
  saveOnboardingData: (data: OnboardingData) => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch onboarding status
  const { data: onboardingStatus, isLoading } = useQuery({
    queryKey: ['/api/onboarding/onboarding-status'],
    queryFn: async () => {
      if (!user) return { isComplete: false };
      const res = await apiRequest('GET', '/api/onboarding/onboarding-status');
      return res.json();
    },
    enabled: !!user,
  });

  // Determine if onboarding is complete
  const isOnboardingComplete = onboardingStatus?.isComplete || false;

  // Show onboarding wizard automatically for new users
  useEffect(() => {
    if (user && !isLoading && onboardingStatus && !isOnboardingComplete) {
      setShowOnboarding(true);
    }
  }, [user, isLoading, onboardingStatus, isOnboardingComplete]);

  // Mutation to upload resume file
  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await apiRequest('POST', '/api/onboarding/upload-resume', formData);
      return res.json();
    },
  });

  // Mutation to save profile data
  const saveProfileMutation = useMutation({
    mutationFn: async (profileData: Omit<OnboardingData, 'resumeFile'>) => {
      const res = await apiRequest('POST', '/api/onboarding/user-profile', profileData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/user-profile'] });
    },
  });

  // Function to save all onboarding data
  const saveOnboardingData = async (data: OnboardingData) => {
    try {
      // First, upload resume if provided
      if (data.resumeFile) {
        await uploadResumeMutation.mutateAsync(data.resumeFile);
      }

      // Then save the rest of the profile data
      const { resumeFile, ...profileData } = data;
      await saveProfileMutation.mutateAsync(profileData);

      toast({
        title: 'Profile Created',
        description: 'Your career profile has been successfully set up!',
      });
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast({
        title: 'Error',
        description: 'There was a problem saving your profile data. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        showOnboarding,
        setShowOnboarding,
        isOnboardingComplete,
        saveOnboardingData,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};