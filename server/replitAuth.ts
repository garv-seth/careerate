import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend express-session with returnTo
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
      secure: false,
      maxAge: sessionTtl,
      sameSite: "lax"
    },
  });
}

export async function setupAuth(app: Express): Promise<void> {
  console.log("Setting up simplified auth...");
  
  // Configure basic middleware
  app.set("trust proxy", true);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Simple serialization/deserialization
  passport.serializeUser((user: any, cb) => {
    console.log("Serializing user");
    cb(null, user.id);
  });
  
  passport.deserializeUser((id: string, cb) => {
    console.log("Deserializing user with ID:", id);
    // Just pass the ID to avoid loops
    cb(null, { id });
  });

  // Login route - use direct login without strategy
  app.get("/api/login", (req, res) => {
    console.log("Login route accessed");
    // Store return path
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo as string;
    }
    
    // Create a stable user ID for consistency
    const userId = "user_1234";
    
    // Log the user in directly without passport strategy
    req.login({ 
      id: userId,
      username: "careerate_user",
      name: "Careerate User"
    }, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.redirect("/?error=login_failed");
      }
      
      // Redirect to return URL or dashboard
      const returnTo = req.session.returnTo || "/dashboard";
      delete req.session.returnTo;
      console.log("Redirecting to:", returnTo);
      res.redirect(returnTo);
    });
  });

  // Just a placeholder callback route
  app.get("/api/callback", (req, res) => {
    console.log("Callback route accessed");
    const returnTo = req.session.returnTo || "/dashboard";
    delete req.session.returnTo;
    res.redirect(returnTo);
  });

  // Simple logout
  app.get("/api/logout", (req: any, res) => {
    console.log("Logout route accessed");
    req.logout(() => {
      res.redirect("/");
    });
  });

  // User endpoint
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      console.log("User info endpoint accessed");
      // Return a meaningful user object
      res.json({
        id: req.user.id,
        username: "careerate_user",
        email: "user@careerate.app",
        name: "Careerate User",
        profileImageUrl: "https://ui-avatars.com/api/?name=Careerate+User&background=0D8ABC&color=fff",
      });
    } catch (error) {
      console.error("Error in user endpoint:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  console.log("Auth setup complete");
}

// Auth middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  console.log("Checking auth, authenticated:", req.isAuthenticated());
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
};