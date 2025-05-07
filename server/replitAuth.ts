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

// Use memoize to cache the OIDC configuration
const getOidcConfig = memoize(
  async () => {
    console.log("Discovering Replit OIDC configuration...");
    return await client.discovery(
      new URL("https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

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
      secure: false, // Set to false for development
      maxAge: sessionTtl,
      sameSite: "lax"
    },
  });
}

// Helper to update user session with token data
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
  console.log("User session updated for:", user.claims?.username || 'unknown user');
}

// Helper to create/update user in the database
async function upsertUser(claims: any) {
  // Extract and format user data
  const firstName = claims["first_name"] || "";
  const lastName = claims["last_name"] || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  
  console.log(`Upserting user: ${claims["username"]} (ID: ${claims["sub"]})`);
  
  // Create or update user in database
  const user = await storage.upsertUser({
    id: claims["sub"],
    username: claims["username"],
    email: claims["email"],
    name: fullName || claims["username"],
    bio: claims["bio"],
    profileImageUrl: claims["profile_image_url"],
    password: "replit-auth-user" // Default password for OAuth users
  });
  
  console.log(`User upserted successfully: ${user.username}`);
  return user;
}

// Main function to set up authentication
export async function setupAuth(app: Express) {
  console.log("Setting up authentication...");
  
  // Basic middleware setup
  app.set("trust proxy", true);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // User serialization/deserialization for sessions
  passport.serializeUser((user: Express.User, cb) => {
    cb(null, user);
  });
  
  passport.deserializeUser((obj: Express.User, cb) => {
    cb(null, obj);
  });

  try {
    // Check if we have required environment variables
    if (!process.env.REPLIT_DOMAINS) {
      throw new Error("REPLIT_DOMAINS environment variable is missing");
    }
    
    if (!process.env.REPL_ID) {
      throw new Error("REPL_ID environment variable is missing");
    }
    
    // Get the domain from environment variables
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    console.log(`Using domain for auth: ${domain}`);
    
    // Get OIDC configuration
    const config = await getOidcConfig();
    console.log("OIDC configuration discovered successfully");
    
    // Create the strategy
    const strategy = new Strategy(
      {
        name: "replit",
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      async (tokenSet, done) => {
        try {
          console.log("Received tokens from authentication");
          const user: any = {};
          updateUserSession(user, tokenSet);
          await upsertUser(user.claims);
          return done(null, user);
        } catch (error) {
          console.error("Error in verify function:", error);
          return done(error as Error);
        }
      }
    );
    
    // Register the strategy with passport
    passport.use(strategy);
    console.log("Passport strategy registered");
    
    // Login route
    app.get("/api/login", (req, res, next) => {
      // Save returnTo URL if provided
      if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo as string;
        console.log(`Storing returnTo URL: ${req.session.returnTo}`);
      }
      
      console.log("Processing login request");
      passport.authenticate("replit", {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });
    
    // Callback route
    app.get("/api/callback", (req, res, next) => {
      console.log("Processing callback from Replit Auth");
      console.log("Callback URL:", req.originalUrl);
      
      passport.authenticate("replit", (err, user, info) => {
        if (err) {
          console.error("Authentication error:", err);
          return res.redirect("/?error=auth_error");
        }
        
        if (!user) {
          console.error("No user returned from authentication. Info:", info);
          return res.redirect("/?error=no_user");
        }
        
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Login error:", loginErr);
            return res.redirect("/?error=login_error");
          }
          
          const returnTo = req.session.returnTo || "/dashboard";
          delete req.session.returnTo;
          
          console.log(`Authentication successful, redirecting to: ${returnTo}`);
          return res.redirect(returnTo);
        });
      })(req, res, next);
    });
    
    // Logout route
    app.get("/api/logout", (req: any, res) => {
      console.log("Processing logout request");
      req.logout(() => {
        res.redirect('/');
      });
    });
    
    // User info endpoint
    app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        console.log(`Fetching user info for: ${userId}`);
        
        const user = await storage.getUser(userId);
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });
    
    console.log("Replit Auth setup complete!");
  } catch (error) {
    console.error("Failed to set up Replit Auth:", error);
    
    // Set up fallback authentication for development
    setupFallbackAuth(app);
  }
}

// Fallback authentication for development
function setupFallbackAuth(app: Express) {
  console.log("Setting up fallback authentication for development");
  
  // Login endpoint
  app.get("/api/login", (req, res) => {
    console.log("Using fallback login");
    
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo as string;
    }
    
    // Create demo user
    const demoUser = {
      id: "demo_user_123",
      username: "demouser",
      name: "Demo User",
      email: "demo@example.com",
      claims: {
        sub: "demo_user_123",
        email: "demo@example.com",
        username: "demouser",
        exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
      }
    };
    
    req.login(demoUser, (err) => {
      if (err) {
        console.error("Error in demo login:", err);
        return res.status(500).json({ message: "Auth error" });
      }
      
      console.log("Demo user logged in successfully");
      const returnTo = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;
      return res.redirect(returnTo);
    });
  });
  
  // Simple callback for fallback
  app.get("/api/callback", (req, res) => {
    console.log("Using fallback callback");
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
  });
  
  // Simple logout for fallback
  app.get("/api/logout", (req: any, res) => {
    console.log("Using fallback logout");
    req.logout(() => {
      res.redirect('/');
    });
  });
  
  // User info endpoint for fallback
  app.get("/api/auth/user", isAuthenticated, (req: any, res) => {
    console.log("Using fallback user info");
    res.json(req.user);
  });
  
  console.log("Fallback auth setup complete");
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    console.log("Unauthorized request - user not authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as any;
  
  // For demo users, no token check needed
  if (user.id === "demo_user_123") {
    console.log("Demo user authenticated");
    return next();
  }
  
  // For Replit Auth users, check token expiration
  if (!user?.claims?.exp) {
    console.log("Invalid user session - no expiration claim");
    return res.status(401).json({ message: "Invalid user session" });
  }
  
  const now = Math.floor(Date.now() / 1000);
  
  if (now <= user.claims.exp) {
    // Token still valid
    return next();
  }
  
  console.log("Token expired, attempting refresh");
  
  // Token expired, try refresh
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("No refresh token available");
    return res.redirect("/api/login");
  }
  
  try {
    // Get config for token refresh
    const config = await getOidcConfig();
    
    // Refresh token
    console.log("Refreshing token...");
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    
    // Update session
    updateUserSession(user, tokenResponse);
    console.log("Token refreshed successfully");
    
    return next();
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.redirect("/api/login");
  }
};