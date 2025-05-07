import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend Express Session interface
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

// Hardcoded URLs as requested
const REPLIT_DOMAIN = 'bfd824a8-80f1-45b8-9c48-fc95b77a9105-00-14k8dzmk8x22u.riker.replit.dev';
const PRODUCTION_DOMAIN = 'gocareerate.com';

// Check for required environment variables
if (!process.env.REPL_ID) {
  console.error("Environment variable REPL_ID not provided");
}

// Use memoize to cache the OIDC configuration
const getOidcConfig = memoize(
  async () => {
    console.log("[AUTH] Discovering Replit OIDC configuration...");
    try {
      return await client.discovery(
        new URL("https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    } catch (error) {
      console.error("[AUTH] Error discovering OIDC configuration:", error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  console.log("[SESSION] Setting up PostgreSQL session storage");
  
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
      secure: false, // Setting to false to work in development
      maxAge: sessionTtl,
      sameSite: "lax"
    },
  });
}

// Helper to update user session
function updateUserSession(
  user: any,
  tokens: any
) {
  try {
    console.log("[AUTH] Updating user session with token data");
    
    const claims = tokens.claims();
    user.claims = claims;
    user.access_token = tokens.access_token;
    user.refresh_token = tokens.refresh_token;
    user.expires_at = claims.exp;
    
    console.log(`[AUTH] User session updated for: ${claims.username || 'unknown'}`);
  } catch (error) {
    console.error("[AUTH] Error updating user session:", error);
    throw error;
  }
}

// Helper to create/update user in database
async function upsertUser(claims: any) {
  try {
    console.log(`[AUTH] Upserting user with ID: ${claims.sub}, username: ${claims.username}`);
    
    // Format name from claims
    const firstName = claims.first_name || "";
    const lastName = claims.last_name || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    
    // Insert or update user in database
    const user = await storage.upsertUser({
      id: claims.sub,
      username: claims.username,
      email: claims.email,
      name: fullName || claims.username,
      bio: claims.bio || "",
      profileImageUrl: claims.profile_image_url || "",
      password: "replit-auth-user" // Default password for OAuth users
    });
    
    console.log(`[AUTH] User upserted successfully: ${user.username}`);
    return user;
  } catch (error) {
    console.error("[AUTH] Error upserting user:", error);
    throw error;
  }
}

// Main authentication setup
export async function setupAuth(app: Express) {
  console.log("[AUTH] Setting up authentication...");
  
  // Setup basic middleware
  app.set("trust proxy", true);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // User serialization
  passport.serializeUser((user: any, cb) => {
    console.log(`[AUTH] Serializing user: ${user.claims?.username || 'unknown'}`);
    cb(null, user);
  });
  
  passport.deserializeUser((obj: any, cb) => {
    console.log(`[AUTH] Deserializing user: ${obj.claims?.username || 'unknown'}`);
    cb(null, obj);
  });
  
  try {
    // Log environment info
    console.log(`[AUTH] REPL_ID: ${process.env.REPL_ID || 'not set'}`);
    console.log(`[AUTH] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    
    // Determine current domain
    const currentDomain = process.env.NODE_ENV === 'production' ? PRODUCTION_DOMAIN : REPLIT_DOMAIN;
    console.log(`[AUTH] Using domain: ${currentDomain}`);

    // Get OIDC configuration
    const config = await getOidcConfig();
    console.log("[AUTH] OIDC configuration discovered successfully");
    
    // Create the strategy
    const strategy = new Strategy(
      {
        name: 'replit',
        passReqToCallback: false,
        config: config,
        callbackURL: `https://${currentDomain}/api/callback`,
        scope: "openid email profile offline_access"
      },
      async (tokens: any, done: any) => {
        try {
          console.log("[AUTH] Received tokens from authentication");
          
          const user: any = {};
          updateUserSession(user, tokens);
          
          await upsertUser(user.claims);
          
          console.log("[AUTH] User authentication completed successfully");
          return done(null, user);
        } catch (error) {
          console.error("[AUTH] Error in verification function:", error);
          return done(error);
        }
      }
    );
    
    // Register the strategy
    passport.use('replit', strategy);
    console.log("[AUTH] Passport strategy registered");
    
    // Configure routes
    
    // Login route
    app.get("/api/login", (req, res, next) => {
      console.log("[AUTH] Handling login request");
      
      // Save returnTo URL if provided
      if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo as string;
        console.log(`[AUTH] Setting returnTo: ${req.session.returnTo}`);
      }
      
      console.log("[AUTH] Starting Replit authentication flow");
      
      passport.authenticate("replit", {
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });
    
    // Callback route
    app.get("/api/callback", (req, res, next) => {
      console.log("[AUTH] Callback received from Replit");
      console.log(`[AUTH] Callback parameters: ${JSON.stringify(req.query)}`);
      
      passport.authenticate("replit", (err: any, user: any, info: any) => {
        if (err) {
          console.error("[AUTH] Authentication error:", err);
          return res.redirect("/?error=auth_failed");
        }
        
        if (!user) {
          console.error("[AUTH] No user returned from authentication:", info);
          return res.redirect("/?error=no_user");
        }
        
        console.log("[AUTH] User authenticated, completing login");
        
        req.login(user, (loginErr: any) => {
          if (loginErr) {
            console.error("[AUTH] Login error:", loginErr);
            return res.redirect("/?error=login_failed");
          }
          
          const returnTo = req.session.returnTo || "/dashboard";
          delete req.session.returnTo;
          
          console.log(`[AUTH] Login successful, redirecting to: ${returnTo}`);
          return res.redirect(returnTo);
        });
      })(req, res, next);
    });
    
    // Logout route
    app.get("/api/logout", (req: any, res) => {
      console.log("[AUTH] Handling logout request");
      
      const returnTo = req.query.returnTo || "/";
      
      req.logout((err: any) => {
        if (err) {
          console.error("[AUTH] Logout error:", err);
        }
        
        console.log(`[AUTH] User logged out, redirecting to: ${returnTo}`);
        res.redirect(returnTo as string);
      });
    });
    
    // User profile endpoint
    app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
      try {
        console.log("[AUTH] User info requested");
        
        if (!req.user || !req.user.claims || !req.user.claims.sub) {
          console.error("[AUTH] No valid user claims found in session");
          return res.status(401).json({ error: "No authenticated user" });
        }
        
        const userId = req.user.claims.sub;
        console.log(`[AUTH] Fetching user info for: ${userId}`);
        
        const user = await storage.getUser(userId);
        
        if (!user) {
          console.error(`[AUTH] User with ID ${userId} not found in database`);
          return res.status(404).json({ error: "User not found" });
        }
        
        console.log(`[AUTH] User info returned for: ${user.username}`);
        res.json(user);
      } catch (error) {
        console.error("[AUTH] Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user information" });
      }
    });
    
    console.log("[AUTH] Authentication setup complete!");
  } catch (error) {
    console.error("[AUTH] Fatal error setting up authentication:", error);
    throw error; // No fallback, as requested
  }
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  console.log("[AUTH] Checking authentication status");
  
  if (!req.isAuthenticated()) {
    console.log("[AUTH] Request is not authenticated");
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const user = req.user as any;
  
  // Check token expiration
  if (user?.claims?.exp) {
    const now = Math.floor(Date.now() / 1000);
    const expiration = user.claims.exp;
    
    console.log(`[AUTH] Token expiration check: now=${now}, expires=${expiration}, delta=${expiration - now}s`);
    
    if (now > expiration) {
      console.log("[AUTH] Token has expired, attempting to refresh");
      
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        console.log("[AUTH] No refresh token available");
        return res.status(401).json({ error: "Session expired" });
      }
      
      try {
        // Get fresh config
        const config = await getOidcConfig();
        
        // Refresh token
        console.log("[AUTH] Refreshing token...");
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        
        // Update session
        updateUserSession(user, tokenResponse);
        console.log("[AUTH] Token refreshed successfully");
        
        return next();
      } catch (error) {
        console.error("[AUTH] Token refresh error:", error);
        return res.redirect("/api/login");
      }
    }
  }
  
  console.log(`[AUTH] Request authenticated for user: ${user?.claims?.username || 'unknown'}`);
  return next();
};