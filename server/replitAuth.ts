import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { Strategy as BearerStrategy } from 'passport-http-bearer';

// Hardcoded URLs as requested
const REPLIT_DOMAIN = 'bfd824a8-80f1-45b8-9c48-fc95b77a9105-00-14k8dzmk8x22u.riker.replit.dev';
const PRODUCTION_DOMAIN = 'gocareerate.com';

// Session configuration
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
    secret: process.env.SESSION_SECRET || "developmentsecret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false to work in both HTTP and HTTPS
      maxAge: sessionTtl,
      sameSite: "lax"
    },
  });
}

// Authentication setup
export async function setupAuth(app: Express) {
  console.log("Setting up authentication...");
  
  // Setup basic middleware
  app.set("trust proxy", true);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Simple serialization/deserialization that won't cause loops
  passport.serializeUser((user: any, done) => {
    const serializedUser = {
      id: user.id || "demo_user",
      username: user.username || "demo_user",
      email: user.email || "demo@example.com",
      exp: user.exp || (Math.floor(Date.now() / 1000) + 3600) // 1 hour expiration
    };
    console.log("Serializing user:", serializedUser.username);
    done(null, serializedUser);
  });
  
  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
  
  try {
    // Determine current domain
    const currentDomain = process.env.NODE_ENV === 'production' ? PRODUCTION_DOMAIN : REPLIT_DOMAIN;
    console.log("Using domain:", currentDomain);
    
    // Direct login route without OAuth
    app.get("/api/login", (req, res) => {
      console.log("Login route accessed");
      
      // Store returnTo path if provided
      if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo as string;
        console.log("Setting returnTo:", req.session.returnTo);
      }
      
      // Create a user with minimal info needed
      const user = {
        id: "demo_user",
        username: "demo_user",
        name: "Demo User",
        email: "demo@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.redirect("/?error=login_failed");
        }
        
        console.log("User logged in successfully");
        
        // Redirect to intended destination or dashboard
        const returnTo = req.session.returnTo || "/dashboard";
        delete req.session.returnTo;
        
        console.log("Redirecting to:", returnTo);
        return res.redirect(returnTo);
      });
    });
    
    // Callback route (not really needed but maintained for compatibility)
    app.get("/api/callback", (req, res) => {
      console.log("Callback route accessed");
      const returnTo = req.session.returnTo || "/dashboard";
      delete req.session.returnTo;
      console.log("Redirecting to:", returnTo);
      res.redirect(returnTo);
    });
    
    // Logout route
    app.get("/api/logout", (req: any, res) => {
      console.log("Logout route accessed");
      const returnTo = req.query.returnTo || "/";
      
      req.logout(() => {
        console.log("User logged out, redirecting to:", returnTo);
        res.redirect(returnTo as string);
      });
    });
    
    // User profile endpoint
    app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
      console.log("User info requested");
      try {
        // For now, just return the user from the session
        // Augment with more user info
        const enrichedUser = {
          ...req.user,
          profileImageUrl: "https://ui-avatars.com/api/?name=Demo+User&background=random"
        };
        res.json(enrichedUser);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user information" });
      }
    });
    
    console.log("Authentication setup complete!");
  } catch (error) {
    console.error("Failed to set up Auth:", error);
    throw error;
  }
}

// Authentication middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  console.log("Checking if request is authenticated");
  
  if (!req.isAuthenticated()) {
    console.log("Request is not authenticated");
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // Check token expiration if we have it
  if (req.user && (req.user as any).exp) {
    const now = Math.floor(Date.now() / 1000);
    const expiration = (req.user as any).exp;
    
    console.log(`Token expiration check: now=${now}, expires=${expiration}, delta=${expiration - now}s`);
    
    if (now > expiration) {
      console.log("Token has expired");
      return res.status(401).json({ error: "Session expired" });
    }
  }
  
  console.log("Request is authenticated");
  return next();
};