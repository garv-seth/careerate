import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckIcon, 
  XIcon, 
  CreditCardIcon, 
  CrownIcon, 
  SparklesIcon 
} from 'lucide-react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { useSubscription } from '@/hooks/useSubscription';

// Make sure to call loadStripe outside of a component's render to avoid recreating the Stripe object on every render
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const formatDate = (date: Date | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const CheckoutForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Stripe has not yet loaded. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/subscription-success`,
      },
      redirect: 'if_required'
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsSubmitting(false);
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your subscription!",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isSubmitting} 
        className="w-full"
      >
        {isSubmitting ? "Processing..." : "Subscribe Now"}
      </Button>
    </form>
  );
};

const SubscriptionPage = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { 
    subscription, 
    isLoading: subscriptionLoading, 
    isPremium, 
    refreshSubscription 
  } = useSubscription();
  const { toast } = useToast();

  const { data: clientSecret, isLoading: secretLoading } = useQuery({
    queryKey: ['/api/create-subscription'],
    enabled: showPaymentForm && !isPremium,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/create-subscription');
      const data = await response.json();
      return data.clientSecret;
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/cancel-subscription');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will remain active until the end of the current billing period.",
      });
      refreshSubscription();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive"
      });
    }
  });

  const handleSubscribe = () => {
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    refreshSubscription();
  };

  const handleCancelSubscription = () => {
    if (confirm("Are you sure you want to cancel your premium subscription?")) {
      cancelMutation.mutate();
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Subscription Plans</h1>
      
      {subscription.status === 'canceled' && subscription.currentPeriodEnd && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6">
          <p className="text-yellow-800">
            Your subscription has been canceled and will end on {formatDate(subscription.currentPeriodEnd)}.
            Until then, you'll still have access to all premium features.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <Card className={`${subscription.tier === 'free' && subscription.status === 'active' ? 'border-primary' : ''}`}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Free Plan</CardTitle>
              {subscription.tier === 'free' && subscription.status === 'active' && (
                <Badge variant="outline" className="bg-primary/10 text-primary">Current Plan</Badge>
              )}
            </div>
            <CardDescription>Basic career tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">$0 <span className="text-sm font-normal text-muted-foreground">/ month</span></div>
            
            <ul className="space-y-2">
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                <span>Basic AI Vulnerability Assessment</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                <span>Basic Career Insights</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                <span>5 AI Credits per Month</span>
              </li>
              <li className="flex items-center">
                <XIcon className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-muted-foreground">Career Migration Paths</span>
              </li>
              <li className="flex items-center">
                <XIcon className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-muted-foreground">Advanced Career Simulations</span>
              </li>
              <li className="flex items-center">
                <XIcon className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-muted-foreground">Advanced Market Insights</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {!isPremium ? (
              <p className="text-muted-foreground w-full text-center">Current plan</p>
            ) : (
              <Button variant="outline" className="w-full" onClick={handleCancelSubscription} disabled={cancelMutation.isPending || subscription.status === 'canceled'}>
                {cancelMutation.isPending ? "Processing..." : "Downgrade to Free"}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className={`${isPremium ? 'border-primary' : ''}`}>
          <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CrownIcon className="w-5 h-5 text-yellow-500 mr-2" />
                <CardTitle>Premium Plan</CardTitle>
              </div>
              {isPremium && (
                <Badge variant="outline" className="bg-primary/10 text-primary">Current Plan</Badge>
              )}
            </div>
            <CardDescription>Full access to all features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="text-3xl font-bold">$19.99 <span className="text-sm font-normal text-muted-foreground">/ month</span></div>
            
            <ul className="space-y-2">
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                <span>Advanced AI Vulnerability Assessment</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                <span>Full Career Insights</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                <span>Career Migration Paths</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                <span>Advanced Career Simulations</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                <span>Comprehensive Market Insights</span>
              </li>
              <li className="flex items-center">
                <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                <span>100 AI Credits per Month</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {isPremium ? (
              <p className="text-muted-foreground w-full text-center">
                {subscription.currentPeriodEnd 
                  ? `Renewal date: ${formatDate(subscription.currentPeriodEnd)}` 
                  : 'Current plan'}
              </p>
            ) : (
              showPaymentForm && clientSecret ? (
                <div className="w-full">
                  <Button 
                    variant="outline" 
                    className="mb-4 w-full" 
                    onClick={() => setShowPaymentForm(false)}
                  >
                    Cancel
                  </Button>
                  <Elements 
                    stripe={stripePromise} 
                    options={{ clientSecret, appearance: { theme: 'stripe' } }}
                  >
                    <CheckoutForm onSuccess={handlePaymentSuccess} />
                  </Elements>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={handleSubscribe}
                  disabled={secretLoading}
                >
                  {secretLoading ? (
                    <>
                      <span className="mr-2">Loading</span>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </>
                  )}
                </Button>
              )
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Plan Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted border-b">
                <th className="text-left p-3">Feature</th>
                <th className="text-center p-3">Free Plan</th>
                <th className="text-center p-3">Premium Plan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 font-medium">AI Vulnerability Assessment</td>
                <td className="text-center p-3">Basic</td>
                <td className="text-center p-3">Advanced</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">Career Insights</td>
                <td className="text-center p-3">Basic</td>
                <td className="text-center p-3">Comprehensive</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">Career Migration Paths</td>
                <td className="text-center p-3"><XIcon className="w-5 h-5 text-red-500 mx-auto" /></td>
                <td className="text-center p-3"><CheckIcon className="w-5 h-5 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">Career Simulations</td>
                <td className="text-center p-3"><XIcon className="w-5 h-5 text-red-500 mx-auto" /></td>
                <td className="text-center p-3"><CheckIcon className="w-5 h-5 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">Market Insights</td>
                <td className="text-center p-3">Limited</td>
                <td className="text-center p-3">Full Access</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">AI Credits per Month</td>
                <td className="text-center p-3">5</td>
                <td className="text-center p-3">100</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;