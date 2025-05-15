import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Check, X, AlertTriangle, Lock } from 'lucide-react';

// Always load Stripe outside of components
let stripePromise: Promise<any> | null = null;
if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
}

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subscribing, setSubscribing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  const {
    subscription,
    isLoading,
    createSubscription,
    cancelSubscription,
    isPremium,
    isCanceling,
  } = useSubscription();
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate('/');
      toast({
        title: "Authentication Required",
        description: "Please log in to manage your subscription.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, authLoading, navigate, toast]);
  
  const handleSubscribe = async () => {
    if (!stripePromise) {
      toast({
        title: "Error",
        description: "Payment system is not available at the moment.",
        variant: "destructive",
      });
      return;
    }
    
    setSubscribing(true);
    try {
      // Call the API to create a subscription
      createSubscription();
      
      // The subscription endpoint will redirect to Stripe or return success
      toast({
        title: "Processing Subscription",
        description: "Please complete the payment process if redirected.",
      });
      
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Subscription Error",
        description: "There was a problem processing your subscription.",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };
  
  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">Choose the plan that fits your career growth needs</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <Card className={`border-2 ${subscription?.tier === 'free' ? 'border-primary' : 'border-border'}`}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Free Plan
              {subscription?.tier === 'free' && (
                <Badge variant="outline" className="ml-2 bg-primary/10">Current Plan</Badge>
              )}
            </CardTitle>
            <CardDescription>Basic AI career vulnerability assessment</CardDescription>
            <div className="mt-2 text-2xl font-bold">$0 <span className="text-sm font-normal text-muted-foreground">/month</span></div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Check size={18} className="mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Basic vulnerability assessment</span>
              </li>
              <li className="flex items-start">
                <Check size={18} className="mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                <span>5 AI credits per month</span>
              </li>
              <li className="flex items-start">
                <X size={18} className="mr-2 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Career migration pathways</span>
              </li>
              <li className="flex items-start">
                <X size={18} className="mr-2 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Career simulations</span>
              </li>
              <li className="flex items-start">
                <X size={18} className="mr-2 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Advanced AI insights</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {subscription?.tier === 'free' ? (
              <Button className="w-full" disabled variant="outline">Current Plan</Button>
            ) : (
              <Button className="w-full" variant="outline" disabled={subscription?.status === 'canceled'}>
                Free Plan
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Premium Plan */}
        <Card className={`border-2 ${subscription?.tier === 'premium' && subscription?.status !== 'canceled' ? 'border-primary' : 'border-border'}`}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Premium Plan
              {subscription?.tier === 'premium' && (
                <Badge variant="outline" className="ml-2 bg-primary/10">
                  {subscription.status === 'canceled' ? 'Canceling' : 'Current Plan'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Full access to all AI career tools</CardDescription>
            <div className="mt-2 text-2xl font-bold">$25 <span className="text-sm font-normal text-muted-foreground">/month</span></div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Check size={18} className="mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Advanced vulnerability assessment</span>
              </li>
              <li className="flex items-start">
                <Check size={18} className="mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                <span>100 AI credits per month</span>
              </li>
              <li className="flex items-start">
                <Check size={18} className="mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Career migration pathways</span>
              </li>
              <li className="flex items-start">
                <Check size={18} className="mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Career simulations with timepoints</span>
              </li>
              <li className="flex items-start">
                <Check size={18} className="mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Advanced AI insights and recommendations</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {subscription?.tier === 'premium' ? (
              subscription.status === 'canceled' ? (
                <div className="w-full space-y-2">
                  <Button className="w-full" variant="outline" disabled>
                    Canceling
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Access until {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="outline">Cancel Subscription</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your premium access will continue until the end of your current billing period. You will lose access to premium features after that.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancelSubscription()} disabled={isCanceling}>
                        {isCanceling ? 'Canceling...' : 'Yes, Cancel'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )
            ) : (
              <Button 
                className="w-full" 
                onClick={handleSubscribe} 
                disabled={subscribing}
              >
                {subscribing ? 'Processing...' : 'Upgrade to Premium'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {/* Subscription Info Section */}
      {subscription && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-medium">{subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium flex items-center">
                    {subscription.status === 'active' ? (
                      <>
                        <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                        Active
                      </>
                    ) : subscription.status === 'canceled' ? (
                      <>
                        <span className="h-2 w-2 bg-yellow-500 rounded-full mr-2"></span>
                        Canceling
                      </>
                    ) : subscription.status === 'past_due' ? (
                      <>
                        <span className="h-2 w-2 bg-red-500 rounded-full mr-2"></span>
                        Past Due
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 bg-gray-500 rounded-full mr-2"></span>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </>
                    )}
                  </p>
                </div>
                {subscription.currentPeriodEnd && (
                  <div>
                    <p className="text-sm text-muted-foreground">Current Period Ends</p>
                    <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">AI Credits Available</p>
                  <p className="font-medium">{subscription.features.aiCreditsPerMonth} per month</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Feature Access Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Features Access</CardTitle>
          <CardDescription>What you can currently access with your plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${subscription?.features.vulnerabilityAssessment ? 'bg-primary/5' : 'bg-muted/20'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">Vulnerability Assessment</h3>
                  {subscription?.features.vulnerabilityAssessment ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/10">Accessible</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground"><Lock size={12} className="mr-1" /> Locked</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Assess your career's vulnerability to AI disruption</p>
              </div>
              
              <div className={`p-4 rounded-lg border ${subscription?.features.careerMigration ? 'bg-primary/5' : 'bg-muted/20'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">Career Migration</h3>
                  {subscription?.features.careerMigration ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/10">Accessible</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground"><Lock size={12} className="mr-1" /> Premium</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Explore alternative career paths based on your skills</p>
              </div>
              
              <div className={`p-4 rounded-lg border ${subscription?.features.careerSimulation ? 'bg-primary/5' : 'bg-muted/20'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">Career Simulation</h3>
                  {subscription?.features.careerSimulation ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/10">Accessible</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground"><Lock size={12} className="mr-1" /> Premium</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Simulate career transitions with timepoint analysis</p>
              </div>
              
              <div className={`p-4 rounded-lg border ${subscription?.features.advancedInsights ? 'bg-primary/5' : 'bg-muted/20'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">Advanced Insights</h3>
                  {subscription?.features.advancedInsights ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/10">Accessible</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground"><Lock size={12} className="mr-1" /> Premium</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Get detailed insights and personalized recommendations</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPage;