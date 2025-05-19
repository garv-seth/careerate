import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import AgentStatusPanel from '@/components/dashboard/AgentStatusPanel';
import { AgentActivityPanel, AgentInfoCard } from '@/components/dashboard/AgentActivityPanel';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import Footer2 from '@/components/ui/footer2';
import PageBackground from '@/components/ui/page-background';
import { Wifi, WifiOff, Send, Info, Upload, FileText, AlertTriangle, Brain, CloudUpload, BarChart2, BookOpen, ChevronRight, ExternalLink, Clock, BookMarked, ArrowRight } from 'lucide-react';
import PageWrapper from '@/components/ui/page-wrapper';

// Career advice interface
interface RiskCategory {
  category: string;
  risk: number;
  description: string;
}

interface SkillGap {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  importance: number;
}

interface LearningResource {
  id: string;
  title: string;
  type: string;
  provider: string;
  duration: string;
  level: string;
  url: string;
  skillsAddressed: string[];
}

interface CareerAdvice {
  riskReport: {
    overallRisk: number;
    categories: RiskCategory[];
    summary: string;
  };
  learningPlan: {
    skills: SkillGap[];
    resources: LearningResource[];
    timeEstimate: string;
  };
  nextSteps: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

const AgentTestPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { connected, agentStatuses, agentActivities, startAnalysis, error } = useAgentSocket();

  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [careerAdvice, setCareerAdvice] = useState<CareerAdvice | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Listen for analysis completion
  useEffect(() => {
    const checkForCompletion = () => {
      // Check if Cara's status is 'complete' and we have analysis_complete activity
      const isComplete = 
        agentStatuses.cara === 'complete' &&
        agentActivities.some(activity => 
          activity.agent === 'cara' && 
          (activity.action.includes('Analysis complete') || activity.action.includes('Analysis completed')));

      if (isComplete && !analysisComplete) {
        setAnalysisComplete(true);
        setActiveTab('results');

        // Check for career advice in activity data
        const completeActivity = agentActivities.find(activity => 
          activity.agent === 'cara' && 
          ((activity.action.includes('Analysis complete') || activity.action.includes('Analysis completed')) && 
          (activity as any).careerAdvice));

        if (completeActivity && (completeActivity as any).careerAdvice) {
          console.log('Career advice found:', (completeActivity as any).careerAdvice);
          setCareerAdvice((completeActivity as any).careerAdvice);
        } else {
          console.warn('Analysis complete but no career advice found in activities:', 
            agentActivities.filter(a => a.agent === 'cara').map(a => ({action: a.action, hasAdvice: !!(a as any).careerAdvice})));
        }
      }
    };

    checkForCompletion();
  }, [agentStatuses, agentActivities, analysisComplete]);

