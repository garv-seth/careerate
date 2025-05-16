import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

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
  status: string;
  currentPeriodEnd?: Date;
  stripeStatus?: string;
  features: SubscriptionFeatures;
}

const defaultSubscription: SubscriptionDetails = {
  tier: 'free',
  status: 'active',
  features: {
    vulnerabilityAssessment: true,
    basicInsights: true,
    careerMigration: false,
    careerSimulation: false,
    advancedInsights: false,
    aiCreditsPerMonth: 5
  }
};

export function useSubscription() {
  const { data: subscription, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/subscription'],
    enabled: true,
    // Increase staletime to reduce API calls, but allow refetching when needed
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  const isPremium = subscription?.tier === 'premium' && 
    (subscription?.status === 'active' || subscription?.status === 'trialing');

  const hasFeature = (featureName: keyof SubscriptionFeatures) => {
    return subscription?.features?.[featureName] ?? defaultSubscription.features[featureName];
  };

  // Function to check if feature is premium-only
  const isPremiumFeature = (featureName: keyof SubscriptionFeatures) => {
    return !defaultSubscription.features[featureName] && hasFeature(featureName);
  };

  // For components that need to know how many AI credits remain
  const aiCreditsRemaining = subscription?.features?.aiCreditsPerMonth || 
    defaultSubscription.features.aiCreditsPerMonth;

  const refreshSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
  };

  return {
    subscription: subscription || defaultSubscription,
    isLoading,
    error,
    isPremium,
    hasFeature,
    isPremiumFeature,
    aiCreditsRemaining,
    refreshSubscription
  };
}