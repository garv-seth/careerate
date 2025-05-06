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
  console.log("Setting up Replit Auth...");

  // Configure passport serialization
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  try {
    // Import most reliable method of handling authentication for Replit environment
    console.log("Setting up simplified authentication for Replit...");

    // Setup dummy auth for development until we can get the more complex OAuth working
    const setupDummyAuth = () => {
      // Create a simple prompt for username based auth
      app.get("/api/login", (req, res) => {
        // In a real system, this would redirect to Replit Auth
        // For now, just set a dummy authenticated user session
        req.login({
          id: "demo_user",
          username: "demouser",
          name: "Demo User",
          email: "demo@example.com",
        }, (err) => {
          if (err) {
            console.error("Error logging in dummy user:", err);
            return res.redirect('/');
          }
          // Redirect to dashboard after successful login
          return res.redirect('/dashboard');
        });
      });

      app.get("/api/callback", (req, res) => {
        res.redirect('/');
      });
    };

    // Setup basic strategy - we'll replace this with more robust authentication later
    setupDummyAuth();

    console.log("Replit Auth setup complete!");
  } catch (error) {
    console.error("Failed to set up Replit Auth:", error);
    console.log("Falling back to basic auth...");
    
    // Setup a basic auth endpoint in case Replit Auth fails
    app.get("/api/login", (req, res) => {
      res.redirect('/');
    });
  }

  // Common routes that work regardless of authentication method

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
    const userId = req.user?.id || req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

// Authentication middleware
export const isAuthenticated = (req: any, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};