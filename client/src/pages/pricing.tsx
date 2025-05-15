import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import TubelightNavbar from '@/components/ui/tubelight-navbar';

const PricingPage = () => {
  const [, setLocation] = useLocation();
  const { isAuthenticated, login } = useAuth();

  const handleSubscribe = () => {
    // If already authenticated, go to subscription management
    if (isAuthenticated) {
      setLocation('/subscription');
    } else {
      // If not authenticated, direct to signup page with premium option
      setLocation('/signup');
    }
  };

  const handleStartFree = () => {
    // Free tier users just need to authenticate with Replit
    if (isAuthenticated) {
      setLocation('/dashboard');
    } else {
      login('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TubelightNavbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4">Transparent Pricing</h1>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
            Choose the plan that works best for you. Start with our free tier or unlock all features with our premium subscription.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Tier */}
            <Card className="relative border-2 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl">Free Tier</CardTitle>
                <CardDescription>Basic AI vulnerability assessment</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-gray-500 ml-2">Forever</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Basic vulnerability assessment</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Limited skill recommendations</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Career impact score</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Basic industry trends</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" onClick={handleStartFree}>
                  Start Free
                </Button>
              </CardFooter>
            </Card>
            
            {/* Premium Tier */}
            <Card className="relative border-2 border-primary overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 text-sm font-semibold">
                RECOMMENDED
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Premium</CardTitle>
                <CardDescription>Full access to all career tools</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$20</span>
                  <span className="text-gray-500 ml-2">per month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Advanced AI vulnerability assessment</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Detailed career migration pathways</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Career simulation with 5-year projections</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Personalized skill development plans</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Premium job market insights</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Salary negotiation tools</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Contract review assistance</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleSubscribe}>
                  Subscribe Now
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Enterprise Solutions</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              Looking for organization-wide career planning and AI readiness assessment? 
              Contact us for custom enterprise solutions.
            </p>
            <Button variant="outline">Contact Sales</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;