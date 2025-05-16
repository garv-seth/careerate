
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
