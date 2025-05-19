
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import PageWrapper from '@/components/ui/page-wrapper';
import Footer2 from '@/components/ui/footer2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, AlertCircle, ArrowUpRight } from 'lucide-react';

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
            
            {/* Keep other agent-related content */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>AI Agent Team</CardTitle>
                  <CardDescription>Our specialized agents work together to analyze your career data</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Agent content here...</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </PageWrapper>
      <Footer2 />
    </div>
  );
}

export default AgentsPage;
