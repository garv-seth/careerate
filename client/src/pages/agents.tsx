import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import PageWrapper from '@/components/ui/page-wrapper';
import Footer2 from '@/components/ui/footer2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { FileText, AlertCircle, ArrowUpRight, Info, Zap, ArrowRight, Loader2 } from 'lucide-react';

function AgentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('agents');
  const [accelerateProgress, setAccelerateProgress] = useState(0);
  const [accelerateResults, setAccelerateResults] = useState(null);
  const [selectedModel, setSelectedModel] = useState('llama-3.1-sonar-small-128k-online');

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });
  
  // Fetch user settings
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    enabled: !!user,
  });

  // Effect to update selected model from settings
  useEffect(() => {
    if (settings?.aiModel) {
      setSelectedModel(settings.aiModel);
    }
  }, [settings]);
  
  // Deep Accelerate mutation
  const deepAccelerateMutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, this would call the API
      // Since we don't have the endpoint yet, we're simulating the response
      // This would be replaced with a real API call when the endpoint is implemented
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            trajectoryInsights: "Based on your resume and career history, you're well-positioned for growth in the tech sector with your skills in JavaScript, React, and system architecture. Consider focusing on emerging technologies like AI integration and cloud architecture to stay competitive.",
            recommendations: [
              "Expand your cloud infrastructure knowledge with AWS or Azure certification",
              "Develop expertise in AI/ML integration with existing systems",
              "Strengthen leadership skills through project management opportunities",
              "Build cross-functional collaboration skills across engineering teams"
            ]
          });
        }, 4000);
      });
    },
    onMutate: () => {
      toast({
        title: "Deep Accelerate started",
        description: "All agents are now working together to analyze your career trajectory.",
        variant: "default",
      });
      // Start progress simulation
      setAccelerateProgress(0);
      const interval = setInterval(() => {
        setAccelerateProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95; // Stop at 95% and wait for the actual completion
          }
          return prev + (95 - prev) * 0.1;
        });
      }, 500);
      return () => clearInterval(interval);
    },
    onSuccess: (data: any) => {
      setAccelerateProgress(100);
      setAccelerateResults(data);
      toast({
        title: "Analysis complete",
        description: "Your career trajectory has been analyzed using all agent capabilities.",
        variant: "default",
      });
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    },
    onError: (error) => {
      setAccelerateProgress(0);
      toast({
        title: "Analysis failed",
        description: error.message || "There was an error processing your request.",
        variant: "destructive",
      });
    },
  });

  // Handle Deep Accelerate click
  const handleDeepAccelerate = () => {
    if (!profile?.resumeText) {
      toast({
        title: "Resume required",
        description: "Please upload your resume before using Deep Accelerate.",
        variant: "destructive",
      });
      return;
    }
    deepAccelerateMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TubelightNavbar />
      <PageWrapper>
        <main className="container mx-auto px-4 py-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-2 mb-6">
              <h1 className="text-3xl font-bold">AI Agent Team</h1>
              <p className="text-muted-foreground">Our specialized AI agents work together to accelerate your career growth</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="agents">Agent Team</TabsTrigger>
                <TabsTrigger value="deep-accelerate">Deep Accelerate</TabsTrigger>
              </TabsList>
              
              <TabsContent value="agents" className="space-y-6 mt-6">
                {/* Resume info section */}
                <div className="mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Resume Status</CardTitle>
                      <CardDescription>Your resume is used by our AI agents for analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {profileLoading ? (
                        <div className="h-20 flex items-center justify-center">
                          <p>Loading resume information...</p>
                        </div>
                      ) : profile?.resumeText ? (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">Resume Uploaded</p>
                              <p className="text-sm text-muted-foreground">
                                Last analyzed: {profile?.lastScan ? new Date(profile.lastScan).toLocaleDateString() : 'Never'}
                              </p>
                            </div>
                          </div>
                          <div className="bg-muted/50 p-3 rounded-md text-sm">
                            <p>To update your resume, please visit the <Button variant="link" onClick={() => window.location.href = '/profile'} className="p-0 h-auto">Profile page</Button></p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">
                              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <p className="font-medium">No Resume Found</p>
                              <p className="text-sm text-muted-foreground">
                                Upload your resume on the Profile page to activate AI agent analysis
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/profile'}>
                            Go to Profile Page
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Agent Team Grid Display */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Meet Our AI Agent Team</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800">
                      <CardHeader>
                        <CardTitle className="text-blue-700 dark:text-blue-300">Cara</CardTitle>
                        <CardDescription className="dark:text-blue-200/80">Career Coach & Orchestrator</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm dark:text-blue-100/90">Coordinates your career analysis and creates comprehensive action plans based on specialized agent inputs.</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-purple-50 dark:bg-purple-950/70 border-purple-200 dark:border-purple-800">
                      <CardHeader>
                        <CardTitle className="text-purple-700 dark:text-purple-300">Maya</CardTitle>
                        <CardDescription className="dark:text-purple-200/80">Resume Analyzer</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm dark:text-purple-100/90">Specializes in analyzing your resume to identify skills, experience, and career trajectory patterns.</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-pink-50 dark:bg-pink-950/70 border-pink-200 dark:border-pink-800">
                      <CardHeader>
                        <CardTitle className="text-pink-700 dark:text-pink-300">Ellie</CardTitle>
                        <CardDescription className="dark:text-pink-200/80">Industry Analyst</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm dark:text-pink-100/90">Researches market trends, industry developments, and automation risks relevant to your career.</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-green-50 dark:bg-green-950/70 border-green-200 dark:border-green-800">
                      <CardHeader>
                        <CardTitle className="text-green-700 dark:text-green-300">Sophia</CardTitle>
                        <CardDescription className="dark:text-green-200/80">Learning Advisor</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm dark:text-green-100/90">Creates personalized learning plans based on your skills and career goals for optimal skill development.</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 flex items-center p-4 bg-muted/50 rounded-lg dark:bg-gray-800/50">
                    <Info className="h-5 w-5 text-primary mr-2" />
                    <p className="text-sm">Our agents work together to provide personalized career insights once you upload your resume.</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="deep-accelerate" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Zap className="h-6 w-6 text-amber-500" />
                      <CardTitle>Deep Accelerate</CardTitle>
                    </div>
                    <CardDescription>Unleash the full power of all agents working together</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                      <h3 className="font-semibold mb-2 text-amber-800 dark:text-amber-300">What is Deep Accelerate?</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-200">
                        Deep Accelerate combines all of our specialized AI agents into a unified analysis of your career trajectory. 
                        This advanced feature provides comprehensive insights and strategies based on your resume data, industry trends, 
                        and skill development opportunities.
                      </p>
                      
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-100/50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                            Using: {selectedModel.split('-')[0].toUpperCase()} {selectedModel.split('-')[1]} 
                            {selectedModel.includes('small') ? ' (Small)' : 
                             selectedModel.includes('large') ? ' (Large)' : 
                             selectedModel.includes('huge') ? ' (Huge)' : ''}
                          </Badge>
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            Set in Settings
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {accelerateProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Analysis in progress...</span>
                          <span className="text-sm">{Math.round(accelerateProgress)}%</span>
                        </div>
                        <Progress value={accelerateProgress} className="h-2" />
                      </div>
                    )}
                    
                    {accelerateResults ? (
                      <div className="space-y-4 p-4 border rounded-lg bg-slate-800 text-white border-gray-700">
                        <h3 className="font-semibold">Analysis Results</h3>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Career Trajectory Insights</h4>
                          <p className="text-sm">{accelerateResults.trajectoryInsights || "No trajectory insights available."}</p>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Key Recommendations</h4>
                          <ul className="space-y-1">
                            {accelerateResults.recommendations ? (
                              accelerateResults.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                  <ArrowRight className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-sm">No recommendations available.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-10">
                        <div className="text-center space-y-4">
                          {deepAccelerateMutation.isPending ? (
                            <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto" />
                          ) : (
                            <Zap className="h-10 w-10 text-amber-500 mx-auto" />
                          )}
                          <div>
                            <p className="font-medium">
                              {deepAccelerateMutation.isPending 
                                ? "Analysis in progress..." 
                                : "Start Deep Accelerate Analysis"}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {deepAccelerateMutation.isPending 
                                ? "Our AI agents are working together to analyze your career data" 
                                : "All agents will work together to give you comprehensive career insights"}
                            </p>
                          </div>
                          {!deepAccelerateMutation.isPending && (
                            <Button 
                              onClick={handleDeepAccelerate}
                              disabled={!profile?.resumeText || deepAccelerateMutation.isPending}
                              className="mt-4 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
                            >
                              <Zap className="mr-2 h-4 w-4" />
                              Start Deep Accelerate
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </PageWrapper>
      <Footer2 />
    </div>
  );
}

export default AgentsPage;