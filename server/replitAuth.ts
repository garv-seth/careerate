import passport from "passport";
import session from "express-session";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import connectPg from "connect-pg-simple";

// Define session setup function
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "developmentsecret", // You should set SESSION_SECRET in production
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

// Main auth setup function
export async function setupReplitAuth(app: Express) {
  console.log("Setting up Auth...");

  // Configure passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport serialization
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  // Setup reliable development auth that doesn't depend on external services
  console.log("Setting up reliable development auth...");
  
  // Login endpoint - automatically logs in with demo account
  app.get("/api/login", (req, res) => {
    // Create a demo user account
    const demoUser = {
      id: "demo_user_123",
      username: "demouser",
      name: "Demo User",
      email: "demo@example.com",
      claims: {
        sub: "demo_user_123",
        username: "demouser",
        email: "demo@example.com",
      }
    };
    
    // Log in the demo user
    req.login(demoUser, (err) => {
      if (err) {
        console.error("Error logging in:", err);
        return res.redirect('/');
      }
      
      // In production, this would properly authenticate with Replit
      // For now, redirect to dashboard after successful login
      console.log("Demo user logged in successfully");
      return res.redirect('/dashboard');
    });
  });

  // Mock callback endpoint that would normally receive the OAuth code
  app.get("/api/callback", (req, res) => {
    // In a real implementation, this would exchange the code for tokens
    res.redirect('/dashboard');
  });

  // Logout route
  app.get("/api/logout", (req: any, res) => {
    if (req.logout) {
      req.logout(() => {
        res.redirect('/');
      });
    } else {
      req.session.destroy(() => {
        res.redirect('/');
      });
    }
  });

  // User data endpoint
  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      // Return the user from the session
      res.json(req.user);
    } catch (error) {
      console.error("Error in /api/auth/user:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  console.log("Auth setup complete!");
}

// Authentication middleware
export const isAuthenticated = (req: any, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};