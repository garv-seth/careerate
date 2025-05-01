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
import { Wifi, WifiOff, Send, Info } from 'lucide-react';

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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Agent System Test</h1>
            <div className="flex items-center space-x-2">
              {connected ? (
                <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span>Connected to agents</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span>Disconnected</span>
                </div>
              )}
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Resume Analysis</CardTitle>
              <CardDescription>
                Enter your resume text to test the multi-agent system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your resume text here..."
                className="min-h-[200px] resize-none"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                disabled={analyzing}
              />
            </CardContent>
            <CardFooter className="justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Sample résumé text will be analyzed by all 4 agents
              </div>
              <Button 
                onClick={handleStartAnalysis} 
                disabled={!resumeText.trim() || !connected || analyzing}
              >
                Start Analysis
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Status</CardTitle>
                <CardDescription>
                  Current status of all AI agents in the system
                </CardDescription>
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
              <CardHeader>
                <CardTitle>Activity Feed</CardTitle>
                <CardDescription>
                  Real-time agent activity tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentActivityPanel 
                  activities={agentActivities}
                  agentStatuses={agentStatuses}
                  className="max-h-96 overflow-y-auto"
                />
              </CardContent>
            </Card>
          </div>
          
          <Separator />
          
          <h2 className="text-xl font-semibold flex items-center">
            <Info className="h-5 w-5 mr-2" />
            About Our Agents
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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