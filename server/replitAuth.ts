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

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
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
    createTableIfMissing: false,
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

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Map Replit claims to our database schema
  const firstName = claims["first_name"] || "";
  const lastName = claims["last_name"] || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  
  await storage.upsertUser({
    id: claims["sub"],
    username: claims["username"],
    email: claims["email"],
    name: fullName || claims["username"],
    bio: claims["bio"],
    profileImageUrl: claims["profile_image_url"],
    // Default password for users created through Replit Auth
    password: "replit-auth-user"
  });
}

export async function setupReplitAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  try {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of process.env
      .REPLIT_DOMAINS!.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    // Update serialization/deserialization to match what we see in the database
    passport.serializeUser((user: any, cb) => {
      // Store the minimal necessary user data
      cb(null, user);
    });
    
    passport.deserializeUser((obj: any, cb) => {
      // Restore the user object
      cb(null, obj);
    });

    app.get("/api/login", (req, res, next) => {
      // Save returnTo URL in session if provided
      if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo as string;
      }
      
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/dashboard",
        failureRedirect: "/",
      })(req, res, next);
    });

    app.get("/api/logout", (req: any, res) => {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });

    app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
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
    
    // Setup fallback for local development
    console.log("Setting up development auth...");
    
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
      res.json(req.user);
    });
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as any;
  
  // For demo users, no token check is needed
  if (user.id === "demo_user_123") {
    return next();
  }
  
  // For Replit Auth users, check token expiration
  if (!user?.claims?.exp) {
    return res.status(401).json({ message: "Invalid user session" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.claims.exp) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.redirect("/api/login");
  }
};