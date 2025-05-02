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
import { Wifi, WifiOff, Send, Info, Upload, FileText, AlertTriangle, Brain, CloudUpload, BarChart2, BookOpen, ChevronRight } from 'lucide-react';

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
          activity.action.includes('Analysis complete'));
      
      if (isComplete && !analysisComplete) {
        setAnalysisComplete(true);
        setActiveTab('results');
        
        // Check for career advice in activity data
        const completeActivity = agentActivities.find(activity => 
          activity.agent === 'cara' && 
          activity.action.includes('Analysis complete'));
          
        if (completeActivity && (completeActivity as any).careerAdvice) {
          setCareerAdvice((completeActivity as any).careerAdvice);
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
  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResumeFile(e.target.files[0]);
    }
  };
  
  // Handle file upload
  const uploadResumeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/resume/upload", formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume is being analyzed by our AI.",
      });
      
      // Start analysis via socket connection
      if (connected && data.profile && data.profile.resumeText) {
        setAnalyzing(true);
        setAnalysisComplete(false);
        startAnalysis(data.profile.resumeText);
        setResumeText(data.profile.resumeText);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to upload resume",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleResumeUpload = async () => {
    if (!resumeFile) {
      toast({
        title: "No file selected",
        description: "Please select a resume file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("resume", resumeFile);
    
    setUploading(true);
    try {
      await uploadResumeMutation.mutateAsync(formData);
    } finally {
      setUploading(false);
      setResumeFile(null);
    }
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
  
  // Component for risk analysis tab
  const RiskAnalysisTab = ({ careerAdvice }: { careerAdvice?: CareerAdvice | null }) => {
    if (!careerAdvice) return <div className="p-4 text-center text-muted-foreground">No analysis data available yet</div>;
    
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 bg-background/50 p-4 rounded-lg border">
          <h3 className="text-lg font-medium">Overall Automation Risk</h3>
          <div className="flex items-center gap-3">
            <Progress value={careerAdvice.riskReport.overallRisk * 100} className="h-3" />
            <span className="text-sm font-semibold">{Math.round(careerAdvice.riskReport.overallRisk * 100)}%</span>
          </div>
          <p className="text-sm mt-2 text-muted-foreground">
            {careerAdvice.riskReport.summary}
          </p>
        </div>
        
        <div className="grid gap-4 mt-6">
          <h3 className="text-lg font-medium">Risk Categories</h3>
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
    );
  };
  
  // Component for skill gaps tab
  const SkillGapsTab = ({ careerAdvice }: { careerAdvice?: CareerAdvice | null }) => {
    if (!careerAdvice) return <div className="p-4 text-center text-muted-foreground">No analysis data available yet</div>;
    
    return (
      <div className="space-y-4">
        <div className="bg-background/50 p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">Skills Gap Analysis</h3>
          {careerAdvice.learningPlan.skills.map((skill, i) => (
            <div key={i} className="mb-6">
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
              
              <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div 
                  className="absolute left-0 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
                  style={{ width: `${(skill.currentLevel / 10) * 100}%` }}
                ></div>
                <div
                  className="absolute right-0 h-2 bg-primary/60 rounded-r-full"
                  style={{ width: `${((skill.targetLevel - skill.currentLevel) / 10) * 100}%`, 
                           left: `${(skill.currentLevel / 10) * 100}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                Current proficiency vs. recommended level
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  };
  
  // Component for roadmap tab
  const RoadmapTab = ({ careerAdvice }: { careerAdvice?: CareerAdvice | null }) => {
    if (!careerAdvice) return <div className="p-4 text-center text-muted-foreground">No analysis data available yet</div>;
    
    return (
      <div className="space-y-4">
        <div className="bg-background/50 p-4 rounded-lg border">
          <h3 className="text-lg font-medium">Learning Resources</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Estimated time to complete: {careerAdvice.learningPlan.timeEstimate}
          </p>
          
          <div className="grid gap-4">
            {careerAdvice.learningPlan.resources.map((resource, i) => (
              <div key={i} className="p-3 rounded-lg border">
                <div className="flex justify-between">
                  <h4 className="font-medium">{resource.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    resource.level === "Beginner" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" :
                    resource.level === "Intermediate" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" :
                    "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                  }`}>
                    {resource.level}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{resource.type}</span>
                  <span>•</span>
                  <span>{resource.provider}</span>
                  <span>•</span>
                  <span>{resource.duration}</span>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {resource.skillsAddressed.map((skill, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
                
                <a 
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  View resource
                  <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-background/50 p-4 rounded-lg border mt-6">
          <h3 className="text-lg font-medium mb-3">Action Plan</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-medium flex items-center gap-1.5 mb-2">
                <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                Immediate Actions
              </h4>
              <ul className="space-y-1 text-sm pl-6 list-disc">
                {careerAdvice.nextSteps.immediate.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium flex items-center gap-1.5 mb-2">
                <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                Short-term Goals
              </h4>
              <ul className="space-y-1 text-sm pl-6 list-disc">
                {careerAdvice.nextSteps.shortTerm.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium flex items-center gap-1.5 mb-2">
                <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
                Long-term Strategy
              </h4>
              <ul className="space-y-1 text-sm pl-6 list-disc">
                {careerAdvice.nextSteps.longTerm.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
      <TubelightNavbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
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
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full mb-6 grid grid-cols-2 lg:grid-cols-3">
              <TabsTrigger value="upload">Resume Upload</TabsTrigger>
              <TabsTrigger value="text">Text Input</TabsTrigger>
              <TabsTrigger value="results" className="hidden lg:inline-flex">Analysis Results</TabsTrigger>
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
                      {resumeFile ? resumeFile.name : "PDF, DOCX, or TXT (max 5MB)"}
                    </p>
                    <input
                      type="file"
                      id="resume"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleResumeChange}
                      disabled={analyzing || uploading}
                    />
                    <label htmlFor="resume">
                      <Button variant="outline" size="sm" className="cursor-pointer" asChild disabled={analyzing || uploading}>
                        <span>Select File</span>
                      </Button>
                    </label>
                  </div>
                  
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-3 w-3" />
                      <span>Your resume will be analyzed by our AI agent team</span>
                    </div>
                    
                    <Button 
                      size="lg"
                      variant="default"
                      onClick={handleResumeUpload} 
                      disabled={!resumeFile || !connected || analyzing || uploading}
                      className="w-full sm:w-auto"
                    >
                      {uploading || analyzing ? (
                        <>
                          <span className="animate-pulse">{uploading ? "Uploading..." : "Analyzing..."}</span>
                          <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        </>
                      ) : (
                        <>
                          Upload & Analyze
                          <Upload className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="text">
              <Card className="overflow-hidden border-2 border-primary/10">
                <CardHeader className="bg-primary/5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Resume Text Input</CardTitle>
                      <CardDescription>
                        Paste your resume text below to get insights from our AI agent system
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
                  
                  <Textarea
                    placeholder="Paste your resume text here or enter a sample job description to analyze..."
                    className="min-h-[200px] resize-none font-mono text-sm"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    disabled={analyzing}
                  />
                  
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-3 w-3" />
                      <span>Your resume is analyzed by Cara, Maya, Ellie, and Sophia agents</span>
                    </div>
                    
                    <Button 
                      size="lg"
                      variant="default"
                      onClick={handleStartAnalysis} 
                      disabled={!resumeText.trim() || !connected || analyzing}
                      className="w-full sm:w-auto"
                    >
                      {analyzing ? (
                        <>
                          <span className="animate-pulse">Analyzing...</span>
                          <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        </>
                      ) : (
                        <>
                          Start Analysis
                          <Upload className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                  ) : (
                    <Tabs defaultValue="risk" className="w-full">
                      <TabsList className="w-full grid grid-cols-3 mb-6">
                        <TabsTrigger value="risk">
                          <BarChart2 className="h-4 w-4 mr-1.5 inline-block" />
                          <span className="hidden sm:inline-block">Risk Analysis</span>
                          <span className="inline-block sm:hidden">Risk</span>
                        </TabsTrigger>
                        <TabsTrigger value="skills">
                          <Brain className="h-4 w-4 mr-1.5 inline-block" />
                          <span className="hidden sm:inline-block">Skill Gaps</span>
                          <span className="inline-block sm:hidden">Skills</span>
                        </TabsTrigger>
                        <TabsTrigger value="roadmap">
                          <BookOpen className="h-4 w-4 mr-1.5 inline-block" />
                          <span className="hidden sm:inline-block">Learning Roadmap</span>
                          <span className="inline-block sm:hidden">Roadmap</span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="risk">
                        <RiskAnalysisTab careerAdvice={careerAdvice} />
                      </TabsContent>
                      
                      <TabsContent value="skills">
                        <SkillGapsTab careerAdvice={careerAdvice} />
                      </TabsContent>
                      
                      <TabsContent value="roadmap">
                        <RoadmapTab careerAdvice={careerAdvice} />
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Agent Status Dashboard</CardTitle>
                    <CardDescription>
                      Live monitoring of all AI agent processes
                    </CardDescription>
                  </div>
                  {/* Status indicator */}
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                    analyzing 
                      ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' 
                      : 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}>
                    {analyzing ? (
                      <>
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Analysis in progress</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 rounded-full bg-slate-400" />
                        <span>Ready</span>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AgentStatusPanel 
                  uploadState={analyzing ? 'processing' : 'idle'}
                  agentStatuses={agentStatuses}
                  recentActivities={agentActivities}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Real-time Agent Activities</CardTitle>
                    <CardDescription>
                      Watch AI agents working on your resume in real-time
                    </CardDescription>
                  </div>
                  <div className="text-xs text-muted-foreground bg-background/80 rounded-md px-2 py-1">
                    {agentActivities.length} activities logged
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AgentActivityPanel 
                  activities={agentActivities}
                  agentStatuses={agentStatuses}
                  className="max-h-[350px] overflow-y-auto px-1"
                />
              </CardContent>
            </Card>
          </div>
          
          <Separator className="my-8" />
          
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center">
              <Brain className="h-6 w-6 mr-2 text-primary" />
              Meet Our AI Agent Team
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Our intelligent agents work together to analyze your career data and provide personalized insights,
              each with their own specialized role in the process
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AgentInfoCard agent="cara" />
            <AgentInfoCard agent="maya" />
            <AgentInfoCard agent="ellie" />
            <AgentInfoCard agent="sophia" />
          </div>
        </div>
      </main>
      
      <Footer2 />
    </div>
  );
};

export default AgentTestPage;