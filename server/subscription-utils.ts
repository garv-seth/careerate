import { db } from './db';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';

export interface SubscriptionData {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  subscriptionPeriodEnd?: Date | null;
}

export async function updateUserSubscription(userId: string, data: SubscriptionData) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
      
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
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionStatus: user.subscriptionStatus || 'free',
      subscriptionTier: user.subscriptionTier || 'free',
      subscriptionPeriodEnd: user.subscriptionPeriodEnd
    };
  } catch (error) {
    console.error('Error getting subscription details:', error);
    throw error;
  }
}