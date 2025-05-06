import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Target, Brain } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { agentColors } from '@/components/avatars/AgentAvatars';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CareerGoalsStepProps = {
  data: {
    careerGoals?: string;
  };
  updateData: (data: Partial<{ careerGoals: string }>) => void;
  onNext: () => void;
  onBack: () => void;
};

// Example prompts to help users articulate their goals
const GOAL_PROMPTS = [
  "I want to transition from development to leadership in the next 2 years.",
  "My goal is to become an expert in cloud architecture and lead major infrastructure projects.",
  "I aim to pivot from marketing to product management while leveraging my existing skills.",
  "I want to develop AI expertise to complement my current role in data analysis.",
  "My objective is to prepare for a C-level position in the next 5 years."
];

export function CareerGoalsStep({ data, updateData, onNext, onBack }: CareerGoalsStepProps) {
  const [goals, setGoals] = useState(data.careerGoals || '');
  const caraColors = agentColors.cara;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGoals(e.target.value);
    updateData({ careerGoals: e.target.value });
  };

  const usePrompt = (prompt: string) => {
    setGoals(prompt);
    updateData({ careerGoals: prompt });
  };

  const isValid = goals.trim().length >= 10; // Require at least 10 characters

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Career Goals</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`${caraColors.border} ${caraColors.text} hover:${caraColors.bg} hover:text-white transition-colors cursor-help`}
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Cara
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">
                  Cara, our Career Coach AI, uses your career goals to create personalized development plans.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-muted-foreground">
          Describe your career aspirations and objectives. This will help us tailor recommendations to your specific goals.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="career-goals" className="text-base font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Your career goals and aspirations
            </Label>
            <Textarea
              id="career-goals"
              placeholder="Describe what you hope to achieve in your career journey..."
              value={goals}
              onChange={handleChange}
              className="min-h-[150px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Need inspiration? Click an example below:</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_PROMPTS.map((prompt, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => usePrompt(prompt)}
                >
                  {prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}