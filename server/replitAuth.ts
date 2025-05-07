import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";
import { setupSessionTable } from "./setup-sessions";

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

// Make sure REPLIT_DOMAINS is available
if (!process.env.REPLIT_DOMAINS) {
  console.warn("Environment variable REPLIT_DOMAINS not provided. Using fallback.");
  process.env.REPLIT_DOMAINS = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.replit.dev` : "localhost:5000";
}

// Make sure REPL_ID is available
if (!process.env.REPL_ID) {
  console.warn("Environment variable REPL_ID not provided. Using fallback.");
  process.env.REPL_ID = "careerate";
}

// Cache the OpenID configuration for an hour
const getOidcConfig = memoize(
  async () => {
    console.log("Fetching OpenID configuration...");
    try {
      const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
      console.log(`Using issuer URL: ${issuerUrl}`);
      
      // Discover OpenID configuration
      const discovery = await client.discovery(
        new URL(issuerUrl),
        process.env.REPL_ID!
      );
      
      console.log("OpenID configuration fetched successfully");
      return discovery;
    } catch (error) {
      console.error("Error fetching OpenID configuration:", error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 } // Cache for 1 hour
);

// Setup session middleware
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Create a PostgreSQL session store
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false, // We create the table manually
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "careerate-dev-secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

// Update user session with tokens
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Upsert user in database from OIDC claims
async function upsertUser(claims: any) {
  try {
    if (!claims.sub) {
      console.error("No user ID (sub) in claims:", claims);
      throw new Error("Invalid user claims - missing sub");
    }
    
    console.log(`Upserting user with id: ${claims.sub}, username: ${claims.username}`);
    
    const user = await storage.upsertUser({
      id: claims.sub,
      username: claims.username || `user_${claims.sub}`,
      email: claims.email,
      firstName: claims.first_name,
      lastName: claims.last_name,
      bio: claims.bio,
      profileImageUrl: claims.profile_image_url,
    });
    
    console.log(`User upserted successfully: ${user.id}`);
    return user;
  } catch (error) {
    console.error("Error upserting user:", error);
    throw error;
  }
}

// Setup authentication
export async function setupAuth(app: Express): Promise<void> {
  console.log("Setting up authentication...");
  
  // Make sure session table exists
  await setupSessionTable(pool);
  
  // Setup Express for auth
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  try {
    // Get OpenID configuration
    const config = await getOidcConfig();
    
    // Define verify function for OpenID Connect
    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      try {
        console.log("Verifying tokens and user...");
        
        // Create or extract user object
        const user: any = {};
        
        // Update session with tokens
        updateUserSession(user, tokens);
        
        // Upsert user in database
        await upsertUser(tokens.claims());
        
        console.log("User verified successfully");
        verified(null, user);
      } catch (error) {
        console.error("Error in verify function:", error);
        verified(error as Error);
      }
    };

    // Register strategies for all domains
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    console.log(`Registering auth strategies for domains: ${domains.join(", ")}`);
    
    for (const domain of domains) {
      const strategyName = `replitauth:${domain}`;
      console.log(`Creating strategy: ${strategyName}`);
      
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      
      passport.use(strategy);
      console.log(`Strategy registered: ${strategyName}`);
    }

    // Serialize user to the session
    passport.serializeUser((user: Express.User, cb) => {
      console.log("Serializing user");
      cb(null, user);
    });
    
    // Deserialize user from the session
    passport.deserializeUser((user: Express.User, cb) => {
      console.log("Deserializing user");
      cb(null, user);
    });

    // Login route
    app.get("/api/login", (req, res, next) => {
      console.log("Login route accessed");
      
      // Store return URL in session if provided
      if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo as string;
        console.log(`Return URL stored: ${req.session.returnTo}`);
      }
      
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    // Callback route
    app.get("/api/callback", (req, res, next) => {
      console.log("Callback route accessed");
      
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });

    // Logout route
    app.get("/api/logout", (req, res) => {
      console.log("Logout route accessed");
      
      req.logout(() => {
        // Build logout URL
        const logoutUrl = client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href;
        
        console.log(`Redirecting to logout URL: ${logoutUrl}`);
        res.redirect(logoutUrl);
      });
    });
    
    // User information route
    app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
      try {
        console.log("User info route accessed");
        
        // Get user ID from claims
        const userId = req.user?.claims?.sub;
        if (!userId) {
          console.error("No user ID in session");
          return res.status(401).json({ error: "Unauthorized - No user ID" });
        }
        
        // Get user from database
        const user = await storage.getUser(userId);
        if (!user) {
          console.error(`User not found in database: ${userId}`);
          return res.status(404).json({ error: "User not found" });
        }
        
        console.log(`Returning user info for: ${user.id}`);
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
      }
    });
    
    console.log("Authentication setup completed successfully");
  } catch (error) {
    console.error("Error setting up authentication:", error);
    throw error;
  }
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Check if authenticated
  if (!req.isAuthenticated() || !req.user?.expires_at) {
    console.log("User not authenticated or missing expiration");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check if token is still valid
  const now = Math.floor(Date.now() / 1000);
  if (now <= req.user.expires_at) {
    console.log("Token still valid, continuing");
    return next();
  }

  // Token expired, try to refresh
  console.log("Token expired, attempting refresh");
  const refreshToken = req.user.refresh_token;
  if (!refreshToken) {
    console.log("No refresh token, redirecting to login");
    return res.redirect("/api/login");
  }

  try {
    // Refresh token
    console.log("Refreshing token");
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    
    // Update session with new tokens
    updateUserSession(req.user, tokenResponse);
    console.log("Token refreshed successfully");
    
    return next();
  } catch (error) {
    console.error("Error refreshing token:", error);
    return res.redirect("/api/login");
  }
};