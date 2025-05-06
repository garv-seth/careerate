import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { setupReplitAuth } from "./replitAuth"; // Updated import

// Set up PostgreSQL session store
const PostgresSessionStore = connectPg(session);
const sessionStore = new PostgresSessionStore({ 
  pool,
  tableName: 'session', // Use explicit table name
  createTableIfMissing: false // Don't try to create the table if it already exists
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "careerate_development_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    sameSite: "lax"
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

import { setupSessionTable } from './setup-sessions';

(async () => {
  // Ensure session table is properly set up
  await setupSessionTable(pool);

  const server = await registerRoutes(app);
  await setupReplitAuth(app); // Updated auth setup call

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable if available, otherwise default to 5000
  // port 5000 is standard for Replit
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

//replitAuth.ts
import express from 'express';

export async function setupReplitAuth(app: express.Application) {
    // Implement Replit authentication logic here.  This is a placeholder.
    //  This would typically involve verifying the Replit auth token and setting up user sessions.
    app.get('/api/replit-auth', (req, res) => {
        //  Handle Replit Auth token verification here
        res.send("Replit Auth Endpoint"); // Replace with actual authentication logic
    });
}