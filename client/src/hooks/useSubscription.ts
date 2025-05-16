import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionFeatures {
  vulnerabilityAssessment: boolean;
  basicInsights: boolean;
  careerMigration: boolean;
  careerSimulation: boolean;
  advancedInsights: boolean;
  aiCreditsPerMonth: number;
}

export interface SubscriptionDetails {
  tier: 'free' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodEnd?: Date;
  stripeStatus?: string;
  features: SubscriptionFeatures;
}

export const useSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current subscription details
  const { data: subscription, isLoading, error } = useQuery<SubscriptionDetails>({
    queryKey: ['/api/subscription'],
    refetchOnWindowFocus: false,
  });

  // Create or manage subscription
  const { mutate: createSubscription, isPending: isCreatingSubscription } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/create-subscription');
      return response.json();
    },
    onSuccess: (data) => {
      // If no client secret is returned, refresh the data (internal subscription activation)
      if (!data.clientSecret) {
        // Refresh subscription data
        queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
        toast({
          title: 'Subscription Started',
          description: 'Your premium subscription is now active.',
        });
      }
      
      return data;
    },
    onError: (error: any) => {
      toast({
        title: 'Subscription Error',
        description: error.message || 'Failed to create subscription',
        variant: 'destructive',
      });
    },
  });

  // Cancel subscription
  const { mutate: cancelSubscription, isPending: isCanceling } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/cancel-subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      toast({
        title: 'Subscription Canceled',
        description: 'Your premium subscription will be canceled at the end of your billing period.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Cancellation Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    },
  });

  // Make a specific user premium (admin function)
  const { mutate: makeUserPremium, isPending: isMakingPremium } = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', '/api/admin/make-premium', { userId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'User Made Premium',
        description: data.message || 'User has been given premium access.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Admin Action Failed',
        description: error.message || 'Failed to make user premium',
        variant: 'destructive',
      });
    },
  });

  // Helper function to check if user can access a feature based on subscription
  const canAccessFeature = (featureName: keyof SubscriptionFeatures): boolean => {
    if (!subscription) return false;
    return subscription.features[featureName] === true;
  };

  // Return all subscription-related functions and data
  return {
    subscription,
    isLoading,
    error,
    createSubscription,
    cancelSubscription,
    makeUserPremium,
    isCreatingSubscription,
    isCanceling,
    isMakingPremium,
    canAccessFeature,
    isPremium: subscription?.tier === 'premium' && subscription?.status === 'active',
  };
};