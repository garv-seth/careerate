import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import Footer2 from '@/components/ui/footer2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AIRiskHeatMap } from '@/components/dashboard/AIRiskHeatMap';
import { LearningRecommendations } from '@/components/dashboard/LearningRecommendations';
import { AgentActivityPanel } from '@/components/dashboard/AgentActivityPanel';
import AgentStatusPanel from '@/components/dashboard/AgentStatusPanel';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Loader2, 
  User, 
  Briefcase, 
  FileText, 
  BarChart3, 
  Zap, 
  ListChecks, 
  Calendar,
  Star
} from 'lucide-react';

// Define types for user profile and agent data
interface UserProfile {
  id: string;
  userId: string;
  resumeText: string | null;
  lastScan: string | null;
  careerStage?: string;
  industryFocus?: string[];
  careerGoals?: string;
  preferredLearningStyle?: string;
  timeAvailability?: string;
}

interface LearningRecommendation {
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  duration: string;
  url?: string;
}

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { connected: socketConnected, agentStatuses, agentActivities } = useAgentSocket();
  
  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/onboarding/user-profile'],
    enabled: !!user,
  });

  // Fetch onboarding status
  const { data: onboardingStatus } = useQuery({
    queryKey: ['/api/onboarding/onboarding-status'],
    enabled: !!user,
  });

  // This would be fetched from an API in a real implementation
  // We're using mock data for the UI demonstration
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([
    {
      title: 'Machine Learning Fundamentals',
      description: 'Build a strong foundation in ML concepts and techniques',
      impact: 'High',
      duration: '4 week course'
    },
    {
      title: 'Advanced Communication Skills',
      description: 'Enhance your ability to convey complex ideas effectively',
      impact: 'Medium',
      duration: '2 week course'
    }
  ]);

  // Dynamic risk level that would be calculated by AI in production
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Update recommendations based on profile data
  useEffect(() => {
    if (profile && profile.careerGoals) {
      // In a real implementation, this would be an API call to get personalized recommendations
      // based on the user's profile and AI analysis
      
      // For demo purposes we'll just check if certain keywords appear in the career goals
      const goals = profile.careerGoals.toLowerCase();
      
      if (goals.includes('ai') || goals.includes('machine learning')) {
        setRecommendations([
          {
            title: 'Machine Learning Foundations',
            description: 'Essential ML concepts and practical applications',
            impact: 'High',
            duration: '4 week course'
          },
          {
            title: 'Python for Data Science',
            description: 'Master Python for ML and data analysis',
            impact: 'Medium',
            duration: '3 week course'
          }
        ]);
      } else if (goals.includes('management') || goals.includes('leadership')) {
        setRecommendations([
          {
            title: 'Strategic Leadership',
            description: 'Advanced leadership techniques for tech professionals',
            impact: 'High',
            duration: '4 week course'
          },
          {
            title: 'Product Management Essentials',
            description: 'Core skills for successful product management',
            impact: 'Medium',
            duration: '3 week course'
          }
        ]);
      }
    }
  }, [profile]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TubelightNavbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <UserProfileCard user={user} profile={profile} />
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">AI Agents Status</CardTitle>
                <CardDescription>
                  Our AI team working for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentStatusPanel agentStatuses={agentStatuses} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Premium Features</CardTitle>
                <CardDescription>
                  Unlock advanced capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="mr-2 p-1 bg-primary/10 rounded">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">Career Trajectory</span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">PRO</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="mr-2 p-1 bg-primary/10 rounded">
                      <ListChecks className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">Skills Gap Accelerator</span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">PRO</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="mr-2 p-1 bg-primary/10 rounded">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">Executive Network</span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">PRO</span>
                </div>
                
                <Button size="sm" className="w-full mt-2">
                  Upgrade Now
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                title="Career Stage" 
                value={profile?.careerStage || "Not specified"} 
                icon={User}
              />
              <StatCard 
                title="Industry Focus" 
                value={profile?.industryFocus?.join(', ') || "Not specified"} 
                icon={Briefcase}
              />
              <StatCard 
                title="Resume Status" 
                value={profile?.resumeText ? "Uploaded" : "Not uploaded"} 
                icon={FileText}
                valueColor={profile?.resumeText ? "text-green-600" : "text-yellow-600"}
              />
            </div>
            
            {profile?.resumeText ? (
              <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="career">Career Path</TabsTrigger>
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                  <TabsTrigger value="network">Network</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dashboard">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardContent className="pt-6">
                        <AIRiskHeatMap riskLevel={riskLevel} />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <LearningRecommendations recommendations={recommendations} />
                      </CardContent>
                    </Card>
                    
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>Real-time AI Activity</CardTitle>
                        <CardDescription>
                          See how our AI agents are working on your career data
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AgentActivityPanel activities={agentActivities} agentStatuses={agentStatuses} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="career">
                  <Card>
                    <CardHeader>
                      <CardTitle>Career Path Trajectory</CardTitle>
                      <CardDescription>
                        Personalized career path based on your goals and skills
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-center p-8">
                        <div className="text-center space-y-3">
                          <BarChart3 className="h-16 w-16 text-primary/40 mx-auto" />
                          <h3 className="text-lg font-medium">Career Path Analysis</h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            This premium feature provides a detailed analysis of your optimal career path based on your skills, goals, and market trends.
                          </p>
                          <Button className="mt-4">
                            <Star className="h-4 w-4 mr-2" />
                            Upgrade to Pro
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="skills">
                  <Card>
                    <CardHeader>
                      <CardTitle>Skills Dashboard</CardTitle>
                      <CardDescription>
                        Track and improve your key professional skills
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Skills analysis will appear here...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="network">
                  <Card>
                    <CardHeader>
                      <CardTitle>Professional Network</CardTitle>
                      <CardDescription>
                        Expand your professional connections
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Networking opportunities will appear here...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Complete Your Profile</CardTitle>
                  <CardDescription>
                    Upload your resume to get AI-powered career insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-16 w-16 text-muted-foreground/40 mb-4" />
                    <h3 className="text-xl font-medium mb-2">Resume Required</h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      To provide personalized AI career insights, we need to analyze your resume.
                      Please upload your resume on your profile page.
                    </p>
                    <Button asChild>
                      <a href="/profile">Go to Profile</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      <Footer2 />
    </div>
  );
};

interface UserProfileCardProps {
  user: any;
  profile: any;
}

const UserProfileCard = ({ user, profile }: UserProfileCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 mb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-medium">{user?.username || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
          </div>
        </div>
        
        <Separator className="my-3" />
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Resume</span>
            <span className={profile?.resumeText ? "text-green-600" : "text-yellow-600"}>
              {profile?.resumeText ? "Uploaded" : "Missing"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Analysis</span>
            <span>
              {profile?.lastScan 
                ? new Date(profile.lastScan).toLocaleDateString() 
                : "Never"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profile</span>
            <span className={profile ? "text-green-600" : "text-yellow-600"}>
              {profile ? "Complete" : "Incomplete"}
            </span>
          </div>
        </div>
        
        <Separator className="my-3" />
        
        <Button asChild size="sm" variant="outline" className="w-full">
          <a href="/profile">
            View Profile
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  valueColor?: string;
  icon: React.ElementType;
}

const StatCard = ({ title, value, valueColor = "text-foreground", icon: Icon }: StatCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className={`text-xl font-semibold ${valueColor}`}>{value}</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-full">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;