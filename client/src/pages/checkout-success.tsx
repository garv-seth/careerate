
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';

const CheckoutSuccessPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Refresh subscription data
    queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
    
    // Show success toast
    toast({
      title: "Payment Successful",
      description: "Your premium subscription has been activated.",
    });
  }, [toast, queryClient]);
  
  return (
    <div className="container max-w-md py-12 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      
      <h1 className="text-2xl font-bold mb-2 text-center">Payment Successful!</h1>
      <p className="text-center text-muted-foreground mb-8">
        Thank you for subscribing to Careerate Premium. Your account has been upgraded and you now have access to all premium features.
      </p>
      
      <div className="flex flex-col gap-4 w-full">
        <Button onClick={() => navigate('/dashboard')} className="w-full">
          Go to Dashboard
        </Button>
        <Button onClick={() => navigate('/subscription')} variant="outline" className="w-full">
          View Subscription Details
        </Button>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CheckoutSuccessPage = () => {
  const [, setLocation] = useLocation();
  const { isAuthenticated, login } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [status, setStatus] = useState<'success' | 'processing' | 'error'>('processing');

  useEffect(() => {
    // Extract any query parameters that might contain payment info
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentIntent = urlParams.get('payment_intent');

    if (!sessionId && !paymentIntent) {
      setStatus('error');
      setIsProcessing(false);
      toast({
        title: "Invalid checkout session",
        description: "No session information found. Please try subscribing again.",
        variant: "destructive",
      });
      return;
    }

    // Verify the payment with the server
    const verifyPayment = async () => {
      try {
        const response = await fetch('/api/subscription/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            paymentIntent,
          }),
        });

        if (!response.ok) {
          throw new Error('Payment verification failed');
        }

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          toast({
            title: "Payment Successful",
            description: "Your premium subscription is now active!",
          });

          // If user is already authenticated, redirect to dashboard after a short delay
          if (isAuthenticated) {
            setTimeout(() => {
              setLocation('/dashboard');
            }, 3000);
          }
        } else {
          setStatus('error');
          toast({
            title: "Payment Verification Failed",
            description: data.message || "Please contact support if the problem persists.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
        toast({
          title: "Payment Verification Error",
          description: "An error occurred while verifying your payment. Please contact support.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    verifyPayment();
  }, [isAuthenticated, setLocation, toast]);

  const handleLoginAndRedirect = () => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    } else {
      login('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TubelightNavbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status === 'success' && <CheckCircle className="text-green-500" />}
                {status === 'processing' && <Loader2 className="animate-spin text-blue-500" />}
                {status === 'error' && <CheckCircle className="text-red-500" />}
                
                {status === 'success' && 'Payment Successful'}
                {status === 'processing' && 'Processing Payment'}
                {status === 'error' && 'Payment Error'}
              </CardTitle>
              <CardDescription>
                {status === 'success' && 'Your premium subscription is now active'}
                {status === 'processing' && 'Verifying your payment...'}
                {status === 'error' && 'There was an issue with your payment'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {status === 'success' && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-800 dark:text-green-200">
                      <p className="font-medium mb-1">Transaction Complete</p>
                      <p className="text-sm">Your premium subscription has been activated successfully. You now have full access to all features.</p>
                    </div>
                  )}
                  
                  {status === 'error' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
                      <p className="font-medium mb-1">Transaction Failed</p>
                      <p className="text-sm">We encountered an issue processing your payment. Please try again or contact support if the problem persists.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleLoginAndRedirect} 
                disabled={isProcessing}
                className="w-full"
              >
                {status === 'success' ? (
                  <>
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : status === 'error' ? (
                  'Try Again'
                ) : (
                  'Please wait...'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
