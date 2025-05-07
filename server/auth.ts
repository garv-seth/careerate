import express from "express";
import passport from "passport";
import { storage } from "./storage";
import { Strategy } from "passport-local";
import type { Express } from "express";

const router = express.Router();

// Configure local strategy
passport.use(
  new Strategy(async (username, password, done) => {
    try {
      // Find user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }
      
      // Simple password check (in a real app, use bcrypt to hash passwords)
      if (user.password !== password) {
        return done(null, false, { message: "Incorrect password." });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// Serialize and deserialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Register routes
router.post("/api/auth/login", (req, res, next) => {
  const domain = req.hostname;
  passport.authenticate(`replitauth:${domain}`, {
    successRedirect: '/dashboard',
    failureRedirect: '/'
  })(req, res, next);
});

router.post("/api/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.sendStatus(200);
  });
});

router.post("/api/auth/register", async (req, res, next) => {
  try {
    const { username, password, name, email } = req.body;
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }
    
    // Create new user - ensure we provide all required fields including a generated ID
    const newUser = await storage.createUser({
      id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Generate a unique ID
      username,
      password, // In a real app, hash this password
      name: name || username,
      email: email || null,
    });
    
    // Log in the new user
    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }
      return res.status(201).json(newUser);
    });
  } catch (error) {
    next(error);
  }
});

router.get("/api/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json(req.user);
  }
  return res.status(401).json({ message: "Unauthorized" });
});

export default router;

export function setupAuth(app: Express) {
  // Ensure session middleware is applied first in your main app
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(router);
}