import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight, TrendingUp, BarChart, Book, Clock, ArrowUpRight, DollarSign } from 'lucide-react';

interface SkillGap {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  learningTime: string;
}

interface MigrationStep {
  step: string;
  description: string;
  timeframe: string;
  resources: { title: string; type: string; url: string }[];
}

interface CareerPathData {
  sourceRole: string;
  targetRole: string;
  viabilityScore: number;
  skillsTransferability: number;
  timeToTransition: string;
  potentialSalaryImpact: number;
  requiredReskilling: SkillGap[];
  migrationSteps: MigrationStep[];
}

interface CareerMigrationProps {
  migrationData?: CareerPathData[];
  onStartMigration: (currentRole: string) => void;
  isLoading: boolean;
}

export function CareerMigration({ 
  migrationData, 
  onStartMigration, 
  isLoading 
}: CareerMigrationProps) {
  const [currentRole, setCurrentRole] = useState('');
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);
  
  const handleStartMigration = () => {
    if (currentRole) {
      onStartMigration(currentRole);
    }
  };

  const getViabilityColor = (score: number) => {
    if (score >= 70) return "bg-green-500 text-white";
    if (score >= 40) return "bg-yellow-500 text-white";
    return "bg-red-500 text-white";
  };

  const getViabilityLabel = (score: number) => {
    if (score >= 70) return "High Viability";
    if (score >= 40) return "Moderate Viability";
    return "Challenging Transition";
  };

  const getSalaryImpactColor = (impact: number) => {
    if (impact > 15) return "text-green-500";
    if (impact > 0) return "text-blue-500";
    return "text-red-500";
  };

  const formatSalaryImpact = (impact: number) => {
    if (impact > 0) return `+${impact}%`;
    return `${impact}%`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Career Migration Navigator™</h2>
      
      {!migrationData && !isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              Find Future-Safe Career Paths
            </CardTitle>
            <CardDescription>
              Discover optimal migration paths from your current role to AI-resistant positions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-role">Your Current Role</Label>
              <Input 
                id="current-role" 
                placeholder="e.g. Marketing Manager" 
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleStartMigration}
              disabled={!currentRole}
            >
              Generate Migration Paths
            </Button>
          </CardFooter>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Mapping Migration Pathways</CardTitle>
            <CardDescription>
              Analyzing thousands of career trajectories to find optimal transitions...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={65} className="h-2" />
            <div className="text-center text-sm text-gray-500">
              We're identifying paths with the highest viability and best long-term prospects
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Path Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {migrationData!.map((path, index) => (
              <Card 
                key={index} 
                className={`cursor-pointer transition-all ${index === selectedPathIndex ? 'ring-2 ring-primary' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                onClick={() => setSelectedPathIndex(index)}
              >
                <CardHeader className="pb-2">
                  <Badge className={getViabilityColor(path.viabilityScore)}>
                    {getViabilityLabel(path.viabilityScore)}
                  </Badge>
                  <CardTitle className="text-lg">{path.targetRole}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Transition time:</span>
                    <span className="font-medium">{path.timeToTransition}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Salary impact:</span>
                    <span className={`font-medium ${getSalaryImpactColor(path.potentialSalaryImpact)}`}>
                      {formatSalaryImpact(path.potentialSalaryImpact)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Path Details */}
          {migrationData && selectedPathIndex < migrationData.length && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{migrationData[selectedPathIndex].targetRole}</CardTitle>
                    <Badge className={getViabilityColor(migrationData[selectedPathIndex].viabilityScore)}>
                      {migrationData[selectedPathIndex].viabilityScore}% Viable
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    {migrationData[selectedPathIndex].sourceRole}
                    <ArrowRight className="h-3 w-3 mx-1" />
                    {migrationData[selectedPathIndex].targetRole}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span>Skills Transferability</span>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-3 w-full">
                        <div 
                          className="h-full rounded-full bg-primary" 
                          style={{ width: `${migrationData[selectedPathIndex].skillsTransferability}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {migrationData[selectedPathIndex].skillsTransferability}% of your current skills transfer
                      </p>
                    </div>
                    
                    <div className="space-y-2 flex flex-col">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Transition Timeline</span>
                      </div>
                      <span className="text-lg font-medium flex-grow flex items-center">
                        {migrationData[selectedPathIndex].timeToTransition}
                      </span>
                    </div>
                    
                    <div className="space-y-2 flex flex-col">
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span>Salary Impact</span>
                      </div>
                      <span className={`text-lg font-medium flex-grow flex items-center ${getSalaryImpactColor(migrationData[selectedPathIndex].potentialSalaryImpact)}`}>
                        {formatSalaryImpact(migrationData[selectedPathIndex].potentialSalaryImpact)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Migration Details Tabs */}
              <Tabs defaultValue="skills">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="skills">Required Skills</TabsTrigger>
                  <TabsTrigger value="steps">Migration Steps</TabsTrigger>
                </TabsList>
                
                <TabsContent value="skills" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Book className="h-5 w-5 text-primary" />
                        Skills Gap Analysis
                      </CardTitle>
                      <CardDescription>
                        Skills you need to develop for this career transition
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {migrationData[selectedPathIndex].requiredReskilling.map((skill, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{skill.skill}</span>
                            <span className="text-sm text-gray-500">Est. learning time: {skill.learningTime}</span>
                          </div>
                          <div className="relative pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <span className="text-xs text-gray-500">Current: {skill.currentLevel}/10</span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Required: {skill.requiredLevel}/10</span>
                              </div>
                            </div>
                            <div className="flex h-2 overflow-hidden bg-gray-100 rounded-full">
                              <div 
                                style={{ width: `${skill.currentLevel * 10}%` }} 
                                className="bg-primary"
                              ></div>
                              <div 
                                style={{ width: `${(skill.requiredLevel - skill.currentLevel) * 10}%` }} 
                                className="bg-gray-300"
                              ></div>
                            </div>
                          </div>
                          <Separator className="my-2" />
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        Create Learning Plan
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="steps" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart className="h-5 w-5 text-primary" />
                        Detailed Transition Plan
                      </CardTitle>
                      <CardDescription>
                        Step-by-step guide to successfully transition careers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {migrationData[selectedPathIndex].migrationSteps.map((step, idx) => (
                        <div key={idx} className="space-y-3">
                          <Alert>
                            <AlertTitle className="flex items-center gap-2">
                              <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-sm font-medium">
                                {idx + 1}
                              </div>
                              <span>{step.step}</span>
                              <Badge variant="outline" className="ml-auto">
                                {step.timeframe}
                              </Badge>
                            </AlertTitle>
                            <AlertDescription className="mt-2">
                              {step.description}
                            </AlertDescription>
                          </Alert>
                          
                          {step.resources.length > 0 && (
                            <div className="pl-8 space-y-2">
                              <h4 className="text-sm font-medium text-gray-500">Recommended Resources:</h4>
                              <div className="space-y-2">
                                {step.resources.map((resource, resourceIdx) => (
                                  <div key={resourceIdx} className="flex items-center gap-2 text-sm">
                                    <Badge variant="secondary" className="text-xs">
                                      {resource.type}
                                    </Badge>
                                    <a 
                                      href={resource.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center"
                                    >
                                      {resource.title}
                                      <ArrowUpRight className="h-3 w-3 ml-1" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {idx < migrationData[selectedPathIndex].migrationSteps.length - 1 && (
                            <div className="flex justify-center">
                              <div className="h-8 border-l border-dashed border-gray-300"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">
                        Save Transition Plan
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  );
}