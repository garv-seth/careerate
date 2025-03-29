import express, { type Request, Response, NextFunction } from "express";
// Import only the original routes system
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import { validateAPIKeys } from "./validateApiKeys";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  try {
    // Initialize database tables
    await initializeDatabase();
    
    // Validate API keys
    try {
      const keysStatus = validateAPIKeys();
      console.log("API Key Status:", keysStatus);
    } catch (validationError) {
      console.warn("API key validation failed, but continuing with startup:", validationError);
    }
    
    // Register routes with our standard function
    console.log("Using standard authentication system");
    
    // Initialize server
    let server = await registerRoutes(app);

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

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const tryPort = async (startPort: number): Promise<number> => {
      for (let port = startPort; port < startPort + 10; port++) {
        try {
          await new Promise((resolve, reject) => {
            server.listen({
              port,
              host: "0.0.0.0",
              reusePort: true,
            }, () => resolve(port))
              .once('error', reject);
          });
          return port;
        } catch (err) {
          if (port === startPort + 9) throw err;
          continue;
        }
      }
      throw new Error('No available ports found');
    };

    const port = await tryPort(5000);
    log(`serving on port ${port}`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
