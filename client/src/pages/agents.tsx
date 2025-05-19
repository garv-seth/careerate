
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import PageWrapper from '@/components/ui/page-wrapper';
import Footer2 from '@/components/ui/footer2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, User, ChevronRight, Brain, Database, BookOpen } from 'lucide-react';

function AgentsPage() {
  const { user } = useAuth();
  
  // Fetch profile data to check if resume is uploaded
  const { data: profile } = useQuery({
    queryKey: ['/api/profile'],
    enabled: !!user,
  });

  const hasResume = !!profile?.resumeText;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TubelightNavbar />
      <PageWrapper>
        <main className="flex-grow container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">AI Agent Team</h1>
          
          {!hasResume && (
            <Card className="mb-8 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="rounded-full bg-yellow-100 dark:bg-yellow-800 p-3">
                    <User className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium mb-1">Resume Required</h3>
                    <p className="text-muted-foreground mb-4">
                      Please upload your resume in your profile page to activate the agent team.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <a href="/profile">Go to Profile</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </span>
                  Maya
                </CardTitle>
                <CardDescription>Resume Analysis Specialist</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Maya extracts and parses your resume, identifying your skills, experience, and qualifications. She provides the foundation for all other analyses.
                </p>
                <div className="flex justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={hasResume ? "success" : "outline"} className="font-normal">
                      {hasResume ? "Active" : "Waiting for resume"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Model</div>
                    <Badge variant="outline" className="font-normal">GPT-4o</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full">
                    <Brain className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </span>
                  Cara
                </CardTitle>
                <CardDescription>Career Orchestrator</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Cara coordinates all agent activities and synthesizes insights from the entire team to provide comprehensive career guidance.
                </p>
                <div className="flex justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={hasResume ? "success" : "outline"} className="font-normal">
                      {hasResume ? "Active" : "Waiting for resume"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Model</div>
                    <Badge variant="outline" className="font-normal">Claude-3.5</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-full">
                    <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </span>
                  Sophia
                </CardTitle>
                <CardDescription>Market Research Expert</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Sophia analyzes job market trends, industry shifts, and automation risks to provide insights on career vulnerability and opportunities.
                </p>
                <div className="flex justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={hasResume ? "success" : "outline"} className="font-normal">
                      {hasResume ? "Active" : "Waiting for resume"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Model</div>
                    <Badge variant="outline" className="font-normal">Perplexity</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-full">
                    <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </span>
                  Ellie
                </CardTitle>
                <CardDescription>Learning Pathways Advisor</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Ellie recommends personalized learning resources, courses, and skill development paths to help bridge skill gaps and advance your career.
                </p>
                <div className="flex justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={hasResume ? "success" : "outline"} className="font-normal">
                      {hasResume ? "Active" : "Waiting for resume"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Model</div>
                    <Badge variant="outline" className="font-normal">Claude-3 Haiku</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Agent System Architecture</CardTitle>
              <CardDescription>
                How our AI agents work together to provide career insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Our multi-agent system follows the Agent-to-Agent (A2A) protocol, allowing specialized AI agents to 
                  collaborate effectively. Each agent has a specific role and expertise, with access to different external 
                  data sources and tools.
                </p>
                
                <div className="rounded-md bg-muted p-4 text-sm">
                  <h4 className="font-medium mb-2">Communication Flow</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Maya analyzes your resume to extract key information</li>
                    <li>Cara orchestrates the analysis process</li>
                    <li>Sophia researches market trends and automation risks</li>
                    <li>Ellie identifies learning resources and development paths</li>
                    <li>Cara synthesizes insights into a comprehensive career plan</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </PageWrapper>
      <Footer2 />
    </div>
  );
}

export default AgentsPage;
