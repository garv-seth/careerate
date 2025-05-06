import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { LightbulbIcon, Sparkles, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LearningRecommendation {
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  duration: string;
  url?: string;
}

interface LearningRecommendationsProps {
  recommendations?: LearningRecommendation[];
  className?: string;
}

const defaultRecommendations: LearningRecommendation[] = [
  {
    title: 'Machine Learning Fundamentals',
    description: 'Build a strong foundation in ML concepts and techniques',
    impact: 'High',
    duration: '4 week course'
  },
  {
    title: 'Advanced Communication Skills',
    description: 'Enhance your ability to convey complex ideas effectively',
    impact: 'Medium',
    duration: '2 week course'
  }
];

export function LearningRecommendations({ 
  recommendations = defaultRecommendations,
  className 
}: LearningRecommendationsProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Learning Recommendations</h3>
        <Button variant="ghost" size="sm" className="text-primary">
          View All
        </Button>
      </div>
      
      <div className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <Card key={index} className="bg-muted/50 hover:bg-muted/80 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-full shrink-0",
                  recommendation.impact === 'High' && "bg-primary/10",
                  recommendation.impact === 'Medium' && "bg-yellow-100",
                  recommendation.impact === 'Low' && "bg-green-100"
                )}>
                  {recommendation.impact === 'High' ? (
                    <Sparkles className="h-5 w-5 text-primary" />
                  ) : (
                    <LightbulbIcon className={cn(
                      "h-5 w-5",
                      recommendation.impact === 'Medium' && "text-yellow-600",
                      recommendation.impact === 'Low' && "text-green-600"
                    )} />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-base">{recommendation.title}</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{recommendation.description}</p>
                  <div className="flex items-center mt-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      recommendation.impact === 'High' && "bg-primary/10 text-primary",
                      recommendation.impact === 'Medium' && "bg-yellow-100 text-yellow-800",
                      recommendation.impact === 'Low' && "bg-green-100 text-green-800"
                    )}>
                      {recommendation.impact} Impact
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">•</span>
                    <span className="text-xs text-muted-foreground ml-2">{recommendation.duration}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default LearningRecommendations;