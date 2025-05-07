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

// Allow both development and production domains
const ADDITIONAL_DOMAINS = ["gocareerate.com"];

const getOidcConfig = memoize(
  async () => {
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
    password: "replit-auth-user"
  });
}

function getAllowedDomains(): string[] {
  // Start with the replit domain(s)
  const domains: string[] = [];
  
  if (process.env.REPLIT_DOMAINS) {
    domains.push(...process.env.REPLIT_DOMAINS.split(','));
  } else {
    console.log("REPLIT_DOMAINS not found, using fallback");
    // Use known Replit domain pattern as fallback
    if (process.env.REPL_ID) {
      domains.push(`${process.env.REPL_ID}-00-14k8dzmk8x22u.riker.replit.dev`);
    }
  }
  
  // Add production domains
  domains.push(...ADDITIONAL_DOMAINS);
  
  return domains;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Default serialization
  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((obj: any, cb) => cb(null, obj));

  try {
    console.log("Setting up Replit Auth...");
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      try {
        const user: any = {};
        updateUserSession(user, tokens);
        await upsertUser(tokens.claims());
        verified(null, user);
      } catch (error) {
        console.error("Error in verify function:", error);
        verified(error as Error);
      }
    };

    // Register strategies for all domains
    const domains = getAllowedDomains();
    for (const domain of domains) {
      console.log(`Registering auth strategy for domain: ${domain}`);
      const strategy = new Strategy(
        {
          name: `replit-${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    // Login route - direct to right auth provider
    app.get("/api/login", (req, res, next) => {
      // Save returnTo URL in session if provided
      if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo as string;
      }
      
      const hostname = req.hostname;
      const strategyName = `replit-${hostname}`;
      
      console.log(`Login request from host: ${hostname}, using strategy: ${strategyName}`);
      
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    // Callback handler
    app.get("/api/callback", (req, res, next) => {
      const hostname = req.hostname;
      const strategyName = `replit-${hostname}`;
      
      console.log(`Callback request from host: ${hostname}, using strategy: ${strategyName}`);
      
      passport.authenticate(strategyName, {
        successReturnToOrRedirect: "/dashboard",
        failureRedirect: "/",
      })(req, res, next);
    });

    // Logout route
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

    // Get user info endpoint
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
    // Set up a fallback auth method for development
    fallbackAuthSetup(app);
  }
}

function fallbackAuthSetup(app: Express) {
  console.log("Setting up fallback auth for development...");
  
  app.get("/api/login", (req, res) => {
    // Save returnTo URL in session if provided
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo as string;
    }

    if (req.isAuthenticated()) {
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
      
      const returnTo = req.session.returnTo || '/dashboard';
      if (req.session.returnTo) {
        delete req.session.returnTo;
      }
      return res.redirect(returnTo);
    });
  });

  app.get("/api/callback", (req, res) => {
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