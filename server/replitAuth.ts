import passport from "passport";
import session from "express-session";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import connectPg from "connect-pg-simple";

// Define session setup function
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
    secret: process.env.SESSION_SECRET || "developmentsecret", // You should set SESSION_SECRET in production
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

// Main auth setup function
export async function setupReplitAuth(app: Express) {
  console.log("Setting up Replit Auth...");

  // Configure passport serialization
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  try {
    // Dynamically import openid-client to handle ESM compatibility
    const openidClient = await import('openid-client');
    const { Issuer } = openidClient;
    
    // Discover the OpenID Connect provider
    const replitIssuer = await Issuer.discover('https://replit.com/~');
    console.log('Discovered Replit issuer %s', replitIssuer.issuer);

    // Get all possible domains for the current Repl
    const domains = process.env.REPLIT_DOMAINS ? 
      process.env.REPLIT_DOMAINS.split(',') : 
      [`${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`];

    // Add production domain if in production
    if (process.env.NODE_ENV === 'production' && process.env.PRODUCTION_DOMAIN) {
      domains.push(process.env.PRODUCTION_DOMAIN);
    }

    // Generate all possible redirect URIs
    const redirectUris = domains.map(domain => 
      `https://${domain}/api/callback`
    );

    console.log(`Replit Auth redirect URIs: ${redirectUris.join(', ')}`);

    // Configure the OpenID client
    const client = new replitIssuer.Client({
      client_id: process.env.REPL_ID!,
      redirect_uris: redirectUris,
      response_types: ['code'],
    });

    // Import passport strategy
    const { Strategy } = await import('openid-client/passport');

    const strategy = new Strategy(
      {
        client,
        params: {
          scope: 'openid email profile offline_access'
        }
      } as any, 
      async (tokenSet: any, userinfo: any, done: any) => {
        try {
          console.log('Received userinfo', userinfo);
          // Use the 'sub' field as a stable user ID
          const userId = userinfo.sub;
          
          // Check if the user already exists
          let user = await storage.getUser(userId);
          
          if (!user) {
            // Create a new user if they don't exist
            user = await storage.createUser({
              id: userId,
              username: userinfo.preferred_username || userinfo.name || `user-${userId}`,
              name: userinfo.name,
              email: userinfo.email,
              password: "replit-oauth-user" // OAuth users authenticate via Replit
            });
          }
          
          // Add the claims to the user object that will be stored in the session
          return done(null, { ...user, claims: userinfo });
        } catch (error) {
          return done(error);
        }
      }
    );

    passport.use('replit', strategy);

    // Setup auth routes
    app.get("/api/login", (req, res, next) => {
      passport.authenticate('replit', {
        prompt: 'login consent',
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      passport.authenticate('replit', {
        successRedirect: '/',
        failureRedirect: '/',
      })(req, res, next);
    });

    console.log("Replit Auth setup complete!");
  } catch (error) {
    console.error("Failed to set up Replit Auth:", error);
    console.log("Falling back to basic auth...");
    
    // Setup a basic auth endpoint in case Replit Auth fails
    app.get("/api/login", (req, res) => {
      res.redirect('/');
    });
  }

  // Common routes that work regardless of authentication method

  // Logout route
  app.get("/api/logout", (req: any, res) => {
    if (req.logout) {
      req.logout(() => {
        res.redirect('/');
      });
    } else {
      req.session.destroy(() => {
        res.redirect('/');
      });
    }
  });

  // User data endpoint
  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    const userId = req.user?.id || req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

// Authentication middleware
export const isAuthenticated = (req: any, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};