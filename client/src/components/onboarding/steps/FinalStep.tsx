import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { OnboardingData } from '../OnboardingWizard';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

type FinalStepProps = {
  data: OnboardingData;
  onComplete: () => void;
  onBack: () => void;
};

const LEARNING_STYLES = [
  { id: 'visual', label: 'Visual (videos, diagrams, charts)' },
  { id: 'auditory', label: 'Auditory (podcasts, discussions, lectures)' },
  { id: 'reading', label: 'Reading/Writing (articles, books, notes)' },
  { id: 'kinesthetic', label: 'Kinesthetic (hands-on practice, exercises)' },
  { id: 'mixed', label: 'Mixed (combination of multiple styles)' },
];

const TIME_AVAILABILITY = [
  { id: 'minimal', label: 'Minimal (0-2 hours/week)' },
  { id: 'moderate', label: 'Moderate (3-5 hours/week)' },
  { id: 'significant', label: 'Significant (6-10 hours/week)' },
  { id: 'extensive', label: 'Extensive (10+ hours/week)' },
];

export function FinalStep({ data, onComplete, onBack }: FinalStepProps) {
  const [canProceed, setCanProceed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localData, setLocalData] = useState({
    preferredLearningStyle: data.preferredLearningStyle,
    timeAvailability: data.timeAvailability
  });

  useEffect(() => {
    const isValid = Boolean(localData.preferredLearningStyle && localData.timeAvailability);
    setCanProceed(isValid);
  }, [localData]);

  const handleLearningStyleChange = (value: string) => {
    setLocalData(prev => ({ ...prev, preferredLearningStyle: value }));
  };

  const handleTimeAvailabilityChange = (value: string) => {
    setLocalData(prev => ({ ...prev, timeAvailability: value }));
  };

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      // Update the learning preferences in the parent component
      // This doesn't need to be awaited as we're saving all the data at once
      
      // Simulate a delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Learning Preferences</h2>
        <p className="text-muted-foreground">
          Help us tailor your learning experience to your personal preferences.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preferred Learning Style</h3>
              <p className="text-sm text-muted-foreground">
                How do you prefer to consume educational content?
              </p>
              <RadioGroup
                value={localData.preferredLearningStyle}
                onValueChange={handleLearningStyleChange}
                className="grid grid-cols-1 gap-3"
              >
                {LEARNING_STYLES.map(style => (
                  <div key={style.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={style.id} id={`style-${style.id}`} />
                    <Label htmlFor={`style-${style.id}`}>{style.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Time Availability</h3>
              <p className="text-sm text-muted-foreground">
                How much time can you dedicate to career development activities each week?
              </p>
              <RadioGroup
                value={localData.timeAvailability}
                onValueChange={handleTimeAvailabilityChange}
                className="grid grid-cols-1 gap-3"
              >
                {TIME_AVAILABILITY.map(time => (
                  <div key={time.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={time.id} id={`time-${time.id}`} />
                    <Label htmlFor={`time-${time.id}`}>{time.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/50 rounded-md p-4">
        <h3 className="font-medium mb-2">Ready to accelerate your career?</h3>
        <p className="text-sm text-muted-foreground">
          Once you complete this step, our AI agents will analyze your profile, skills, and resume to generate personalized career insights and learning recommendations.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button 
          onClick={handleComplete} 
          disabled={!canProceed || isSubmitting} 
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check size={16} />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </div>
  );
}