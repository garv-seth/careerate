import * as client from "openid-client";
import passport from "passport";
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

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Set to match existing session cookies
  return session({
    secret: process.env.SESSION_SECRET || "developmentsecret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax"
    },
  });
}

export async function setupReplitAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Force development auth mode for debugging
  console.log("Setting up simplified development auth...");
  
  // Override passport serialization/deserialization
  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((obj: any, cb) => cb(null, obj));
  
  app.get("/api/login", (req, res) => {
    // Save returnTo URL in session if provided
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo as string;
    }
    
    if (req.isAuthenticated()) {
      // Get any redirectUrl from returnTo or default to dashboard
      const returnTo = req.session.returnTo || '/dashboard';
      if (req.session.returnTo) {
        delete req.session.returnTo;
      }
      return res.redirect(returnTo);
    }
    
    // Create demo user with necessary claims
    const demoUser = {
      id: "demo_user_123",
      username: "demouser",
      name: "Demo User",
      email: "demo@example.com",
      claims: {
        sub: "demo_user_123",
        email: "demo@example.com",
        username: "demouser"
      }
    };
    
    // Create or update the user in the database
    storage.upsertUser({
      id: demoUser.id,
      username: demoUser.username,
      name: demoUser.name,
      email: demoUser.email,
      password: null
    }).catch(err => {
      console.error("Error upserting demo user:", err);
    });
    
    req.login(demoUser, (err) => {
      if (err) {
        console.error("Error logging in:", err);
        return res.status(500).json({ message: "Auth error" });
      }
      console.log("Demo user logged in successfully");
      
      // Get any redirectUrl from returnTo or default to dashboard
      const returnTo = req.session.returnTo || '/dashboard';
      if (req.session.returnTo) {
        delete req.session.returnTo;
      }
      return res.redirect(returnTo);
    });
  });
  
  app.get("/api/callback", (req, res) => {
    // Get any redirectUrl from session or default to dashboard
    const returnTo = req.session.returnTo || '/dashboard';
    if (req.session.returnTo) {
      delete req.session.returnTo;
    }
    res.redirect(returnTo);
  });
  
  app.get("/api/logout", (req: any, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  });
  
  app.get("/api/auth/user", isAuthenticated, (req: any, res) => {
    try {
      // If the user has claims.sub, get user data from database
      if (req.user.claims?.sub) {
        storage.getUser(req.user.claims.sub)
          .then(user => {
            res.json(user || req.user);
          })
          .catch(err => {
            console.error("Error getting user from database:", err);
            res.json(req.user);
          });
      } else {
        // Otherwise just return the user from the session
        res.json(req.user);
      }
    } catch (error) {
      console.error("Error in /api/auth/user:", error);
      res.json(req.user); // Fallback to session user
    }
  });
  
  console.log("Development auth setup complete!");
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // In development mode, all users are considered valid
  return next();
};