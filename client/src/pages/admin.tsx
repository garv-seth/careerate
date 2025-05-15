import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';

const AdminPage = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const setPremiumMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/set-premium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId || undefined }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to set premium status');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setMessage({
        text: data.message || 'Premium status updated successfully',
        type: 'success'
      });
      toast({
        title: 'Success',
        description: 'Premium status updated successfully',
      });
    },
    onError: (error: Error) => {
      setMessage({
        text: error.message,
        type: 'error'
      });
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Check if user is authorized for admin
  const isAuthorized = user?.email === 'garv.seth@gmail.com';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TubelightNavbar />
        
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldAlert className="h-6 w-6 mr-2 text-red-500" />
                Access Denied
              </CardTitle>
              <CardDescription>
                This area is restricted to authorized administrators only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You do not have permission to access this page.
                Please contact an administrator if you believe this is an error.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => window.location.href = '/'} variant="secondary">
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TubelightNavbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Admin Controls</CardTitle>
              <CardDescription>
                Advanced administrative functions. Use with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">User Management</h2>
                  <Card className="mt-3">
                    <CardHeader>
                      <CardTitle className="text-lg">Set Premium Status</CardTitle>
                      <CardDescription>
                        Make a user premium without going through the Stripe payment process.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="user-id">User ID</Label>
                          <div className="flex gap-3">
                            <Input 
                              id="user-id" 
                              placeholder="Enter user ID or leave blank for self" 
                              value={userId}
                              onChange={(e) => setUserId(e.target.value)}
                            />
                            <Button 
                              onClick={() => setPremiumMutation.mutate()}
                              disabled={setPremiumMutation.isPending}
                            >
                              {setPremiumMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                'Set Premium'
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Leave blank to set your own account as premium.
                          </p>
                        </div>
                        
                        {message && (
                          <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                            {message.type === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                              {message.text}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;