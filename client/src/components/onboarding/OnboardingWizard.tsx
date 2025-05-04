import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { WelcomeStep } from './steps/WelcomeStep';
import { CareerGoalsStep } from './steps/CareerGoalsStep';
import { SkillsAssessmentStep } from './steps/SkillsAssessmentStep';
import { ResumeUploadStep } from './steps/ResumeUploadStep';
import { FinalStep } from './steps/FinalStep';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type OnboardingData = {
  careerStage: 'early' | 'mid' | 'senior' | 'leadership' | '';
  industryFocus: string[];
  careerGoals: string;
  resumeFile: File | null;
  skills: {
    name: string;
    level: number;
    interest: number;
  }[];
  preferredLearningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | '';
  timeAvailability: 'minimal' | 'moderate' | 'significant' | '';
};

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onClose?: () => void;
  isOpen: boolean;
  contextual?: boolean;
}

export function OnboardingWizard({
  onComplete,
  onClose,
  isOpen,
  contextual = false
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const [data, setData] = useState<OnboardingData>({
    careerStage: '',
    industryFocus: [],
    careerGoals: '',
    resumeFile: null,
    skills: [],
    preferredLearningStyle: '',
    timeAvailability: ''
  });

  const totalSteps = 5;

  useEffect(() => {
    setProgress(((step + 1) / totalSteps) * 100);
  }, [step]);

  if (!isOpen) return null;

  const updateData = (partialData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partialData }));
  };

  const handleNext = () => {
    // Validate current step
    if (step === 0) {
      // No validation needed for welcome step
      setStep(step + 1);
    } else if (step === 1) {
      if (!data.careerStage || data.industryFocus.length === 0 || !data.careerGoals) {
        toast({
          title: "Please complete all fields",
          description: "Career stage, industry focus, and goals are required",
          variant: "destructive"
        });
        return;
      }
      setStep(step + 1);
    } else if (step === 2) {
      if (data.skills.length === 0) {
        toast({
          title: "Please add at least one skill",
          description: "Add skills to help us personalize your experience",
          variant: "destructive" 
        });
        return;
      }
      setStep(step + 1);
    } else if (step === 3) {
      // Resume is optional but encouraged
      if (!data.resumeFile) {
        toast({
          title: "No resume uploaded",
          description: "You can proceed without a resume, but we recommend uploading one for best results",
          variant: "default"
        });
      }
      setStep(step + 1);
    } else if (step === 4) {
      if (!data.preferredLearningStyle || !data.timeAvailability) {
        toast({
          title: "Please complete all fields",
          description: "Learning style and time availability are required",
          variant: "destructive"
        });
        return;
      }
      // Submit data
      onComplete(data);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    if (step === 3) {
      // Skip resume upload
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardContent className="p-6">
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Step {step + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {step === 0 && (
            <WelcomeStep contextual={contextual} />
          )}

          {step === 1 && (
            <CareerGoalsStep 
              data={data} 
              updateData={updateData} 
            />
          )}

          {step === 2 && (
            <SkillsAssessmentStep 
              data={data} 
              updateData={updateData} 
            />
          )}

          {step === 3 && (
            <ResumeUploadStep 
              data={data} 
              updateData={updateData} 
            />
          )}

          {step === 4 && (
            <FinalStep 
              data={data} 
              updateData={updateData} 
            />
          )}

          <div className="flex justify-between mt-6">
            {step > 0 ? (
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ChevronLeft size={16} /> Back
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex items-center gap-2"
              >
                Cancel
              </Button>
            )}

            <div className="flex gap-2">
              {step === 3 && (
                <Button 
                  variant="ghost" 
                  onClick={handleSkip}
                >
                  Skip
                </Button>
              )}
              
              <Button 
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                {step === totalSteps - 1 ? (
                  <>
                    Complete <Check size={16} />
                  </>
                ) : (
                  <>
                    Next <ChevronRight size={16} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}