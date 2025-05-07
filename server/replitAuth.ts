import { Issuer, Client, Strategy, type VerifyFunction } from "openid-client";
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

const REPLIT_DOMAIN = 'bfd824a8-80f1-45b8-9c48-fc95b77a9105-00-14k8dzmk8x22u.riker.replit.dev';
const PRODUCTION_DOMAIN = 'gocareerate.com';

// Basic Replit Auth configuration
const REPLIT_CLIENT_CONFIG = {
  client_id: 'replit',
  redirect_uris: [
    `https://${REPLIT_DOMAIN}/api/callback`,
    `https://${PRODUCTION_DOMAIN}/api/callback`
  ],
  response_types: ['code'],
  token_endpoint_auth_method: 'none'
};

const getOidcConfig = memoize(
  async () => {
    console.log("Discovering Replit OIDC configuration...");
    const issuer = await Issuer.discover('https://replit.com/.well-known/openid-configuration');
    return {
      ...issuer.metadata,
      token_endpoint_auth_method: 'none',
      authorization_endpoint: 'https://replit.com/auth_with_repl_site',
      token_endpoint: 'https://replit.com/auth_with_repl_site/token'
    };
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
      secure: process.env.NODE_ENV === 'production',
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

  app.set("trust proxy", true);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, cb) => {
    console.log(`Serializing user: ${user.claims?.username || 'unknown'}`);
    cb(null, user);
  });

  passport.deserializeUser((obj: any, cb) => {
    console.log(`Deserializing user: ${obj.claims?.username || 'unknown'}`);
    cb(null, obj);
  });

  try {
    console.log("Setting up Replit Auth...");

    const currentDomain = process.env.NODE_ENV === 'production' ? PRODUCTION_DOMAIN : REPLIT_DOMAIN;
    console.log(`Using domain for auth: ${currentDomain}`);

    const config = await getOidcConfig();
    console.log("OIDC configuration discovered successfully");

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

    const strategy = new Strategy(
      {
        client: new Client({
          ...REPLIT_CLIENT_CONFIG,
          ...config
        }),
        params: {
          scope: "openid email profile offline_access"
        },
        passReqToCallback: false,
        usePKCE: true,
      },
      verify
    );

    passport.use("replit", strategy);
    console.log("Passport strategy registered");

    app.get("/api/login", (req, res, next) => {
      if (req.query.returnTo) {
        req.session.returnTo = req.query.returnTo as string;
      }

      passport.authenticate("replit", {
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      console.log("Processing callback from Replit Auth");

      passport.authenticate("replit", (err: any, user: any) => {
        if (err) {
          console.error("Authentication error:", err);
          return res.redirect("/?error=auth_error");
        }

        if (!user) {
          console.error("No user returned from authentication");
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

    app.get("/api/logout", (req: any, res) => {
      const returnTo = req.query.returnTo || "/";
      req.logout(() => {
        res.redirect(returnTo as string);
      });
    });

    console.log("Replit Auth setup complete!");
  } catch (error) {
    console.error("Failed to set up Replit Auth:", error);
    throw error;
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    console.log("Unauthorized request - user not authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;

  if (!user?.claims?.exp) {
    console.log("Invalid user session - no expiration claim");
    return res.status(401).json({ message: "Invalid user session" });
  }

  const now = Math.floor(Date.now() / 1000);

  if (now <= user.claims.exp) {
    return next();
  }

  console.log("Token expired, attempting refresh");

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("No refresh token available");
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log("Token refreshed successfully");
    return next();
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.redirect("/api/login");
  }
};