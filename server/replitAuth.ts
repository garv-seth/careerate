import passport from "passport";
import session from "express-session";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import connectPg from "connect-pg-simple";

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

export async function setupReplitAuth(app: Express) {
  // Configure passport
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  app.use(passport.initialize());
  app.use(passport.session());

  // Decide whether to use real Replit Auth or not
  if (process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER) {
    try {
      console.log("Setting up Replit Auth with OpenID Connect...");
      
      // Import the openid-client module dynamically to avoid TypeScript issues
      const { Issuer, Strategy } = await import('openid-client');
      
      // Discover the OpenID Connect provider
      const issuer = await Issuer.discover('https://replit.com/~');
      
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
      const client = new issuer.Client({
        client_id: process.env.REPL_ID,
        redirect_uris: redirectUris,
      });
      
      // Create a verify callback function for the OpenID client
      const verify = async (tokenSet: any, userinfo: any, done: Function) => {
        try {
          const userId = userinfo.sub;
          let user = await storage.getUser(userId);

          if (!user) {
            user = await storage.createUser({
              id: userId,
              username: userinfo.username || userinfo.name || `user-${userId}`,
              name: userinfo.name,
              email: userinfo.email,
              // OAuth users don't need a password as they authenticate via Replit
              password: "replit-oauth-user"
            });
          }

          return done(null, { ...user, claims: userinfo });
        } catch (error) {
          return done(error as Error);
        }
      };
      
      // Set up passport strategy
      passport.use('replit', new Strategy(
        {
          client,
          params: {
            scope: 'openid email profile offline_access'
          }
        },
        verify
      ));
      
      // Auth routes
      app.get("/api/login", (req, res, next) => {
        passport.authenticate('replit', {
          prompt: 'login consent',
        })(req, res, next);
      });
      
      app.get("/api/callback", (req, res, next) => {
        passport.authenticate('replit', {
          successRedirect: '/',
          failureRedirect: '/auth-test',
        })(req, res, next);
      });
      
      app.get("/api/logout", (req: any, res) => {
        req.logout(() => {
          res.redirect('/');
        });
      });
      
      console.log("Replit Auth setup completed successfully");
    } catch (error) {
      console.error("Failed to set up Replit Auth:", error);
      
      // Fall back to the auth-test page in case of error
      app.get("/api/login", (req, res) => {
        res.redirect("/auth-test");
      });
      
      app.get("/api/logout", (req: any, res) => {
        req.logout(() => {
          res.redirect("/");
        });
      });
    }
  } else {
    console.log("Running without Replit Auth - development or non-Replit environment");
    
    // Development fallback
    app.get("/api/login", (req, res) => {
      res.redirect("/auth-test");
    });
    
    app.get("/api/logout", (req: any, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });
  }
  
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

export const isAuthenticated = (req: any, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};