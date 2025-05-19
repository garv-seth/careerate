import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { getSession } from "./replitAuth"; // Updated import

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set app to trust proxies for secure cookies behind load balancers
app.set("trust proxy", 1);

// Add CORS headers for development
app.use((req, res, next) => {
  // Allow requests from Replit domains and local development
  const allowedOrigins = [
    'https://gocareerate.com',
    'https://careerate.replit.dev',
    'http://localhost:5000'
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Configure session middleware (now from replitAuth.ts)
app.use(getSession());

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

  // Auth setup is now handled inside registerRoutes
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error but don't throw it again
    console.error("Error caught in global handler:", err);
    
    // Ensure we only send a response if one hasn't been sent already
    if (!res.headersSent) {
      return res.status(status).json({ error: message });
    }
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
  const startServer = (port: number, maxRetries = 3, currentRetry = 0) => {
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    })
    .on('listening', () => {
      log(`Server started successfully on port ${port}`);
    })
    .on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        if (currentRetry < maxRetries) {
          log(`Port ${port} is in use, trying to kill the process...`);
          
          // Try next port if current is in use
          const nextPort = port + 1;
          log(`Attempting to use port ${nextPort} instead (attempt ${currentRetry + 1}/${maxRetries})...`);
          startServer(nextPort, maxRetries, currentRetry + 1);
        } else {
          log(`Failed to find an available port after ${maxRetries} attempts.`);
          log(`Try manually terminating the process using port ${port}.`);
          process.exit(1);
        }
      } else {
        log(`Server error: ${err.message}`);
        throw err;
      }
    });
  };
  
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  startServer(port);
})();