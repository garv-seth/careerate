import { Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { db } from "../db";
import { 
  users, 
  subscriptionPlans, 
  subscriptionTransactions, 
  usageTracking, 
  rateLimits 
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required Stripe secret key");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Premium plan price - $20 per month
const PREMIUM_PLAN_PRICE_ID = "price_premium_monthly"; // Replace with actual Stripe price ID when created

// Create or get a subscription for the user
export const getOrCreateSubscription = async (req: any, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = req.user;
    
    // Check if user already has a subscription
    if (user.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        status: subscription.status,
      });
      
      return;
    }
    
    // Create new customer if needed
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.username,
      });
      
      await storage.updateStripeCustomerId(user.id, customer.id);
      user.stripeCustomerId = customer.id;
    }
    
    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{
        price: PREMIUM_PLAN_PRICE_ID,
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      success_url: `${process.env.APP_URL || 'https://careerate.replit.app'}/checkout-success`,
      cancel_url: `${process.env.APP_URL || 'https://careerate.replit.app'}/subscription?canceled=true`,
    });
    
    // Update user with subscription info
    await storage.updateUserSubscription(user.id, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionTier: 'premium',
      subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
    
    // Return data needed for payment UI
    res.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      status: subscription.status,
    });
    
  } catch (error: any) {
    console.error("Subscription error:", error);
    res.status(400).json({ error: error.message });
  }
};

// Handle Stripe webhook events
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: "Missing signature or webhook secret" });
  }
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(subscription);
      break;
    }
    
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice);
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
      break;
    }
  }
  
  res.json({ received: true });
};

// Get user's subscription info
export const getUserSubscription = async (req: any, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  try {
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // If user has no subscription, return the default free plan info
    if (!user.stripeSubscriptionId) {
      return res.json({
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
      });
    }
    
    // Fetch subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    // Return subscription details
    res.json({
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      currentPeriodEnd: user.subscriptionPeriodEnd,
      stripeStatus: subscription.status,
      features: user.subscriptionTier === 'premium' ? {
        vulnerabilityAssessment: true,
        basicInsights: true,
        careerMigration: true,
        careerSimulation: true,
        advancedInsights: true,
        aiCreditsPerMonth: 100
      } : {
        vulnerabilityAssessment: true,
        basicInsights: true,
        careerMigration: false,
        careerSimulation: false,
        advancedInsights: false,
        aiCreditsPerMonth: 5
      }
    });
    
  } catch (error: any) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: error.message });
  }
};

