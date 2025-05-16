import { db } from './db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';

export interface SubscriptionData {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  subscriptionPeriodEnd?: Date | null;
  aiCreditsRemaining?: number | null;
}

export interface SubscriptionFeatures {
  vulnerabilityAssessment: boolean;
  basicInsights: boolean;
  careerMigration: boolean;
  careerSimulation: boolean;
  advancedInsights: boolean;
  aiCreditsPerMonth: number;
}

export interface SubscriptionPlan {
  tier: 'free' | 'premium';
  status: string;
  currentPeriodEnd?: Date;
  stripeStatus?: string;
  features: SubscriptionFeatures;
}

// Feature access by subscription tier
const SUBSCRIPTION_TIERS = {
  free: {
    vulnerabilityAssessment: true,
    basicInsights: true,
    careerMigration: false,
    careerSimulation: false,
    advancedInsights: false,
    aiCreditsPerMonth: 5
  },
  premium: {
    vulnerabilityAssessment: true,
    basicInsights: true,
    careerMigration: true,
    careerSimulation: true,
    advancedInsights: true,
    aiCreditsPerMonth: 100
  }
};

export async function updateUserSubscription(userId: string, data: SubscriptionData) {
  try {
    // Update the user's subscription data
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
      
    // If upgrading to premium, reset AI credits to premium level
    if (data.subscriptionTier === 'premium' && data.subscriptionStatus === 'active') {
      await db.update(users)
        .set({ aiCreditsRemaining: SUBSCRIPTION_TIERS.premium.aiCreditsPerMonth })
        .where(eq(users.id, userId));
    }
    
    // If downgrading to free, cap AI credits at free tier level
    if (data.subscriptionTier === 'free') {
      await db.update(users)
        .set({ aiCreditsRemaining: SUBSCRIPTION_TIERS.free.aiCreditsPerMonth })
        .where(eq(users.id, userId));
    }
      
    return updatedUser;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

export async function getUserByStripeCustomerId(customerId: string) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId));
      
    return user;
  } catch (error) {
    console.error('Error getting user by Stripe customer ID:', error);
    throw error;
  }
}

export async function getSubscriptionDetails(userId: string) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
      
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionStatus: user.subscriptionStatus || 'free',
      subscriptionTier: user.subscriptionTier || 'free',
      subscriptionPeriodEnd: user.subscriptionPeriodEnd,
      aiCreditsRemaining: user.aiCreditsRemaining || 
        (user.subscriptionTier === 'premium' ? SUBSCRIPTION_TIERS.premium.aiCreditsPerMonth : SUBSCRIPTION_TIERS.free.aiCreditsPerMonth)
    };
  } catch (error) {
    console.error('Error getting subscription details:', error);
    throw error;
  }
}

// Check if user has access to a particular feature based on their subscription
export async function hasFeatureAccess(userId: string, featureName: keyof SubscriptionFeatures): Promise<boolean> {
  try {
    const user = await getSubscriptionDetails(userId);
    
    if (!user) return false;
    
    // Default to free tier features
    const tier = user.subscriptionTier as 'free' | 'premium' || 'free';
    const isActive = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
    
    // If premium user with active subscription, check premium features
    if (tier === 'premium' && isActive) {
      return SUBSCRIPTION_TIERS.premium[featureName] === true;
    }
    
    // Otherwise use free tier features
    return SUBSCRIPTION_TIERS.free[featureName] === true;
  } catch (error) {
    console.error(`Error checking feature access for ${featureName}:`, error);
    return false;
  }
}

// Get AI credits remaining for a user
export async function getAICreditsRemaining(userId: string): Promise<number> {
  try {
    const user = await getSubscriptionDetails(userId);
    
    if (!user) return 0;
    
    // If aiCreditsRemaining is null, default to tier-appropriate value
    return user.aiCreditsRemaining ?? 
      (user.subscriptionTier === 'premium' ? SUBSCRIPTION_TIERS.premium.aiCreditsPerMonth : SUBSCRIPTION_TIERS.free.aiCreditsPerMonth);
  } catch (error) {
    console.error('Error getting AI credits remaining:', error);
    return 0;
  }
}

// Consume AI credits when user performs AI-intensive actions
export async function consumeAICredits(userId: string, amount: number = 1): Promise<boolean> {
  try {
    const creditsRemaining = await getAICreditsRemaining(userId);
    
    if (creditsRemaining < amount) {
      return false; // Not enough credits
    }
    
    // Update remaining credits
    await db.update(users)
      .set({ aiCreditsRemaining: creditsRemaining - amount })
      .where(eq(users.id, userId));
      
    return true;
  } catch (error) {
    console.error('Error consuming AI credits:', error);
    return false;
  }
}