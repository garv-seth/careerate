import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Eye, Headphones, BookOpen, MousePointer, LightbulbIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { agentColors } from '@/components/avatars/AgentAvatars';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LearningStyle } from '@/hooks/use-onboarding';

type LearningPreferencesStepProps = {
  data: {
    preferredLearningStyle?: LearningStyle;
  };
  updateData: (data: Partial<{ preferredLearningStyle: LearningStyle }>) => void;
  onNext: () => void;
  onBack: () => void;
};

const learningStyleOptions = [
  { 
    value: LearningStyle.VISUAL, 
    label: 'Visual',
    description: 'You learn best from videos, diagrams, charts, and other visual content.',
    icon: <Eye className="h-5 w-5" />
  },
  { 
    value: LearningStyle.AUDIO, 
    label: 'Auditory',
    description: 'You prefer learning through podcasts, discussions, lectures, and audio content.',
    icon: <Headphones className="h-5 w-5" />
  },
  { 
    value: LearningStyle.READING, 
    label: 'Reading/Writing',
    description: 'You learn best by reading text-based materials and taking notes.',
    icon: <BookOpen className="h-5 w-5" />
  },
  { 
    value: LearningStyle.PRACTICAL, 
    label: 'Practical',
    description: 'You prefer hands-on experiences, exercises, and practical applications.',
    icon: <MousePointer className="h-5 w-5" />
  },
  { 
    value: LearningStyle.INTERACTIVE, 
    label: 'Interactive',
    description: 'You learn best through interactive tutorials, discussions, and group work.',
    icon: <LightbulbIcon className="h-5 w-5" />
  }
];

export function LearningPreferencesStep({ data, updateData, onNext, onBack }: LearningPreferencesStepProps) {
  const [selectedStyle, setSelectedStyle] = useState<LearningStyle | undefined>(data.preferredLearningStyle);
  const sophiaColors = agentColors.sophia;

  const handleSelection = (value: string) => {
    const style = value as LearningStyle;
    setSelectedStyle(style);
    updateData({ preferredLearningStyle: style });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Learning Preferences</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`${sophiaColors.border} ${sophiaColors.text} hover:${sophiaColors.bg} hover:text-white transition-colors cursor-help`}
                >
                  <LightbulbIcon className="w-3 h-3 mr-1" />
                  Sophia
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">
                  Sophia, our Learning AI, uses your learning style preferences to customize your skill development resources.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-muted-foreground">
          How do you prefer to learn new information? This helps us tailor learning resources to your style.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <RadioGroup 
            value={selectedStyle} 
            onValueChange={handleSelection}
            className="space-y-4"
          >
            {learningStyleOptions.map((option) => (
              <div 
                key={option.value} 
                className={`flex items-start space-x-2 p-3 rounded-md transition-colors ${
                  selectedStyle === option.value ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
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
        <Button onClick={onNext} disabled={!selectedStyle}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}