import React, { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import PageWrapper from '@/components/ui/page-wrapper';
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

      console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

      // Log form data for debugging
      for (let [key, value] of formData.entries()) {
        console.log(`Form data: ${key} = ${value instanceof File ? value.name : value}`);
      }

      const response = await fetch('/api/onboarding/upload-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error response:', errorData);
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

  // Truncate filename if too long
  const truncateFilename = (filename: string, maxLength: number = 20) => {
    if (!filename) return '';
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop() || '';
    const nameWithoutExt = filename.substring(0, filename.length - extension.length - 1);
    
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';
    return `${truncatedName}.${extension}`;
  };

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
      <PageWrapper>
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>{user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-grow w-full text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold">{user?.name || user?.username}</h1>
                      <p className="text-muted-foreground">{user?.email}</p>
                    </div>
                    <Button variant="outline" size="sm" className="self-start">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                  <p className="mt-4">{user?.bio || 'No bio added yet'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Subscription Status Card */}
            <Card className={user?.subscriptionTier === 'premium' ? 'border-2 border-primary' : ''}>
              <CardHeader className={user?.subscriptionTier === 'premium' ? 'bg-primary/5' : ''}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle>Subscription</CardTitle>
                  {user?.subscriptionTier === 'premium' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                      PREMIUM
                    </span>
                  )}
                </div>
                <CardDescription>
                  Your current subscription status and plan details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                      {user?.subscriptionTier === 'premium' 
                        ? <CheckCircle className="h-6 w-6 text-primary" /> 
                        : <FileText className="h-6 w-6 text-muted-foreground" />
                      }
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">
                        {user?.subscriptionTier === 'premium' ? 'Premium Plan' : 'Free Plan'}
                      </h3>
                      <p className="text-muted-foreground">
                        {user?.subscriptionTier === 'premium' 
                          ? '$20/month - Full access to all features' 
                          : 'Limited access to basic features'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <h3 className="text-sm font-medium">Status</h3>
                      <div className="flex items-center mt-1">
                        <span className={`h-2 w-2 rounded-full mr-2 ${
                          user?.subscriptionStatus === 'active' 
                            ? 'bg-green-500' 
                            : user?.subscriptionStatus === 'canceled' 
                              ? 'bg-yellow-500' 
                              : 'bg-gray-500'
                        }`}></span>
                        <p className="text-sm capitalize">
                          {user?.subscriptionStatus || 'Active'}
                        </p>
                      </div>
                    </div>

                    {user?.subscriptionPeriodEnd && (
                      <div>
                        <h3 className="text-sm font-medium">
                          {user?.subscriptionStatus === 'canceled' 
                            ? 'Access Until' 
                            : 'Next Billing Date'}
                        </h3>
                        <p className="text-sm mt-1">
                          {new Date(user.subscriptionPeriodEnd).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium">AI Credits</h3>
                      <p className="text-sm mt-1">
                        {user?.subscriptionTier === 'premium' ? '100 credits/month' : '5 credits/month'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium">Premium Features</h3>
                      <p className="text-sm mt-1">
                        {user?.subscriptionTier === 'premium' ? 'Full Access' : 'Restricted'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col space-y-2">
                    {user?.subscriptionTier === 'premium' ? (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => window.location.href = '/subscription'}
                          className="w-full"
                        >
                          Manage Subscription
                        </Button>
                        {user?.subscriptionStatus !== 'canceled' && (
                          <p className="text-xs text-center text-muted-foreground">
                            You can cancel anytime from the subscription management page
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="default"
                          onClick={() => window.location.href = '/pricing'}
                          className="w-full"
                        >
                          Upgrade to Premium
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          Get full access to all AI career tools and insights
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    <div className="flex flex-col space-y-3">
                      <div className="w-full border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate flex-1 mr-2">
                          {uploadedResume ? truncateFilename(uploadedResume.name, 25) : 'No file selected'}
                        </span>
                        <Button 
                          onClick={handleChooseFile}
                          variant="outline" 
                          size="sm"
                          className="flex-shrink-0 ml-auto"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Browse
                        </Button>
                      </div>
                      <Button 
                        onClick={handleResumeUpload}
                        disabled={!uploadedResume || uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing Resume...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload & Analyze
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
      </PageWrapper>

      <Footer2 />
    </div>
  );
};

export default ProfilePage;