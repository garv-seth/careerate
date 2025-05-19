import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAgentSocket } from "@/hooks/useAgentSocket";
import TubelightNavbar from "@/components/ui/tubelight-navbar";
import Footer2 from "@/components/ui/footer2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CloudUpload, Upload, BookOpen, BarChart2, AlertCircle, ChevronRight, Download, Wifi, WifiOff, Sparkles, ArrowUpRight, LightbulbIcon, Zap, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import AgentStatusPanel from "@/components/dashboard/AgentStatusPanel";
import { AgentActivityPanel } from "@/components/dashboard/AgentActivityPanel";
import { AgentActivity, AgentStatuses } from "@/components/avatars/types";

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

const Dashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Socket.IO connection for real-time agent updates
  const { 
    connected: socketConnected, 
    startAnalysis, 
    error: socketError 
  } = useAgentSocket();

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
  });

  // Fetch career advice
  const { data: careerAdvice, isLoading: adviceLoading } = useQuery<CareerAdvice>({
    queryKey: ["/api/advise"],
    enabled: isAuthenticated && !!profile?.resumeText,
  });

  // Handle resume upload
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

      // Start analysis via socket connection if connected
      if (socketConnected && data.profile && data.profile.resumeText) {
        // Start real-time agent analysis
        startAnalysis(data.profile.resumeText);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/advise"] });
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Failed to upload resume",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Show socket connection error
  useEffect(() => {
    if (socketError) {
      toast({
        title: "Connection Error",
        description: "Could not connect to agent monitoring service. Some features may be limited.",
        variant: "destructive",
      });
    }
  }, [socketError]);

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      toast({
        title: "No file selected",
        description: "Please select a resume file to upload.",
        variant: "destructive",
      });
      return;
    }

    console.log("Uploading file:", resumeFile.name, "Size:", resumeFile.size, "Type:", resumeFile.type);

    const formData = new FormData();
    formData.append("resume", resumeFile);

    // Log form data contents for debugging
    for (let [key, value] of formData.entries()) {
      console.log(`Form Data: ${key} = ${value instanceof File ? value.name : value}`);
    }

    setUploading(true);
    try {
      console.log("Starting upload mutation");
      const result = await uploadResumeMutation.mutateAsync(formData);
      console.log("Upload result:", result);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      setResumeFile(null);
    }
  };

  const generateRoadmapMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/roadmap/generate", null);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Roadmap generated successfully",
        description: "Your personalized career roadmap is ready.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/advise"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate roadmap",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  // No direct redirect needed here, the ProtectedRoute component will handle it

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
      <TubelightNavbar />

      <main className="flex-grow container mx-auto px-4 pb-20 mt-24">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-1/4">
            <ProfileSidebar 
              user={user} 
              profile={profile} 
              resumeFile={resumeFile} 
              onResumeChange={handleResumeChange}
              onResumeUpload={handleResumeUpload}
              uploading={uploading}
              generateRoadmap={generateRoadmapMutation.mutate}
              generatingRoadmap={generateRoadmapMutation.isPending}
            />
          </div>

          {/* Main Content */}
          <div className="w-full lg:w-3/4">
            {!profile?.resumeText ? (
              <GetStartedCard />
            ) : profileLoading || adviceLoading ? (
              <AnalyzingCard />
            ) : (
              <Tabs defaultValue="risk" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="risk">Automation Risk</TabsTrigger>
                  <TabsTrigger value="skills">Skill Gaps</TabsTrigger>
                  <TabsTrigger value="roadmap">Career Roadmap</TabsTrigger>
                  <TabsTrigger value="simulator" className="relative">
                    Career Simulator
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-primary text-[10px] font-bold text-white rounded-full">PRO</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="risk" className="mt-6">
                  <RiskAnalysisTab careerAdvice={careerAdvice} />
                </TabsContent>

                <TabsContent value="skills" className="mt-6">
                  <SkillGapsTab careerAdvice={careerAdvice} />
                </TabsContent>

                <TabsContent value="roadmap" className="mt-6">
                  <RoadmapTab careerAdvice={careerAdvice} />
                </TabsContent>
                <TabsContent value="simulator" className="mt-6">
                  {/* Career Simulator content will go here */}
                  <p>This is the career simulator.  This is a premium feature.</p>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>

      <Footer2 />
    </div>
  );
};

const LoadingState = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-primary-600 border-opacity-50"></div>
      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading...</p>
    </div>
  </div>
);

