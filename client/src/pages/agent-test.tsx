import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import AgentStatusPanel from '@/components/dashboard/AgentStatusPanel';
import { AgentActivityPanel, AgentInfoCard } from '@/components/dashboard/AgentActivityPanel';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import Footer2 from '@/components/ui/footer2';
import { Wifi, WifiOff, Send, Info, Upload, FileText, AlertTriangle, Brain } from 'lucide-react';

const AgentTestPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { connected, agentStatuses, agentActivities, startAnalysis, error } = useAgentSocket();
  
  const [resumeText, setResumeText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  
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
    startAnalysis(resumeText);
    
    toast({
      title: "Analysis started",
      description: "AI agents are now analyzing your resume.",
    });
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
          
          <Card className="overflow-hidden border-2 border-primary/10">
            <CardHeader className="bg-primary/5">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Resume Analyzer</CardTitle>
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