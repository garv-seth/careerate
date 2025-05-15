import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import TubelightNavbar from '@/components/ui/tubelight-navbar';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Load Stripe outside of components
let stripePromise: Promise<any> | null = null;
if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
}

// SignupForm component
const SignupForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/dashboard',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: "Your premium subscription is now active!",
        });
        
        // After successful payment, redirect to login for authentication
        setTimeout(() => {
          login('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      toast({
        title: "An error occurred",
        description: err.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginInstead = () => {
    login('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <div className="flex flex-col space-y-3">
        <Button 
          type="submit" 
          disabled={!stripe || isLoading} 
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Sign Up with Premium ($20/month)'
          )}
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleLoginInstead}
          className="w-full"
        >
          Login with Free Tier
        </Button>
      </div>
    </form>
  );
};

// Main SignupPage component
const SignupPage = () => {
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Create a subscription intent as soon as the page loads
    fetch('/api/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId: 'premium', // This would be your actual price ID from Stripe
      }),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to create subscription');
        }
        return res.json();
      })
      .then(data => {
        setClientSecret(data.clientSecret);
      })
      .catch(err => {
        toast({
          title: "Error",
          description: "Failed to initialize subscription. Please try again.",
          variant: "destructive",
        });
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toast]);

  return (
    <div className="min-h-screen bg-slate-50">
      <TubelightNavbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Sign Up for Careerate</CardTitle>
              <CardDescription>
                Unlock premium features with your subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SignupForm />
                </Elements>
              ) : (
                <div className="text-center py-6 text-red-500">
                  Failed to initialize payment system. Please try again later.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <p className="text-sm text-center text-muted-foreground">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;