const ProfileSidebar = ({ 
  user, 
  profile, 
  resumeFile, 
  onResumeChange, 
  onResumeUpload,
  uploading,
  generateRoadmap,
  generatingRoadmap
}) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your career information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 mb-4">
          <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-medium">{user?.username || "User"}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || ""}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Resume</span>
            <span className={profile?.resumeText ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
              {profile?.resumeText ? "Uploaded" : "Not uploaded"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Last Analysis</span>
            <span>
              {profile?.lastScan 
                ? new Date(profile.lastScan).toLocaleDateString() 
                : "Never"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Upload Resume</CardTitle>
        <CardDescription>
          Upload your resume to get AI-powered career insights
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            onChange={onResumeChange}
          />
          <label htmlFor="resume">
            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
              <span>Select File</span>
            </Button>
          </label>
        </div>

        <Button 
          className="w-full" 
          disabled={!resumeFile || uploading}
          onClick={onResumeUpload}
        >
          {uploading ? "Uploading..." : "Scan Resume"}
          <Upload className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Career Tools</CardTitle>
        <CardDescription>
          Generate insights and plans
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          variant="outline" 
          className="w-full justify-between"
          disabled={!profile?.resumeText || generatingRoadmap}
          onClick={() => generateRoadmap()}
        >
          <span className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" />
            Generate Roadmap
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="outline" className="w-full justify-between" disabled={!profile?.resumeText}>
          <span className="flex items-center">
            <BarChart2 className="mr-2 h-4 w-4" />
            Market Analysis
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  </div>
);

const GetStartedCard = () => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="text-2xl">Welcome to Careerate!</CardTitle>
      <CardDescription>
        Let's get started with your AI-powered career acceleration journey
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="rounded-lg bg-primary-50 dark:bg-primary-900/20 p-6 border border-primary-100 dark:border-primary-900/50">
        <div className="flex items-start space-x-4">
          <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full">
            <CloudUpload className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-medium text-lg mb-2">Upload Your Resume</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start by uploading your resume. Our AI will analyze your skills, experience, and career trajectory.
            </p>
            <div className="flex items-center text-sm text-primary-600 dark:text-primary-400">
              <span>Upload from the sidebar to begin</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="font-medium text-lg mb-2">What You'll Get</h3>
        <ul className="space-y-3 mt-4">
          <li className="flex items-start">
            <div className="bg-red-100 dark:bg-red-900/20 p-1 rounded-full mr-3 mt-0.5">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">AI automation risk assessment for your role</span>
          </li>
          <li className="flex items-start">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 p-1 rounded-full mr-3 mt-0.5">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Skill gap analysis with current market demands</span>
          </li>
          <li className="flex items-start">
            <div className="bg-green-100 dark:bg-green-900/20 p-1 rounded-full mr-3 mt-0.5">
              <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Personalized learning roadmap with resources</span>
          </li>
        </ul>
      </div>
    </CardContent>
  </Card>
);

const AnalyzingCard = () => {
  const { user } = useAuth();
  const { 
    agentStatuses, 
    agentActivities, 
    connected, 
    error 
  } = useAgentSocket();

  const uploadState = 'processing';

  // Log connection status and any errors
  useEffect(() => {
    if (error) {
      console.error("Socket error:", error);
      toast({
        title: "Connection Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Analyzing Your Career Data</CardTitle>
              <CardDescription>
                Our AI agents are working on your personalized career insights
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {connected ? (
                <div className="flex items-center text-green-600 dark:text-green-400 text-xs">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600 dark:text-red-400 text-xs">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span>Disconnected</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AgentStatusPanel 
            uploadState={uploadState}
            agentStatuses={agentStatuses}
            recentActivities={agentActivities}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Agent Activity Feed</CardTitle>
            <CardDescription>
              Real-time updates from our specialized AI agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentActivityPanel 
              activities={agentActivities}
              agentStatuses={agentStatuses}
              className="max-h-96 overflow-y-auto px-0"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Analysis Progress</CardTitle>
            <CardDescription>
              Overall completion status of your career analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round((Object.values(agentStatuses).filter(s => s === 'complete').length / 4) * 100)}%</span>
              </div>
              <Progress 
                value={(Object.values(agentStatuses).filter(s => s === 'complete').length / 4) * 100} 
                className="h-2"
              />
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
              <p className="font-medium mb-1">Analysis in Progress</p>
              <p>This typically takes 1-2 minutes. Our AI agents are analyzing your data to provide personalized career insights.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const RiskAnalysisTab = ({ careerAdvice }: { careerAdvice?: CareerAdvice }) => {
  if (!careerAdvice) return <div>No data available</div>;

  const { riskReport } = careerAdvice;
  const riskLevel = 
    riskReport.overallRisk < 0.3 ? "Low" : 
    riskReport.overallRisk < 0.6 ? "Medium" : "High";

  const riskColor = 
    riskReport.overallRisk < 0.3 ? "bg-green-500" : 
    riskReport.overallRisk < 0.6 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>AI Automation Risk</CardTitle>
            <div className={`px-3 py-1 rounded-full text-white text-sm ${
              riskReport.overallRisk < 0.3 ? "bg-green-500" : 
              riskReport.overallRisk < 0.6 ? "bg-yellow-500" : "bg-red-500"
            }`}>
              {riskLevel} Risk
            </div>
          </div>
          <CardDescription>
            Overall assessment of how vulnerable your role is to AI automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between mb-2 text-sm">
              <span>Risk Score</span>
              <span>{Math.round(riskReport.overallRisk * 100)}%</span>
            </div>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full ${riskColor}`} style={{ width: `${riskReport.overallRisk * 100}%` }}></div>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>{riskReport.summary}</p>
          </div>

          <Separator className="my-6" />

          <h3 className="text-lg font-medium mb-4">Risk by Category</h3>
          <div className="space-y-6">
            {riskReport.categories.map((category) => (
              <div key={category.category}>
                <div className="flex justify-between mb-2 text-sm">
                  <span>{category.category}</span>
                  <span>{Math.round(category.risk * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      category.risk < 0.3 ? "bg-green-500" : 
                      category.risk < 0.6 ? "bg-yellow-500" : "bg-red-500"
                    }`} 
                    style={{ width: `${category.risk * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{category.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-end">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const SkillGapsTab = ({ careerAdvice }: { careerAdvice?: CareerAdvice }) => {
  if (!careerAdvice) return <div>No data available</div>;

  const { learningPlan } = careerAdvice;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Skill Gap Analysis</CardTitle>
          <CardDescription>
            Comparison of your current skills with market demands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {learningPlan.skills.map((skill) => (
              <div key={skill.skill}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{skill.skill}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Importance: {
                      skill.importance < 0.3 ? "Low" : 
                      skill.importance < 0.7 ? "Medium" : "High"
                    }
                  </span>
                </div>
                <div className="flex items-center mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-2 w-16">Current</span>
                  <div className="h-2 flex-grow bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${(skill.currentLevel / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs ml-2">{skill.currentLevel}/10</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-2 w-16">Target</span>
                  <div className="h-2 flex-grow bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${(skill.targetLevel / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs ml-2">{skill.targetLevel}/10</span>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-medium mb-4">Recommended Resources</h3>
            <div className="space-y-4">
              {learningPlan.resources.map((resource) => (
                <Card key={resource.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className={`p-4 sm:w-1/5 font-medium text-white ${
                      resource.level === "Beginner" ? "bg-green-600" :
                      resource.level === "Intermediate" ? "bg-blue-600" :
                      "bg-purple-600"
                    }`}>
                      {resource.level}
                    </div>
                    <div className="p-4 sm:w-4/5">
                      <h4 className="font-medium mb-1">{resource.title}</h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {resource.skillsAddressed.map((skill) => (
                          <span key={skill} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{resource.provider}</span>
                        <span>{resource.duration}</span>
                      </div>
                      <div className="mt-2">
                        <a 
                          href={resource.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          View Resource
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Estimated time to complete all recommended training: {learningPlan.timeEstimate}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const RoadmapTab = ({ careerAdvice }: { careerAdvice?: CareerAdvice }) => {
  if (!careerAdvice) return <div>No data available</div>;

  const { nextSteps } = careerAdvice;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Career Roadmap</CardTitle>
          <CardDescription>
            Personalized action plan to future-proof your career
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>
                Immediate Actions (0-30 days)
              </h3>
              <ul className="space-y-2">
                {nextSteps.immediate.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <div className="h-5 w-5 rounded-full border-2 border-red-500 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-red-500">{index + 1}</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <div className="h-2 w-2 bg-yellow-500 rounded-full mr-2"></div>
                Short-Term Goals (1-3 months)
              </h3>
              <ul className="space-y-2">
                {nextSteps.shortTerm.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <div className="h-5 w-5 rounded-full border-2 border-yellow-500 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-yellow-500">{index + 1}</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                Long-Term Strategy (3-12 months)
              </h3>
              <ul className="space-y-2">
                {nextSteps.longTerm.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <div className="h-5 w-5 rounded-full border-2 border-green-500 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-green-500">{index + 1}</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-between">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Plan
          </Button>
          <Button>
            Schedule Reminder
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Dashboard;