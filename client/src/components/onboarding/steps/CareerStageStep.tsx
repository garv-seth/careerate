import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, FileText, GraduationCap, Briefcase, Users, Trophy, Zap } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CareerStage } from '@/hooks/use-onboarding';

type CareerStageStepProps = {
  data: {
    careerStage?: CareerStage;
  };
  updateData: (data: Partial<{ careerStage: CareerStage }>) => void;
  onNext: () => void;
  onBack: () => void;
};

const careerStageOptions = [
  { 
    value: CareerStage.STUDENT, 
    label: 'Student or Recent Graduate', 
    description: 'Currently studying or recently graduated, seeking to start your professional career.',
    icon: <GraduationCap className="h-5 w-5" />
  },
  { 
    value: CareerStage.ENTRY_LEVEL, 
    label: 'Entry-Level Professional',
    description: 'New to the workforce with 0-2 years of professional experience.',
    icon: <FileText className="h-5 w-5" />
  },
  { 
    value: CareerStage.MID_LEVEL, 
    label: 'Mid-Level Professional',
    description: 'Established professional with 3-7 years of experience in your field.',
    icon: <Briefcase className="h-5 w-5" />
  },
  { 
    value: CareerStage.SENIOR_LEVEL, 
    label: 'Senior-Level Professional',
    description: 'Advanced professional with 8+ years of experience, may include people management.',
    icon: <Users className="h-5 w-5" />
  },
  { 
    value: CareerStage.EXECUTIVE, 
    label: 'Executive or Leadership',
    description: 'Director, VP, C-suite or equivalent leadership position.',
    icon: <Trophy className="h-5 w-5" />
  },
  { 
    value: CareerStage.CAREER_CHANGER, 
    label: 'Career Changer',
    description: 'Transitioning from one profession or industry to another.',
    icon: <Zap className="h-5 w-5" />
  },
];

export function CareerStageStep({ data, updateData, onNext, onBack }: CareerStageStepProps) {
  const [selectedStage, setSelectedStage] = useState<CareerStage | undefined>(data.careerStage);

  const handleSelection = (value: string) => {
    const stage = value as CareerStage;
    setSelectedStage(stage);
    updateData({ careerStage: stage });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Your Career Stage</h2>
        <p className="text-muted-foreground">
          Select the option that best describes your current career stage. This helps us personalize your career acceleration journey.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <RadioGroup 
            value={selectedStage} 
            onValueChange={handleSelection}
            className="space-y-3"
          >
            {careerStageOptions.map((option) => (
              <div key={option.value} className="flex items-start space-x-2">
                <RadioGroupItem 
                  value={option.value} 
                  id={option.value} 
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <div className="flex items-center">
                    <Label 
                      htmlFor={option.value} 
                      className="font-medium text-base flex items-center cursor-pointer"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary mr-2">
                        {option.icon}
                      </span>
                      {option.label}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-10">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!selectedStage}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}