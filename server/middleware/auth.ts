import { Request, Response, NextFunction } from "express";

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
};

// Middleware to check if user has specific role
export const hasRole = (role: string) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  if (req.user && (req.user as any).role === role) {
    return next();
  }
  
  res.status(403).json({ error: "Insufficient permissions" });
};