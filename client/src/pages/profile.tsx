
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Footer2 from '@/components/ui/footer2';
import { Pencil, Download, Upload } from 'lucide-react';

const ProfilePage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // No direct redirect needed here, the ProtectedRoute component will handle it

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TubelightNavbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user?.profileImage} />
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">{user?.name}</h1>
                      <p className="text-muted-foreground">{user?.email}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                  <p className="mt-4">{user?.bio || 'No bio added yet'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Career Summary</CardTitle>
                <CardDescription>Your current career status and goals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Current Role</h3>
                    <p className="text-muted-foreground">Software Engineer</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Experience Level</h3>
                    <p className="text-muted-foreground">Mid-Senior Level</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Career Goals</h3>
                    <p className="text-muted-foreground">Transitioning to AI/ML Engineering</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resume Management</CardTitle>
                <CardDescription>Manage your resume versions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full" variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Resume
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Current Resume
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer2 />
    </div>
  );
};

export default ProfilePage;
