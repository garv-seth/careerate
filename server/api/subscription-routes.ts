import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import Stripe from 'stripe';
import { updateUserSubscription, getUserByStripeCustomerId, getSubscriptionDetails } from '../subscription-utils';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Price ID for the premium subscription
const PREMIUM_PRICE_ID = 'price_1OYJZPLkdIwHu7PZrv48s0RA'; // Replace with your actual price ID

const router = Router();

// Get subscription details for the current user
router.get('/subscription', isAuthenticated, async (req: any, res) => {
  try {
    const userDetails = await getSubscriptionDetails(req.user.id);
    
    if (!userDetails) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let subscriptionDetails = {
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
    
    // If user has a subscription, get details from Stripe
    if (userDetails.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(userDetails.stripeSubscriptionId);
        
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          subscriptionDetails = {
            tier: 'premium',
            status: subscription.status === 'active' ? 'active' : 'active',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            stripeStatus: subscription.status,
            features: {
              vulnerabilityAssessment: true,
              basicInsights: true,
              careerMigration: true,
              careerSimulation: true,
              advancedInsights: true,
              aiCreditsPerMonth: 100
            }
          };
        } else if (subscription.status === 'canceled' && subscription.cancel_at_period_end) {
          // Subscription is canceled but still active until the end of the period
          subscriptionDetails = {
            tier: 'premium',
            status: 'canceled',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            stripeStatus: subscription.status,
            features: {
              vulnerabilityAssessment: true,
              basicInsights: true,
              careerMigration: true,
              careerSimulation: true,
              advancedInsights: true,
              aiCreditsPerMonth: 100
            }
          };
        }
      } catch (error) {
        console.error('Error retrieving subscription from Stripe:', error);
        // Fall back to free tier if subscription retrieval fails
      }
    }
    
    res.json(subscriptionDetails);
  } catch (error: any) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new subscription for the current user
router.post('/create-subscription', isAuthenticated, async (req: any, res) => {
  try {
    const userDetails = await getSubscriptionDetails(req.user.id);
    
    if (!userDetails) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // If user already has a subscription
    if (userDetails.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(userDetails.stripeSubscriptionId);
      
      // If subscription is active, just return it
      if (subscription.status === 'active') {
        return res.json({
          subscriptionId: subscription.id,
          status: subscription.status,
        });
      }
      
      // If canceled but still in active period, reactivate
      if (subscription.status === 'canceled' && subscription.cancel_at_period_end) {
        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: false,
        });
        
        await updateUserSubscription(req.user.id, {
          subscriptionStatus: 'active',
        });
        
        return res.json({
          subscriptionId: updatedSubscription.id,
          status: updatedSubscription.status,
        });
      }
    }
    
    // Create or get customer
    let customerId = userDetails.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email || undefined,
        name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || undefined,
        metadata: {
          userId: req.user.id
        }
      });
      
      customerId = customer.id;
      await updateUserSubscription(req.user.id, { 
        stripeCustomerId: customerId 
      });
    }
    
    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: PREMIUM_PRICE_ID,
        },
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    
    // Update user with subscription data
    await updateUserSubscription(req.user.id, {
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
});

// Cancel the current user's subscription
router.post('/cancel-subscription', isAuthenticated, async (req: any, res) => {
  try {
    const userDetails = await getSubscriptionDetails(req.user.id);
    
    if (!userDetails) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!userDetails.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }
    
    // Cancel at period end
    const subscription = await stripe.subscriptions.update(userDetails.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    
    // Update user subscription status
    await updateUserSubscription(req.user.id, {
      subscriptionStatus: 'canceled',
    });
    
    res.json({ 
      success: true, 
      message: 'Subscription will be canceled at the end of the billing period',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    });
    
  } catch (error: any) {
    console.error("Cancellation error:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;