// Cancel a subscription
export const cancelSubscription = async (req: any, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  try {
    const user = await storage.getUser(req.user.id);
    
    if (!user || !user.stripeSubscriptionId) {
      return res.status(404).json({ error: "No active subscription found" });
    }
    
    // Cancel at period end
    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    
    // Update user subscription status
    await storage.updateUserSubscription(user.id, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: 'canceled',
      subscriptionTier: user.subscriptionTier,
      subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
    
    res.json({
      status: 'canceling',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
    
  } catch (error: any) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper functions for webhook event handling
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find the user with this subscription
  const customerId = subscription.customer as string;
  const users = await stripe.customers.list({ email: customerId });
  
  if (!users.data.length) return;
  
  // Get subscription status and update user
  let status = subscription.status;
  let tier = 'free';
  
  // Check if this is premium tier
  const premiumItem = subscription.items.data.find(
    item => item.price.id === PREMIUM_PLAN_PRICE_ID
  );
  
  if (premiumItem) {
    tier = 'premium';
  }
  
  // For each of your customers with this subscription
  const stripeCustomer = users.data[0];
  const userQuery = await storage.getUserByStripeCustomerId(stripeCustomer.id);
  
  if (userQuery) {
    await storage.updateUserSubscription(userQuery.id, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      subscriptionTier: tier,
      subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  // Find the user with this subscription
  const customerId = subscription.customer as string;
  const users = await stripe.customers.list({ email: customerId });
  
  if (!users.data.length) return;
  
  // For each of your customers with this subscription
  const stripeCustomer = users.data[0];
  const userQuery = await storage.getUserByStripeCustomerId(stripeCustomer.id);
  
  if (userQuery) {
    await storage.updateUserSubscription(userQuery.id, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: 'canceled',
      subscriptionTier: 'free',
      subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  // Record payment in your database
  if (invoice.customer) {
    const userQuery = await storage.getUserByStripeCustomerId(invoice.customer as string);
    
    if (userQuery) {
      // Record the transaction
      await storage.createSubscriptionTransaction({
        userId: userQuery.id,
        amount: invoice.amount_paid,
        status: 'succeeded',
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent as string,
        metadata: {
          invoiceUrl: invoice.hosted_invoice_url,
          description: `Payment for ${invoice.lines.data.map(line => line.description).join(', ')}`
        }
      });
      
      // Update subscription to active
      await storage.updateUserSubscription(userQuery.id, {
        stripeSubscriptionId: invoice.subscription as string,
        subscriptionStatus: 'active',
        subscriptionTier: 'premium',
      });
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  if (invoice.customer) {
    const userQuery = await storage.getUserByStripeCustomerId(invoice.customer as string);
    
    if (userQuery) {
      // Record the failed transaction
      await storage.createSubscriptionTransaction({
        userId: userQuery.id,
        amount: invoice.amount_due,
        status: 'failed',
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent as string,
        metadata: {
          failureMessage: invoice.last_finalization_error?.message
        }
      });
      
      // Update subscription to past_due
      await storage.updateUserSubscription(userQuery.id, {
        stripeSubscriptionId: invoice.subscription as string,
        subscriptionStatus: 'past_due',
        subscriptionTier: 'premium',
      });
    }
  }
}

// Make specific user premium (admin function for garv.seth@gmail.com)
export const makeUserPremium = async (req: any, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // Only allow admin to do this (for now hardcoded to garv.seth@gmail.com)
  if (req.user.email !== 'garv.seth@gmail.com') {
    return res.status(403).json({ error: "Forbidden" });
  }
  
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Set 1 year premium subscription
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    await storage.updateUserSubscription(userId, {
      stripeSubscriptionId: 'admin_premium_' + Date.now(),
      subscriptionStatus: 'active',
      subscriptionTier: 'premium',
      subscriptionPeriodEnd: oneYearFromNow,
    });
    
    res.json({
      success: true,
      message: `User ${userId} is now premium until ${oneYearFromNow.toLocaleDateString()}`,
    });
    
  } catch (error: any) {
    console.error("Error making user premium:", error);
    res.status(500).json({ error: error.message });
  }
};

// Check if feature is accessible to user based on subscription
export const checkFeatureAccess = async (userId: string, feature: string): Promise<boolean> => {
  try {
    const user = await storage.getUser(userId);
    
    if (!user) return false;
    
    // Check if under rate limit
    const withinLimit = await storage.incrementUsage(userId, feature);
    if (!withinLimit) return false;
    
    // Free tier has access to basic features
    if (user.subscriptionTier === 'free') {
      switch (feature) {
        case 'vulnerability_assessment':
        case 'basic_insights':
          return true;
        default:
          return false;
      }
    }
    
    // Premium active tier has access to all features
    if (user.subscriptionTier === 'premium' && user.subscriptionStatus === 'active') {
      return true;
    }
    
    // Handle past_due still allowing access (grace period)
    if (user.subscriptionTier === 'premium' && user.subscriptionStatus === 'past_due') {
      // Allow 7-day grace period for past_due payments
      const now = new Date();
      if (user.updatedAt && now.getTime() - user.updatedAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking feature access:", error);
    return false;
  }
};

// Add a missing method to storage interface
interface ExtendedStorage {
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<any>;
}

// Add the method implementation
(storage as any).getUserByStripeCustomerId = async (stripeCustomerId: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId));
  return user;
};

// Add types for the database operations
import { 
  type User, 
  type SubscriptionPlan, 
  type SubscriptionTransaction, 
  type UsageTracking, 
  type RateLimit, 
  type InsertSubscriptionTransaction,
  type InsertUsageTracking,
  type InsertRateLimit
} from "@shared/schema";