
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, TrendingUp, DollarSign, Award } from 'lucide-react';

interface CareerScenario {
  title: string;
  description: string;
  probabilityScore: number;
  salaryRange: string;
  timeToAchieve: string;
  requiredSkills: string[];
}

export const CareerSimulator = () => {
  const scenarios: CareerScenario[] = [
    {
      title: "Technical Lead",
      description: "Lead a team of developers while maintaining technical expertise",
      probabilityScore: 85,
      salaryRange: "$130,000 - $180,000",
      timeToAchieve: "2-3 years",
      requiredSkills: ["Leadership", "System Design", "Team Management"]
    },
    {
      title: "AI Specialist",
      description: "Focus on AI/ML implementation and architecture",
      probabilityScore: 75,
      salaryRange: "$150,000 - $200,000",
      timeToAchieve: "1-2 years",
      requiredSkills: ["Machine Learning", "Python", "Deep Learning"]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Career Path Simulator</h2>
        <Button variant="outline">Generate New Path</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenarios.map((scenario, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {scenario.title}
                <span className="text-sm font-normal text-muted-foreground">
                  {scenario.timeToAchieve}
                </span>
              </CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Success Probability</span>
                    <span className="text-sm font-medium">{scenario.probabilityScore}%</span>
                  </div>
                  <Progress value={scenario.probabilityScore} />
                </div>

                <div className="flex items-center text-sm">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span>{scenario.salaryRange}</span>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Required Skills:</div>
                  <div className="flex flex-wrap gap-2">
                    {scenario.requiredSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <Button className="w-full mt-4">
                  Explore This Path
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
