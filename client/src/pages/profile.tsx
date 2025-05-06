
import React, { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Footer2 from '@/components/ui/footer2';
import { Pencil, Download, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ProfilePage = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [uploadedResume, setUploadedResume] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user profile data - will contain resume info
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/onboarding/user-profile'],
    enabled: !!user,
  });

  // Handle resume upload
  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch('/api/onboarding/upload-resume', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload resume');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setUploading(false);
      setUploadSuccess(true);
      setUploadError(null);
      toast({
        title: 'Resume uploaded successfully',
        description: 'Your resume has been analyzed and your profile updated.',
        className: 'bg-green-50 border-green-200',
      });
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadedResume(null);
    },
    onError: (error: Error) => {
      setUploading(false);
      setUploadSuccess(false);
      setUploadError(error.message);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedResume(file);
      setUploadSuccess(false);
      setUploadError(null);
    }
  };

  const handleResumeUpload = async () => {
    if (!uploadedResume) {
      toast({
        title: 'No file selected',
        description: 'Please select a resume file to upload',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    uploadResumeMutation.mutate(uploadedResume);
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TubelightNavbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>{user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">{user?.name || user?.username}</h1>
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
                    <p className="text-muted-foreground">{profile?.careerStage || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Industry Focus</h3>
                    <p className="text-muted-foreground">
                      {profile?.industryFocus?.join(', ') || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium">Career Goals</h3>
                    <p className="text-muted-foreground">{profile?.careerGoals || 'Not specified'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resume Management</CardTitle>
                <CardDescription>Upload your resume for AI-powered career insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resume-upload">Resume File</Label>
                    <Input 
                      ref={fileInputRef}
                      id="resume-upload" 
                      type="file" 
                      accept=".pdf,.doc,.docx,.txt" 
                      onChange={handleResumeChange}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={handleChooseFile}
                        variant="outline" 
                        className="flex-1"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {uploadedResume ? uploadedResume.name : 'Select File'}
                      </Button>
                      <Button 
                        onClick={handleResumeUpload}
                        disabled={!uploadedResume || uploading}
                        className="flex-1"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Resume
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {uploadSuccess && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-600">
                        Resume uploaded successfully. Our AI agents will analyze it shortly.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {uploadError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {uploadError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {profile?.resumeText && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Resume last updated:</span>{' '}
                          {profile.lastScan ? new Date(profile.lastScan).toLocaleDateString() : 'Unknown'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
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
