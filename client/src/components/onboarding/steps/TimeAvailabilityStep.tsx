import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Clock, CheckCircle, Hourglass } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { agentColors } from '@/components/avatars/AgentAvatars';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimeAvailability } from '@/hooks/use-onboarding';

type TimeAvailabilityStepProps = {
  data: {
    timeAvailability?: TimeAvailability;
  };
  updateData: (data: Partial<{ timeAvailability: TimeAvailability }>) => void;
  onNext: () => void;
  onBack: () => void;
};

const timeOptions = [
  { 
    value: TimeAvailability.MINIMAL, 
    label: 'Minimal',
    description: 'Less than 2 hours per week for career development activities.',
    hours: '< 2 hours/week',
    icon: <Hourglass className="h-5 w-5" />
  },
  { 
    value: TimeAvailability.LIMITED, 
    label: 'Limited',
    description: '2-5 hours per week, typically a few short sessions.',
    hours: '2-5 hours/week',
    icon: <Hourglass className="h-5 w-5" />
  },
  { 
    value: TimeAvailability.MODERATE, 
    label: 'Moderate',
    description: '5-10 hours per week, allowing for deeper learning.',
    hours: '5-10 hours/week',
    icon: <Hourglass className="h-5 w-5" />
  },
  { 
    value: TimeAvailability.SUBSTANTIAL, 
    label: 'Substantial',
    description: '10-15 hours per week, serious commitment to skill development.',
    hours: '10-15 hours/week',
    icon: <Hourglass className="h-5 w-5" />
  },
  { 
    value: TimeAvailability.EXTENSIVE, 
    label: 'Extensive',
    description: '15+ hours per week, similar to a part-time educational program.',
    hours: '15+ hours/week',
    icon: <Hourglass className="h-5 w-5" />
  }
];

export function TimeAvailabilityStep({ data, updateData, onNext, onBack }: TimeAvailabilityStepProps) {
  const [selectedTime, setSelectedTime] = useState<TimeAvailability | undefined>(data.timeAvailability);
  const sophiaColors = agentColors.sophia;
  
  const handleSelection = (value: string) => {
    const time = value as TimeAvailability;
    setSelectedTime(time);
    updateData({ timeAvailability: time });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Time Availability</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`${sophiaColors.border} ${sophiaColors.text} hover:${sophiaColors.bg} hover:text-white transition-colors cursor-help`}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Sophia
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">
                  Sophia, our Learning AI, uses your time availability to create realistic learning plans you can complete.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-muted-foreground">
          How much time can you dedicate to career development activities each week?
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <RadioGroup 
            value={selectedTime} 
            onValueChange={handleSelection}
            className="space-y-3"
          >
            {timeOptions.map((option) => (
              <div 
                key={option.value} 
                className={`flex items-start space-x-2 p-3 rounded-md transition-colors ${
                  selectedTime === option.value ? 'bg-primary/10' : 'hover:bg-muted'
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
                      <span className="mr-2">
                        {option.label}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {option.hours}
                      </Badge>
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
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
        <Button onClick={onNext} disabled={!selectedTime}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}