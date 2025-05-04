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
    { name: 'Welcome', component: <WelcomeStep data={data} updateData={updateData} nextStep={nextStep} /> },
    { name: 'Career Profile', component: <CareerGoalsStep data={data} updateData={updateData} /> },
    { name: 'Skills', component: <SkillsAssessmentStep data={data} updateData={updateData} /> },
    { name: 'Resume', component: <ResumeUploadStep data={data} updateData={updateData} /> },
    { name: 'Learning Style', component: <FinalStep data={data} updateData={updateData} /> }
  ];
  
  const totalSteps = steps.length;
  const progressPercentage = (currentStep / (totalSteps - 1)) * 100;
  
  // Check if current step is valid to proceed
  const canProceed = () => {
    switch (currentStep) {
      case 0: // Welcome
        return true;
      case 1: // Career Goals
        return Boolean(data.careerStage) && data.industryFocus.length > 0;
      case 2: // Skills
        return data.skills.length > 0;
      case 3: // Resume
        return true; // Resume is optional
      case 4: // Learning Style
        return Boolean(data.preferredLearningStyle && data.timeAvailability);
      default:
        return false;
    }
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
        
        {/* Navigation buttons */}
        <div className="px-6 py-4 border-t flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft size={16} />
            Back
          </Button>
          
          {currentStep < totalSteps - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="gap-2"
            >
              Next
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Complete
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}