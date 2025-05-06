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
  // Configure passport serialization
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  console.log("Setting up temporary auth system for development");
  
  // Setup auth-test routes for development
  app.post("/api/development/login", async (req: Request, res: Response) => {
    try {
      const { username, email } = req.body;
      
      // Generate a stable ID based on username (for development)
      const userId = `dev_${Buffer.from(username).toString('hex').slice(0, 10)}`;
      
      // Check if user exists
      let user = await storage.getUser(userId);
      
      // Create user if not exists
      if (!user) {
        user = await storage.createUser({
          id: userId,
          username,
          name: username,
          email,
          password: "development-user"
        });
      }
      
      // Log in the user
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login error" });
        }
        
        res.status(200).json({ 
          message: "Login successful",
          user
        });
      });
      
    } catch (error) {
      console.error("Development login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  // Setup auth routes
  app.get("/api/login", (req, res) => {
    // In a real system, this would redirect to Replit Auth
    // For now, redirect to development auth page
    res.redirect("/auth-test");
  });
  
  // Common logout route
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
    const userId = req.user?.id;
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