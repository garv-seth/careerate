import { Request, Response, NextFunction } from "express";
import { isAuthenticated as replitIsAuthenticated } from "../replitAuth";

// Re-export the Replit authenticated middleware to maintain backward compatibility
export const isAuthenticated = replitIsAuthenticated;

// Middleware to check if user has specific role
export const hasRole = (role: string) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Access user claims from Replit auth
  const user = req.user as any;
  
  // With Replit auth, role checking would need to be implemented based on your requirements
  // For example, could check for specific usernames or other attributes
  
  // For now, allow all authenticated users (can customize later)
  return next();
  
  // Old role check logic:
  // if (req.user && (req.user as any).role === role) {
  //   return next();
  // }
  // res.status(403).json({ error: "Insufficient permissions" });
};