  // Handle direct text analysis
  const handleStartAnalysis = () => {
    if (!resumeText.trim()) {
      toast({
        title: "No resume text",
        description: "Please enter some resume text to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!connected) {
      toast({
        title: "Not connected",
        description: "Cannot connect to agent service. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    setAnalysisComplete(false);
    startAnalysis(resumeText);

    toast({
      title: "Analysis started",
      description: "AI agents are now analyzing your resume.",
    });
  };

  // Handle resume file change
  // Navigate to profile page for resume upload
  const navigateToProfileForResume = () => {
    // Use window location to navigate to profile page
    window.location.href = '/profile';
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-primary-600 border-opacity-50"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  return (
    <PageBackground className="min-h-screen flex flex-col">
      <TubelightNavbar />
      <PageWrapper>
        <main className="flex-grow container mx-auto px-4 pb-20">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center">
                  <Brain className="h-8 w-8 mr-2 text-primary" />
                  AI Career Agents
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Our intelligent agent system analyzes your resume and provides personalized career insights
                </p>
              </div>
              <div className="flex items-center space-x-2 self-start md:self-center">
                {connected ? (
                  <div className="flex items-center text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 py-1 px-3 rounded-full">
                    <Wifi className="h-4 w-4 mr-2" />
                    <span>Connected to agent system</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 py-1 px-3 rounded-full">
                    <WifiOff className="h-4 w-4 mr-2" />
                    <span>Agents unavailable</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-8">
              <AgentStatusPanel 
                agentStatuses={agentStatuses} 
                uploadState={analyzing ? 'processing' : (uploading ? 'uploading' : 'idle')} 
                recentActivities={agentActivities.slice(0, 4)} 
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full mb-6 grid grid-cols-2">
                <TabsTrigger value="upload">Resume Upload</TabsTrigger>
                <TabsTrigger value="results">Analysis Results</TabsTrigger>
              </TabsList>

              <TabsContent value="upload">
                <Card className="overflow-hidden border-2 border-primary/10">
                  <CardHeader className="bg-primary/5">
                    <div className="flex items-center gap-2">
                      <CloudUpload className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>Resume Upload</CardTitle>
                        <CardDescription>
                          Upload your resume file to get insights from our AI agent system
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800 dark:text-red-300">Analysis Error</p>
                          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 mb-4">
                      <CloudUpload className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Upload your resume via the Profile page
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Resume uploads are only available through your profile page
                      </p>
                      <Button 
                        variant="default" 
                        size="lg"
                        onClick={navigateToProfileForResume}
                        className="w-full sm:w-auto"
                      >
                        Go to Profile Page
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-4 flex items-center justify-center">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Info className="h-3 w-3" />
                        <span>Your resume will be analyzed by our AI agent team after upload</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-6">
                  <AgentActivityPanel 
                    activities={agentActivities} 
                    agentStatuses={agentStatuses} 
                  />
                </div>
              </TabsContent>

              <TabsContent value="results">
                <Card className="overflow-hidden border-2 border-primary/10">
                  <CardHeader className="bg-primary/5">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>Career Analysis Results</CardTitle>
                        <CardDescription>
                          Your personalized AI-generated career insights and recommendations
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {!analysisComplete ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4"></div>
                        <p className="text-lg font-medium">Analysis in progress...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Our AI agents are analyzing your resume. This may take a few minutes.
                        </p>
                      </div>
                    ) : !careerAdvice ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
                        <p className="text-lg font-medium">Analysis Complete But No Report Available</p>
                        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                          All agents have completed their work, but the career advice report is not available. 
                          This may happen if the analysis encountered issues. Please try uploading your resume again.
                        </p>
                        <Button variant="outline" className="mt-4" onClick={() => setActiveTab('upload')}>
                          Go Back to Upload
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Risk Analysis Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold flex items-center">
                            <BarChart2 className="h-5 w-5 mr-2 text-primary" />
                            Risk Analysis
                          </h3>
                          <div className="flex flex-col gap-2 bg-background/50 p-4 rounded-lg border">
                            <h4 className="text-lg font-medium">Overall Automation Risk</h4>
                            <div className="flex items-center gap-3">
                              <Progress value={careerAdvice.riskReport.overallRisk * 100} className="h-3" />
                              <span className="text-sm font-semibold">{Math.round(careerAdvice.riskReport.overallRisk * 100)}%</span>
                            </div>
                            <p className="text-sm mt-2 text-muted-foreground">
                              {careerAdvice.riskReport.summary}
                            </p>
                          </div>

                          <div className="grid gap-4 mt-4">
                            <h4 className="text-lg font-medium">Risk Categories</h4>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {careerAdvice.riskReport.categories.map((category, i) => (
                                <div key={i} className="p-4 rounded-lg border">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">{category.category}</span>
                                    <span className={`text-sm font-semibold px-2 py-1 rounded ${
                                      category.risk > 0.7 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                      category.risk > 0.4 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' :
                                      'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    }`}>
                                      {Math.round(category.risk * 100)}%
                                    </span>
                                  </div>
                                  <Progress 
                                    value={category.risk * 100} 
                                    className={`h-2 mb-2 ${
                                      category.risk > 0.7 ? 'bg-red-200 dark:bg-red-900/50' :
                                      category.risk > 0.4 ? 'bg-amber-200 dark:bg-amber-900/50' :
                                      'bg-green-200 dark:bg-green-900/50'
                                    }`} 
                                  />
                                  <p className="text-sm text-muted-foreground">{category.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Skills Gap Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold flex items-center">
                            <Brain className="h-5 w-5 mr-2 text-primary" />
                            Skill Gaps Analysis
                          </h3>
                          <div className="bg-background/50 p-4 rounded-lg border">
                            <div className="grid gap-6 sm:grid-cols-2">
                              {careerAdvice.learningPlan.skills.map((skill, i) => (
                                <div key={i} className="mb-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center">
                                      <span className="font-medium">{skill.skill}</span>
                                      {skill.importance > 0.8 && (
                                        <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                          High Value
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      Level {skill.currentLevel} → {skill.targetLevel}
                                    </span>
                                  </div>

                                  <div className="mt-1 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                                    <div className="h-full bg-primary/30 rounded-full" style={{ 
                                      width: `${(skill.targetLevel / 10) * 100}%` 
                                    }}></div>
                                    <div 
                                      className="relative h-4 w-4 -mt-3 rounded-full bg-primary border-2 border-white dark:border-gray-800" 
                                      style={{ 
                                        left: `${(skill.currentLevel / 10) * 100}%` 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-6 p-3 bg-primary/5 rounded-lg flex items-center">
                              <BookOpen className="h-5 w-5 text-primary mr-2" />
                              <p className="text-sm">Estimated learning time: <span className="font-semibold">{careerAdvice.learningPlan.timeEstimate}</span></p>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Learning Resources Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold flex items-center">
                            <BookMarked className="h-5 w-5 mr-2 text-primary" />
                            Recommended Learning Resources
                          </h3>
                          <div className="bg-background/50 p-2 rounded-lg border">
                            <div className="grid gap-3">
                              {careerAdvice.learningPlan.resources.map((resource, i) => (
                                <div key={i} className="p-3 rounded-lg border">
                                  <h4 className="font-medium">{resource.title}</h4>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    resource.type === 'Course' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                    resource.type === 'Certification' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                    'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                                  }`}>
                                    {resource.type}
                                  </span>
                                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-2">
                                    <span>{resource.provider}</span>
                                    <span>•</span>
                                    <span>{resource.level}</span>
                                    <span>•</span>
                                    <span>{resource.duration}</span>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {resource.skillsAddressed.map((skill, j) => (
                                      <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="mt-3">
                                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Visit Resource
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Action Plan Section */}
                        <div className="space-y-4">
                          <h3 className="text-xl font-semibold flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-primary" />
                            Action Plan
                          </h3>
                          <div className="bg-background/50 rounded-lg border overflow-hidden">
                            <div className="grid sm:grid-cols-3">
                              <div className="p-4 border-b sm:border-b-0 sm:border-r">
                                <div className="flex items-center mb-3">
                                  <span className="text-lg font-medium mr-2">Immediate Steps</span>
                                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                                    Now
                                  </span>
                                </div>
                                <ul className="space-y-2">
                                  {careerAdvice.nextSteps.immediate.map((step, i) => (
                                    <li key={i} className="flex items-baseline text-sm">
                                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mr-1.5" />
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-4 border-b sm:border-b-0 sm:border-r">
                                <div className="flex items-center mb-3">
                                  <span className="text-lg font-medium mr-2">Short-term</span>
                                  <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
                                    1-3 months
                                  </span>
                                </div>
                                <ul className="space-y-2">
                                  {careerAdvice.nextSteps.shortTerm.map((step, i) => (
                                    <li key={i} className="flex items-baseline text-sm">
                                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mr-1.5" />
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-4">
                                <div className="flex items-center mb-3">
                                  <span className="text-lg font-medium mr-2">Long-term</span>
                                  <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                                    6-12 months
                                  </span>
                                </div>
                                <ul className="space-y-2">
                                  {careerAdvice.nextSteps.longTerm.map((step, i) => (
                                    <li key={i} className="flex items-baseline text-sm">
                                      <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mr-1.5" />
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <AgentInfoCard agent="cara" />
              <AgentInfoCard agent="maya" />
              <AgentInfoCard agent="ellie" />
              <AgentInfoCard agent="sophia" />
            </div>
          </div>
        </main>
      </PageWrapper>

      <Footer2 />
    </PageBackground>
  );
};

export default AgentTestPage;