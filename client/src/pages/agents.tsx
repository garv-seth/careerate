import React, { useState } from 'react';
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

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TubelightNavbar />
      <PageWrapper>
        <main className="container mx-auto px-4 py-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">AI Agent Team</h1>

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
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="text-blue-700 dark:text-blue-300">Cara</CardTitle>
                    <CardDescription>Career Coach & Orchestrator</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Coordinates your career analysis and creates comprehensive action plans based on specialized agent inputs.</p>
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

              <div className="mt-6 flex items-center p-4 bg-muted/50 rounded-lg">
                <Info className="h-5 w-5 text-primary mr-2" />
                <p className="text-sm">Our agents work together to provide personalized career insights once you upload your resume.</p>
              </div>
            </div>
          </div>
        </main>
      </PageWrapper>
      <Footer2 />
    </div>
  );
}

export default AgentsPage;