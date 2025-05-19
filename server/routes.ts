import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { uploadResume, getResume } from "./object-storage";
import onboardingRouter from "./api/onboarding";
import settingsRouter from './api/settings';
import careerServiceRouter, { initCareerServiceSockets } from './api/career-service';
import subscriptionRouter from './api/subscription-routes';
import { Server as SocketIOServer } from "socket.io";
import Stripe from 'stripe';


export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Replit authentication
  await setupAuth(app);

  // Apply API routes
  app.use('/api', onboardingRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api', careerServiceRouter);

  // Subscription routes
  app.use('/api', subscriptionRouter);

  // Stripe webhook - no auth needed as it comes from Stripe
  app.post('/api/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).send('Stripe is not configured');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    });

    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      if (!endpointSecret) {
        // For simplicity, we'll just log the event in development
        console.log('Webhook received:', req.body);
        return res.send({ received: true });
      }

      // Verify the event came from Stripe
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        endpointSecret
      );

      // Handle specific events
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription;

          // Update user's subscription status in your database
          // This is a simplified example - you'd need to look up the user by their Stripe customer ID
          console.log(`Subscription ${subscription.id} was ${event.type}`);
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          console.log(`Subscription ${deletedSubscription.id} was canceled`);
          break;
      }

      res.send({ received: true });
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Development routes - only available in development
  if (process.env.NODE_ENV === "development") {
    // Add a proper redirect route instead of /auth-test
    app.get('/auth-test', (req, res) => {
      // Redirect to dashboard instead
      res.redirect('/dashboard');
    });
  }

  // User profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfileByUserId(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Resume upload routes (redirects to the main onboarding upload endpoint)
  app.post('/api/resume/upload', isAuthenticated, async (req: any, res) => {
    try {
      // This is a legacy endpoint - redirect users to use the main onboarding endpoint
      console.log("Legacy resume upload endpoint hit - redirecting to main endpoint");
      
      // Return a special response informing client to use the correct endpoint
      return res.status(410).json({ 
        message: "This endpoint is deprecated. Please use /api/onboarding/upload-resume instead.",
        redirectTo: "/api/onboarding/upload-resume" 
      });
    } catch (error) {
      console.error("Error in upload route handler:", error);
      res.status(500).json({ message: "Failed to process resume upload" });
    }
  });

  // Get resume
  app.get('/api/resume', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resume = await getResume(userId);
      res.json({ resumeText: resume });
    } catch (error) {
      console.error("Error fetching resume:", error);
      res.status(500).json({ message: "Failed to fetch resume" });
    }
  });

  // Set up socket.io for real-time communication with the career service
  const server = createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Allow all origins in development
      methods: ["GET", "POST"]
    }
  });

  // Initialize the career service socket handlers
  initCareerServiceSockets(io);

  return server;
}