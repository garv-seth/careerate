import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircleIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

const SubscriptionSuccessPage = () => {
  const [location, setLocation] = useLocation();
  const { subscription, refreshSubscription } = useSubscription();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Refresh subscription data to get the latest status
    refreshSubscription();
    
    // Trigger confetti celebration
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      // Launch a few confetti from the top edge
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#4f46e5', '#10b981', '#f59e0b']
      });
      
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#4f46e5', '#10b981', '#f59e0b']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    frame();

    // Auto-redirect to dashboard after countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container max-w-4xl py-16 flex items-center justify-center">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircleIcon className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl">Subscription Successful!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Thank you for upgrading to Careerate Premium
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-100 rounded-md p-6">
            <h3 className="text-xl font-medium text-green-800 mb-2">Your premium benefits are now active</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>Advanced AI Vulnerability Assessment</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>Career Migration Paths to explore new opportunities</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>Advanced Career Simulations</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>Comprehensive Market Insights</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                <span>100 AI Credits per month</span>
              </li>
            </ul>
          </div>
          
          <div className="text-center">
            <p className="text-gray-600">
              Redirecting to your dashboard in {countdown} seconds...
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center space-x-4">
          <Button asChild variant="outline">
            <Link href="/subscription">
              Manage Subscription
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SubscriptionSuccessPage;