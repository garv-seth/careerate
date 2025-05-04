import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { OnboardingData } from '../OnboardingWizard';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

type CareerGoalsStepProps = {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
};

const CAREER_STAGES = [
  { id: 'early', label: 'Early Career (0-3 years)' },
  { id: 'mid', label: 'Mid Career (4-10 years)' },
  { id: 'senior', label: 'Senior (10+ years)' },
  { id: 'executive', label: 'Executive/Leadership' },
  { id: 'career-change', label: 'Career Transition' },
];

const INDUSTRIES = [
  { id: 'technology', label: 'Technology' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'finance', label: 'Finance/Banking' },
  { id: 'education', label: 'Education' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'retail', label: 'Retail/E-commerce' },
  { id: 'media', label: 'Media/Entertainment' },
  { id: 'government', label: 'Government/Public Sector' },
  { id: 'nonprofit', label: 'Nonprofit' },
  { id: 'consulting', label: 'Consulting' },
];

export function CareerGoalsStep({ data, updateData, onNext, onBack }: CareerGoalsStepProps) {
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    // Validate required fields
    const isValid = Boolean(data.careerStage) && data.industryFocus.length > 0;
    setCanProceed(isValid);
  }, [data.careerStage, data.industryFocus]);

  const handleCareerStageChange = (value: string) => {
    updateData({ careerStage: value });
  };

  const handleIndustryChange = (industryId: string, checked: boolean) => {
    if (checked) {
      updateData({ industryFocus: [...data.industryFocus, industryId] });
    } else {
      updateData({
        industryFocus: data.industryFocus.filter(industry => industry !== industryId),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Your Career Profile</h2>
        <p className="text-muted-foreground">
          Help us understand where you are in your career journey.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Career Stage</h3>
              <RadioGroup
                value={data.careerStage}
                onValueChange={handleCareerStageChange}
                className="grid grid-cols-1 gap-3 md:grid-cols-2"
              >
                {CAREER_STAGES.map(stage => (
                  <div key={stage.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={stage.id} id={`stage-${stage.id}`} />
                    <Label htmlFor={`stage-${stage.id}`}>{stage.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Industry Focus</h3>
              <p className="text-sm text-muted-foreground">
                Select all industries you're interested in.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {INDUSTRIES.map(industry => (
                  <div key={industry.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`industry-${industry.id}`}
                      checked={data.industryFocus.includes(industry.id)}
                      onCheckedChange={(checked) => 
                        handleIndustryChange(industry.id, checked === true)
                      }
                    />
                    <Label htmlFor={`industry-${industry.id}`}>{industry.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Career Goals</h3>
              <p className="text-sm text-muted-foreground">
                Describe your short and long-term career goals.
              </p>
              <Textarea
                placeholder="E.g., I want to advance to a senior role in the next 2 years, ultimately becoming a technical lead..."
                className="min-h-[120px]"
                value={data.careerGoals}
                onChange={e => updateData({ careerGoals: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          Next
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}