import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCareerService } from '@/hooks/useCareerService';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

import TubelightNavbar from '@/components/ui/tubelight-navbar';
import PageWrapper from '@/components/ui/page-wrapper';
import Footer2 from '@/components/ui/footer2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { VulnerabilityAssessment } from '@/components/dashboard/VulnerabilityAssessment';
import { CareerMigration } from '@/components/dashboard/CareerMigration';
import { CareerSimulation } from '@/components/dashboard/CareerSimulation';

import { 
  CloudUpload, Upload, Shield, ArrowRight, PlayCircle, DollarSign,
  User, Briefcase, GraduationCap, Building, AlertTriangle, Clock, 
  ArrowUpRight, CheckCircle, Loader2, Trophy, Star
} from 'lucide-react';

const Dashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPremium, setIsPremium] = useState(false); // In a real app, this would be determined by a subscription check

  // Career service hook for real-time analysis
  const { 
    connected, 
    analysisProgress, 
    insights, 
    startAnalysis, 
    startVulnerabilityAssessment,
    startCareerMigration,
    startCareerSimulation,
    error: serviceError 
  } = useCareerService();

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/profile'],
    enabled: isAuthenticated,
  });

  // Fetch vulnerability assessment
  const { data: vulnerabilityData, isLoading: vulnerabilityLoading } = useQuery({
    queryKey: ['/api/vulnerability-assessment'],
    enabled: isAuthenticated && !!profile?.resumeText,
  });

  // Fetch career migration paths
  const { data: migrationPaths, isLoading: migrationLoading } = useQuery({
    queryKey: ['/api/career-migration-paths'],
    enabled: isAuthenticated && !!profile?.resumeText,
  });

  // Fetch career simulations
  const { data: careerSimulation, isLoading: simulationLoading } = useQuery({
    queryKey: ['/api/career-simulations'],
    enabled: isAuthenticated && isPremium && !!profile?.resumeText,
  });

  // Handle resume upload
  const uploadResumeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest('POST', '/api/resume/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Resume uploaded successfully',
        description: 'Your resume is being analyzed for AI vulnerability.',
      });

      // Start analysis via the career service
      if (connected && data.profile && data.profile.resumeText) {
        startAnalysis(data.profile.resumeText);
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vulnerability-assessment'] });
    },
    onError: () => {
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your resume. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Handle file selection
  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  // Handle resume upload
  const handleResumeUpload = async () => {
    if (!resumeFile) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('resume', resumeFile);

    uploadResumeMutation.mutate(formData);

    setUploading(false);
  };

  // Handle vulnerability assessment start
  const handleStartVulnerabilityAssessment = (jobTitle: string, industry: string) => {
    startVulnerabilityAssessment(jobTitle, industry);

    // In a real app, this would trigger a backend call to start the assessment
    toast({
      title: 'Assessment started',
      description: 'Your AI vulnerability assessment is now being processed.',
    });
  };

  // Handle career migration path generation
  const handleStartCareerMigration = (currentRole: string) => {
    startCareerMigration(currentRole);

    // In a real app, this would trigger a backend call to generate migration paths
    toast({
      title: 'Generating career paths',
      description: 'We\'re analyzing optimal career migration paths for you.',
    });
  };

  // Handle career simulation
  const handleStartCareerSimulation = (params: any) => {
    startCareerSimulation(params);

    // In a real app, this would trigger a backend call to run the simulation
    toast({
      title: 'Simulation started',
      description: 'Your career simulation is now running.',
    });
  };

  // Error logging
  useEffect(() => {
    if (serviceError) {
      console.error('Career service error:', serviceError);
      toast({
        title: 'Connection Error',
        description: serviceError,
        variant: 'destructive',
      });
    }
  }, [serviceError]);

  return (
    <div className="flex min-h-screen flex-col">
      <TubelightNavbar />
      <PageWrapper>
        <main className="flex-grow container mx-auto px-4 pb-20">
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
                isPremium={isPremium}
              />
            </div>

            {/* Main Content */}
            <div className="w-full lg:w-3/4">
              {!profile?.resumeText ? (
                <GetStartedCard />
              ) : profileLoading ? (
                <LoadingCard />
              ) : (
                <Tabs defaultValue="vulnerability" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="vulnerability" className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      <span className="hidden sm:inline">AI Vulnerability</span>
                      <span className="inline sm:hidden">Vulnerability</span>
                    </TabsTrigger>
                    <TabsTrigger value="migration" className="flex items-center gap-1">
                      <ArrowRight className="h-4 w-4" />
                      <span className="hidden sm:inline">Career Migration</span>
                      <span className="inline sm:hidden">Migration</span>
                    </TabsTrigger>
                    <TabsTrigger value="simulation" className="flex items-center gap-1 relative">
                      <PlayCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Simulation</span>
                      <span className="inline sm:hidden">Sim</span>
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                    </TabsTrigger>
                    <TabsTrigger value="negotiation" className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="hidden sm:inline">Salary Negotiation</span>
                      <span className="inline sm:hidden">Salary</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="vulnerability" className="mt-6">
                    <VulnerabilityAssessment 
                      assessmentData={vulnerabilityData} 
                      onStartAssessment={handleStartVulnerabilityAssessment}
                      isAssessing={vulnerabilityLoading || analysisProgress.stage === 'vulnerability-analysis'}
                    />
                  </TabsContent>

                  <TabsContent value="migration" className="mt-6">
                    <CareerMigration 
                      migrationData={migrationPaths} 
                      onStartMigration={handleStartCareerMigration}
                      isLoading={migrationLoading || analysisProgress.stage === 'migration-paths'}
                    />
                  </TabsContent>

                  <TabsContent value="simulation" className="mt-6">
                    <CareerSimulation
                      simulationData={careerSimulation}
                      onStartSimulation={handleStartCareerSimulation}
                      isRunning={simulationLoading || analysisProgress.stage === 'simulation'}
                      isPremium={isPremium}
                    />
                  </TabsContent>

                  <TabsContent value="negotiation" className="mt-6">
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold">AI-powered Salary Negotiation</h2>
                      <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                          <CardTitle>Coming Soon</CardTitle>
                          <CardDescription>
                            Our AI salary negotiation assistant is currently in development
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-col items-center text-center space-y-4 py-6">
                            <DollarSign className="h-16 w-16 text-primary opacity-50" />
                            <h3 className="text-xl font-bold">Maximize Your Compensation</h3>
                            <p className="text-gray-500 max-w-md">
                              Our AI negotiation coach will help you secure the best possible salary and benefits package for your next role. This feature will be available soon!
                            </p>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button className="w-full" disabled>
                            Join Waitlist
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </main>
      </PageWrapper>
      <Footer2 />
    </div>
  );
};

const ProfileSidebar = ({ 
  user, 
  profile, 
  resumeFile, 
  onResumeChange, 
  onResumeUpload, 
  uploading,
  isPremium = false
}: any) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt={user.username} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-medium">{user?.username || 'User'}</h3>
              <p className="text-sm text-gray-500">{user?.email || 'No email'}</p>
              {isPremium && (
                <Badge className="mt-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
                  <Star className="h-3 w-3 mr-1" /> Premium
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {profile && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Career Stage</span>
              </div>
              <p className="font-medium">{profile.careerStage || 'Not specified'}</p>
            </div>
          )}

          {profile?.industryFocus && profile.industryFocus.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Industry Focus</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.industryFocus.map((industry: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{industry}</Badge>
                ))}
              </div>
            </div>
          )}

          {profile?.careerGoals && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Career Goals</span>
              </div>
              <p className="text-sm">{profile.careerGoals}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" />
            Resume Upload
          </CardTitle>
          <CardDescription>
            Upload your resume to get started with AI vulnerability analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.resumeText ? (
            <div className="space-y-3">
              <div className="bg-primary/10 text-primary rounded-md p-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Resume Uploaded</span>
              </div>
              <p className="text-xs text-gray-500">
                Last scanned: {profile.lastScan ? new Date(profile.lastScan).toLocaleDateString() : 'Never'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-md p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-2">Upload your resume (PDF or DOCX)</p>
                <Input
                  type="file"
                  id="resumeFile"
                  accept=".pdf,.docx,.doc"
                  onChange={onResumeChange}
                  className="hidden"
                />
                <Label htmlFor="resumeFile" className="cursor-pointer">
                  <Button variant="outline" size="sm" className="w-full">
                    Choose File
                  </Button>
                </Label>
                {resumeFile && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {resumeFile.name}
                  </p>
                )}
              </div>

              <Button 
                className="w-full"
                onClick={onResumeUpload}
                disabled={!resumeFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Resume'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isPremium ? (
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950/40 dark:to-secondary-950/40 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Premium Features Active</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Career Simulation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Exclusive Market Data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Salary Negotiation</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950/40 dark:to-secondary-950/40 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Unlock Premium Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Career Simulation</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Exclusive Market Data</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Salary Negotiation</span>
              </div>
            </div>

            <Button className="w-full" variant="secondary">
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const GetStartedCard = () => {
  return (
    <Card className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-950/40 dark:to-secondary-950/40 border-primary/20">
      <CardHeader>
        <CardTitle>Welcome to Careerate</CardTitle>
        <CardDescription>
          Your AI-powered career navigator for the age of automation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Is AI coming for your job?</h3>
              <p className="text-gray-500">Assess your vulnerability to AI displacement</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm">Upload your resume to analyze your AI vulnerability</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm">Discover optimal career migration paths to AI-resistant roles</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm">Simulate different career futures with our Digital Career Twin™</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            To get started, upload your resume using the form in the sidebar
          </p>
          <div className="flex items-center justify-center">
            <ArrowUpRight className="h-5 w-5 text-primary animate-bounce" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading Your Career Data</CardTitle>
        <CardDescription>
          Please wait while we load your career information
        </CardDescription>
      </CardHeader>
      <CardContent className="py-10 space-y-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
        <Progress value={65} className="w-full" />
      </CardContent>
    </Card>
  );
};

export default Dashboard;