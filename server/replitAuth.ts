import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend Express Session interface
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

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
      secure: false, // Set to false for development - enables HTTP access
      maxAge: sessionTtl,
      sameSite: "lax"
    },
  });
}

export async function setupAuth(app: Express): Promise<void> {
  console.log("Setting up authentication...");
  
  // Configure basic middleware
  app.set("trust proxy", true);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Simple serialization/deserialization to avoid loops
  passport.serializeUser((user: any, cb) => {
    console.log("Serializing user:", user.id);
    cb(null, user.id);
  });
  
  passport.deserializeUser((id: string, cb) => {
    // Don't fetch from DB each time to reduce potential for loops
    cb(null, { id });
  });

  try {
    // Set up a simple local strategy
    passport.use(new LocalStrategy(
      { usernameField: 'username', passwordField: 'password' },
      async (_username, _password, done) => {
        try {
          // Create fixed user for now - no DB interaction
          const user = {
            id: "fixed-user-id",
            username: "careerate_user",
            email: "user@careerate.com",
            name: "Careerate User",
            profileImageUrl: "https://ui-avatars.com/api/?name=Careerate+User&background=0D8ABC&color=fff",
          };
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));

    // Simple login endpoint
    app.get("/api/login", (req, res) => {
      console.log("Login route called");
      // Store returnTo path if provided
      if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo as string;
        console.log("Setting returnTo:", req.session.returnTo);
      }
      
      // Create fixed user with minimal data
      const user = {
        id: "fixed-user-id",
        username: "careerate_user",
        name: "Careerate User",
      };
      
      // Log the user in directly 
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.redirect("/?error=login_failed");
        }
        
        // Redirect to intended destination or dashboard
        const returnTo = req.session.returnTo || "/dashboard";
        delete req.session.returnTo;
        
        console.log("Logged in - redirecting to:", returnTo);
        return res.redirect(returnTo);
      });
    });

    // Simple callback (not needed but kept for compatibility)
    app.get("/api/callback", (req, res) => {
      const returnTo = req.session.returnTo || "/dashboard";
      delete req.session.returnTo;
      res.redirect(returnTo);
    });

    // Simple logout
    app.get("/api/logout", (req: any, res) => {
      console.log("Logout route called");
      req.logout(() => {
        res.redirect("/");
      });
    });

    // User info endpoint - return fixed user data
    app.get("/api/auth/user", isAuthenticated, (req: any, res) => {
      console.log("User info endpoint called");
      
      // Return user object
      res.json({
        id: req.user.id,
        username: "careerate_user",
        email: "user@careerate.com",
        name: "Careerate User",
        profileImageUrl: "https://ui-avatars.com/api/?name=Careerate+User&background=0D8ABC&color=fff",
      });
    });

    console.log("Authentication setup complete!");
  } catch (error) {
    console.error("Auth setup error:", error);
    throw error;
  }
}

// Authentication check middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  console.log("Checking authentication");
  
  if (!req.isAuthenticated()) {
    console.log("User is not authenticated");
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  console.log("User is authenticated");
  next();
};