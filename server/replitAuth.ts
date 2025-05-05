import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  console.warn("Environment variable REPLIT_DOMAINS not provided. Auth will be limited to local domains only.");
}

// Will store allowed domains for auth
let allowedDomains: string[] = [];

// Add Replit domains if available
if (process.env.REPLIT_DOMAINS) {
  allowedDomains = process.env.REPLIT_DOMAINS.split(",");
}

// Always add gocareerate.com and www.gocareerate.com for production
allowedDomains.push('gocareerate.com', 'www.gocareerate.com');

// Add other production domains if specified
if (process.env.PRODUCTION_DOMAINS) {
  const productionDomains = process.env.PRODUCTION_DOMAINS.split(',');
  allowedDomains.push(...productionDomains);
}

console.log(`Configured auth for domains: ${allowedDomains.join(', ')}`);

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
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  // Determine appropriate cookie settings based on hostname
  const isDevelopment = process.env.NODE_ENV !== "production";
  
  return session({
    secret: process.env.SESSION_SECRET || "developmentsecret", // You should set SESSION_SECRET in production
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isDevelopment, // Secure in production only
      maxAge: sessionTtl,
      sameSite: "lax",
      // We'll set domain at runtime based on request hostname
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

async function upsertUser(claims: any) {
  // Create a properly formatted user object that matches our schema
  return await storage.upsertUser({
    id: claims["sub"],
    username: claims["username"],
    email: claims["email"] || null,
    // Set both the separate and combined name fields
    firstName: claims["first_name"] || null,
    lastName: claims["last_name"] || null,
    // Use full name if available, otherwise construct from parts or use username
    name: claims["name"] || 
          (claims["first_name"] && claims["last_name"] ? 
           `${claims["first_name"]} ${claims["last_name"]}` : 
           claims["username"]),
    bio: claims["bio"] || null,
    profileImageUrl: claims["profile_image_url"] || null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

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

  for (const domain of allowedDomains) {
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
    console.log(`Auth configured for domain: ${domain}`);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const domain = req.hostname;
    const strategyName = `replitauth:${domain}`;
    
    // Check if we have a strategy for this domain
    const isAllowedDomain = allowedDomains.includes(domain);
    
    if (!isAllowedDomain) {
      console.warn(`Login attempt from non-configured domain: ${domain}`);
      return res.status(400).json({ 
        error: "Domain not configured for authentication",
        configuredDomains: allowedDomains
      });
    }
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const domain = req.hostname;
    const strategyName = `replitauth:${domain}`;
    
    if (!allowedDomains.includes(domain)) {
      return res.status(400).json({ 
        error: "Domain not configured for authentication"
      });
    }
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  // Add route to check if user is authenticated
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
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
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
    return res.redirect("/api/login");
  }
};