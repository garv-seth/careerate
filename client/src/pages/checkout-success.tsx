import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRouter } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function CheckoutSuccessPage() {
  const { user } = useAuth();
  const [_, navigate] = useRouter();
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Extract session_id from URL parameters if present
  const params = new URLSearchParams(location.split("?")[1]);
  const sessionId = params.get("session_id");
  
  // Fetch checkout session data if we have a session ID
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['/api/checkout/session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await fetch(`/api/checkout/session?session_id=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch checkout session');
      return response.json();
    },
    enabled: !!sessionId,
  });
  
  useEffect(() => {
    if (sessionData && sessionData.success) {
      toast({
        title: "Subscription activated!",
        description: "Thank you for subscribing to Careerate Premium.",
      });
    }
  }, [sessionData, toast]);
  
  return (
    <div className="container max-w-6xl mx-auto py-12 px-4 md:px-6">
      <div className="bg-card rounded-lg shadow-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-3 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Thank you for subscribing to Careerate Premium. Your account has been upgraded
          and you now have access to all premium features.
        </p>
        
        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 items-center">
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full max-w-xs"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/subscription")}
              className="w-full max-w-xs"
            >
              View Subscription Details
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}