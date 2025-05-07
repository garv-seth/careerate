import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
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
      secure: false, // Set to false to work with HTTP in development
      maxAge: sessionTtl,
      sameSite: "lax"
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  try {
    user.claims = tokens.claims();
    user.access_token = tokens.access_token;
    user.refresh_token = tokens.refresh_token;
    user.expires_at = user.claims?.exp;
    console.log("User session updated with claims for:", user.claims?.username || 'unknown user');
  } catch (error) {
    console.error("Error updating user session:", error);
  }
}

async function upsertUser(claims: any) {
  try {
    const firstName = claims["first_name"] || "";
    const lastName = claims["last_name"] || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    
    console.log(`Upserting user: ${claims["username"]} (ID: ${claims["sub"]})`);
    
    const user = await storage.upsertUser({
      id: claims["sub"],
      username: claims["username"],
      email: claims["email"],
      name: fullName || claims["username"],
      bio: claims["bio"],
      profileImageUrl: claims["profile_image_url"],
      password: "replit-auth-user"
    });
    
    console.log(`User upserted successfully: ${user.username}`);
    return user;
  } catch (error) {
    console.error("Error upserting user:", error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  console.log("Setting up authentication...");
  
  // Basic middleware setup
  app.set("trust proxy", true);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Simple user serialization
  passport.serializeUser((user: any, cb) => {
    console.log(`Serializing user: ${user.claims?.username || 'unknown'}`);
    cb(null, user);
  });
  
  passport.deserializeUser((obj: any, cb) => {
    console.log(`Deserializing user: ${obj.claims?.username || 'unknown'}`);
    cb(null, obj);
  });

  try {
    // Setup Replit Auth with simple error handling
    console.log("Setting up Replit Auth...");
    
    // Check for required environment variables
    if (!process.env.REPLIT_DOMAINS) {
      throw new Error("REPLIT_DOMAINS environment variable is missing");
    }
    
    if (!process.env.REPL_ID) {
      throw new Error("REPL_ID environment variable is missing");
    }
    
    // Get domain from environment
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    console.log(`Using domain for auth: ${domain}`);
    
    // Discover OIDC config
    const config = await getOidcConfig();
    console.log("OIDC configuration discovered successfully");
    
    // Create verify callback
    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      try {
        console.log("Received token from Replit Auth");
        const user: any = {};
        updateUserSession(user, tokens);
        await upsertUser(user.claims);
        verified(null, user);
      } catch (error) {
        console.error("Error in verify function:", error);
        verified(error as Error);
      }
    };
    
    // Create passport strategy
    const strategy = new Strategy(
      {
        name: "replit",
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify
    );
    
    passport.use(strategy);
    console.log("Passport strategy registered");
    
    // Login endpoint
    app.get("/api/login", (req, res, next) => {
      // Store returnTo URL if provided
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
    
    // Callback endpoint with detailed logging
    app.get("/api/callback", (req, res, next) => {
      console.log("Processing callback from Replit Auth");
      console.log("Request URL:", req.url);
      console.log("Request query:", req.query);
      
      try {
        // Use a custom callback to handle auth errors
        passport.authenticate("replit", (err: any, user: any, info: any) => {
          if (err) {
            console.error("Authentication error:", err);
            return res.redirect("/?error=auth_error");
          }
          
          if (!user) {
            console.error("No user returned from authentication, info:", info);
            return res.redirect("/?error=no_user");
          }
          
          // Log in the user
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("Login error:", loginErr);
              return res.redirect("/?error=login_error");
            }
            
            // Get return URL from session or use default
            const returnTo = req.session.returnTo || "/dashboard";
            delete req.session.returnTo;
            
            console.log(`Authentication successful, redirecting to: ${returnTo}`);
            return res.redirect(returnTo);
          });
        })(req, res, next);
      } catch (error) {
        console.error("Unexpected error in callback:", error);
        return res.redirect("/?error=unexpected");
      }
    });
    
    // Logout endpoint
    app.get("/api/logout", (req: any, res) => {
      console.log("Processing logout request");
      
      const returnTo = req.query.returnTo || "/";
      
      req.logout(() => {
        console.log(`Logged out, redirecting to: ${returnTo}`);
        res.redirect(returnTo as string);
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
    
    // Setup fallback for development
    console.log("Setting up fallback development auth");
    
    // Login endpoint
    app.get("/api/login", (req, res) => {
      console.log("Using fallback auth login");
      
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
          username: "demouser"
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
    
    // Callback endpoint (for fallback)
    app.get("/api/callback", (req, res) => {
      console.log("Using fallback auth callback");
      const returnTo = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;
      res.redirect(returnTo);
    });
    
    // Logout endpoint (for fallback)
    app.get("/api/logout", (req: any, res) => {
      console.log("Using fallback auth logout");
      req.logout(() => {
        res.redirect('/');
      });
    });
    
    // User info endpoint (for fallback)
    app.get("/api/auth/user", isAuthenticated, (req: any, res) => {
      console.log("Using fallback auth user info");
      res.json(req.user);
    });
  }
}

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
    console.log(`Token valid until ${new Date(user.claims.exp * 1000).toISOString()}`);
    return next();
  }
  
  console.log("Token expired, attempting refresh");
  
  // Token expired, try refresh
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("No refresh token available, redirecting to login");
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