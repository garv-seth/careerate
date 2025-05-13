import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, BarChart } from "@/components/ui/custom-charts";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayCircle, ChevronsUpDown, TrendingUp, TrendingDown, DollarSign, Users, Layers, Code, Clock, Award, Building, Briefcase } from 'lucide-react';

interface SimulationTimepoint {
  yearIndex: number;
  role: string;
  salary: number;
  skills: { name: string; level: number }[];
  opportunities: { title: string; probability: number; description: string }[];
  challenges: { title: string; impact: number; description: string }[];
  industryEvents: { event: string; impact: 'positive' | 'negative' | 'neutral'; description: string }[];
}

interface SimulationData {
  id: number;
  title: string;
  startingRole: string;
  startingSalary: number;
  timeframeYears: number;
  industryContext: string;
  timepoints: SimulationTimepoint[];
}

interface CareerSimulationProps {
  simulationData?: SimulationData;
  onStartSimulation: (params: any) => void;
  isRunning: boolean;
  isPremium: boolean;
}

export function CareerSimulation({ 
  simulationData, 
  onStartSimulation, 
  isRunning,
  isPremium = true
}: CareerSimulationProps) {
  const [startingRole, setStartingRole] = useState('');
  const [startingSalary, setStartingSalary] = useState(80000);
  const [industry, setIndustry] = useState('');
  const [timeframe, setTimeframe] = useState('5');
  const [currentYear, setCurrentYear] = useState(0);
  
  const handleStartSimulation = () => {
    if (startingRole && industry) {
      onStartSimulation({
        startingRole,
        startingSalary,
        industry,
        timeframeYears: parseInt(timeframe)
      });
    }
  };

  const INDUSTRIES = [
    "Technology", "Healthcare", "Finance", "Education", "Manufacturing", 
    "Retail", "Media & Entertainment", "Real Estate", "Transportation"
  ];

  // Data transformations for charts
  const getSalaryData = () => {
    if (!simulationData) return [];
    return simulationData.timepoints.map((tp) => ({
      year: `Year ${tp.yearIndex}`,
      salary: tp.salary
    }));
  };

  const getSkillsData = () => {
    if (!simulationData || currentYear >= simulationData.timepoints.length) 
      return [];
    
    return simulationData.timepoints[currentYear].skills.map((skill) => ({
      skill: skill.name,
      level: skill.level
    }));
  };

  const getEventImpactIcon = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <ChevronsUpDown className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOpportunityProbabilityColor = (probability: number) => {
    if (probability >= 70) return "bg-green-100 text-green-800";
    if (probability >= 40) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const getChallengeImpactColor = (impact: number) => {
    if (impact >= 70) return "bg-red-100 text-red-800";
    if (impact >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Digital Career Twin™</h2>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Premium Feature</CardTitle>
            <CardDescription>
              Career Simulation is available exclusively for premium members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <PlayCircle className="h-16 w-16 text-primary opacity-50" />
              <h3 className="text-xl font-bold">Test Drive Your Career Future</h3>
              <p className="text-gray-500 max-w-md">
                Simulate different career paths with our proprietary AI engine. See how decisions today impact your career trajectory, salary growth, and skill development over time.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
              <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                <Clock className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium">5-10 Year Forecasts</h4>
                <p className="text-sm text-gray-500">See your long-term career evolution</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                <Code className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium">Skill Development</h4>
                <p className="text-sm text-gray-500">Track skill progression over time</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                <DollarSign className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium">Salary Projections</h4>
                <p className="text-sm text-gray-500">Forecast earning potential</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              Upgrade to Premium
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Digital Career Twin™</h2>
      
      {!simulationData && !isRunning ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Simulate Your Career Trajectory
            </CardTitle>
            <CardDescription>
              Test drive different career paths and see how they evolve over time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="starting-role">Starting Role</Label>
                  <Input 
                    id="starting-role" 
                    placeholder="e.g. Data Analyst" 
                    value={startingRole}
                    onChange={(e) => setStartingRole(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select 
                    value={industry} 
                    onValueChange={setIndustry}
                  >
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="starting-salary">Starting Annual Salary ($)</Label>
                  <Input 
                    id="starting-salary" 
                    type="number" 
                    value={startingSalary}
                    onChange={(e) => setStartingSalary(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="timeframe">Simulation Timeframe: {timeframe} years</Label>
                  </div>
                  <Slider
                    id="timeframe"
                    min={3}
                    max={10}
                    step={1}
                    value={[parseInt(timeframe)]}
                    onValueChange={(values) => setTimeframe(values[0].toString())}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>3 Years</span>
                    <span>10 Years</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleStartSimulation}
              disabled={!startingRole || !industry}
            >
              Run Career Simulation
            </Button>
          </CardFooter>
        </Card>
      ) : isRunning ? (
        <Card>
          <CardHeader>
            <CardTitle>Simulating Career Trajectory</CardTitle>
            <CardDescription>
              Our AI is generating your career digital twin and simulating possible futures...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-10">
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
            <div className="text-center text-sm text-gray-500 max-w-md mx-auto">
              This may take a few moments. We're running complex models that simulate industry changes, skill development curves, and salary progression based on market data.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Simulation Controls */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{simulationData!.title}</CardTitle>
                  <CardDescription>
                    {simulationData!.startingRole} in {simulationData!.industryContext} over {simulationData!.timeframeYears} years
                  </CardDescription>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  {simulationData!.timepoints.length} year simulation
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Timeline Position: Year {currentYear}</Label>
                  <Button variant="outline" size="sm" onClick={() => setCurrentYear(0)}>
                    Reset
                  </Button>
                </div>
                <Slider
                  min={0}
                  max={simulationData!.timepoints.length - 1}
                  step={1}
                  value={[currentYear]}
                  onValueChange={(values) => setCurrentYear(values[0])}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Start</span>
                  <span>+{simulationData!.timeframeYears} Years</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Current Year Details */}
          {currentYear < simulationData!.timepoints.length && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="md:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Career Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-sm text-gray-500">Current Role</span>
                    <h3 className="font-semibold text-lg">{simulationData!.timepoints[currentYear].role}</h3>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-sm text-gray-500">Annual Salary</span>
                    <h3 className="font-semibold text-lg">
                      ${simulationData!.timepoints[currentYear].salary.toLocaleString()}
                    </h3>
                    {currentYear > 0 && (
                      <Badge 
                        variant="outline" 
                        className={
                          simulationData!.timepoints[currentYear].salary > 
                          simulationData!.timepoints[currentYear-1].salary 
                            ? "text-green-600 bg-green-50" 
                            : "text-red-600 bg-red-50"
                        }
                      >
                        {
                          simulationData!.timepoints[currentYear].salary > 
                          simulationData!.timepoints[currentYear-1].salary 
                            ? "+" 
                            : ""
                        }
                        {(
                          ((simulationData!.timepoints[currentYear].salary - 
                          simulationData!.timepoints[currentYear-1].salary) /
                          simulationData!.timepoints[currentYear-1].salary) * 100
                        ).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-1">
                    <span className="text-sm text-gray-500">Year Progress</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{currentYear + 1}</Badge>
                      <span>of {simulationData!.timepoints.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Year {currentYear} Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="events">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="events">Key Events</TabsTrigger>
                      <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                      <TabsTrigger value="challenges">Challenges</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="events" className="mt-2">
                      <ScrollArea className="h-48">
                        <div className="space-y-2 p-1">
                          {simulationData!.timepoints[currentYear].industryEvents.map((event, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                              {getEventImpactIcon(event.impact)}
                              <div>
                                <p className="font-medium text-sm">{event.event}</p>
                                <p className="text-sm text-gray-500">{event.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="opportunities" className="mt-2">
                      <ScrollArea className="h-48">
                        <div className="space-y-2 p-1">
                          {simulationData!.timepoints[currentYear].opportunities.map((opp, idx) => (
                            <div key={idx} className="p-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                              <div className="flex justify-between items-start mb-1">
                                <p className="font-medium text-sm">{opp.title}</p>
                                <Badge className={getOpportunityProbabilityColor(opp.probability)}>
                                  {opp.probability}% Probability
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">{opp.description}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="challenges" className="mt-2">
                      <ScrollArea className="h-48">
                        <div className="space-y-2 p-1">
                          {simulationData!.timepoints[currentYear].challenges.map((challenge, idx) => (
                            <div key={idx} className="p-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                              <div className="flex justify-between items-start mb-1">
                                <p className="font-medium text-sm">{challenge.title}</p>
                                <Badge className={getChallengeImpactColor(challenge.impact)}>
                                  {challenge.impact}% Impact
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">{challenge.description}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Analytics Visualizations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Salary Progression
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <AreaChart 
                  data={getSalaryData()}
                  index="year"
                  categories={["salary"]}
                  colors={["primary"]}
                  valueFormatter={(value) => `$${value.toLocaleString()}`}
                  showLegend={false}
                  showYAxis={true}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Skills Development
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <BarChart 
                  data={getSkillsData()}
                  index="skill"
                  categories={["level"]}
                  colors={["primary"]}
                  valueFormatter={(value) => `${value}/10`}
                  showLegend={false}
                  layout="vertical"
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Actions */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Simulation Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Button>Save This Simulation</Button>
                <Button variant="outline">Run New Simulation</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}