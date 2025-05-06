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

  // Simplified Auth routes (these will be replaced with actual OpenID later)
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

  app.get("/api/login", (req: Request, res: Response) => {
    // Temporary login endpoint that redirects to auth test page
    res.redirect("/auth-test");
  });

  app.get("/api/logout", (req: any, res: Response) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated = (req: any, res: Response, next: NextFunction) => {
  // First check Passport authentication
  if (req.isAuthenticated()) {
    return next();
  }
  
  // For development, also check our custom session authentication
  if (process.env.NODE_ENV === "development" && req.session && (req.session as any).auth?.userId) {
    // Set req.user for API consumption
    req.user = {
      id: (req.session as any).auth.userId,
      ...(req.session as any).auth.user,
      // Add claims for compatibility with the Replit Auth approach
      claims: {
        sub: (req.session as any).auth.userId,
        name: (req.session as any).auth.user.name,
        email: (req.session as any).auth.user.email,
      }
    };
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};