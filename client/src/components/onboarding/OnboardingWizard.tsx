import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/use-onboarding';
import { WelcomeStep } from './steps/WelcomeStep';
import { CareerGoalsStep } from './steps/CareerGoalsStep';
import { SkillsAssessmentStep } from './steps/SkillsAssessmentStep';
import { ResumeUploadStep } from './steps/ResumeUploadStep';
import { FinalStep } from './steps/FinalStep';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';

export interface OnboardingData {
  careerStage: string;
  industryFocus: string[];
  careerGoals: string;
  resumeFile: File | null;
  skills: {
    name: string;
    level: number;
    interest: number;
  }[];
  preferredLearningStyle: string;
  timeAvailability: string;
}

export function OnboardingWizard() {
  const { showOnboarding, setShowOnboarding, saveOnboardingData } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    careerStage: '',
    industryFocus: [],
    careerGoals: '',
    resumeFile: null,
    skills: [],
    preferredLearningStyle: '',
    timeAvailability: ''
  });
  
  const updateData = (newData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };
  
  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await saveOnboardingData(data);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const steps = [
    { 
      name: 'Welcome', 
      component: <WelcomeStep 
        data={data} 
        onNext={nextStep} 
      /> 
    },
    { 
      name: 'Career Profile', 
      component: <CareerGoalsStep 
        data={data} 
        updateData={updateData} 
        onNext={nextStep} 
        onBack={prevStep} 
      /> 
    },
    { 
      name: 'Skills', 
      component: <SkillsAssessmentStep 
        data={data} 
        updateData={updateData} 
        onNext={nextStep} 
        onBack={prevStep} 
      /> 
    },
    { 
      name: 'Resume', 
      component: <ResumeUploadStep 
        data={data} 
        updateData={updateData} 
        onNext={nextStep} 
        onBack={prevStep} 
      /> 
    },
    { 
      name: 'Final', 
      component: <FinalStep 
        data={data} 
        onComplete={completeOnboarding} 
        onBack={prevStep} 
      /> 
    }
  ];
  
  const totalSteps = steps.length;
  const progressPercentage = (currentStep / (totalSteps - 1)) * 100;
  
  // Function to handle successful onboarding completion
  const completeOnboarding = () => {
    handleSubmit();
    setShowOnboarding(false);
  };
  
  return (
    <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="relative h-1 bg-muted w-full">
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Steps indicator */}
        <div className="px-6 pt-4 flex justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              - {steps[currentStep].name}
            </span>
          </div>
        </div>
        
        {/* Step content */}
        <div className="px-6 py-2 max-h-[70vh] overflow-y-auto">
          {steps[currentStep].component}
        </div>
        
        {/* Progress indicator footer */}
        <div className="px-6 py-4 border-t flex items-center justify-center">
          <div className="flex space-x-1">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}