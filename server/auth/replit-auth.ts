import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { registerUser } from './passport-config';

interface ReplitIdentity {
  id: string;
  name: string;
  email?: string;
  roles?: string[];
}

/**
 * Extract Replit identity from X-Replit-User-ID and X-Replit-User-Name headers
 */
export function extractReplitIdentity(req: Request): ReplitIdentity | null {
  // Check if X-Replit-User-ID and X-Replit-User-Name headers are present
  const userId = req.headers['x-replit-user-id'];
  const userName = req.headers['x-replit-user-name'];
  const userRoles = req.headers['x-replit-user-roles'];
  const userEmail = req.headers['x-replit-user-email'];
  
  if (!userId || !userName) {
    return null;
  }
  
  return {
    id: typeof userId === 'string' ? userId : userId[0],
    name: typeof userName === 'string' ? userName : userName[0],
    email: typeof userEmail === 'string' ? userEmail : userEmail ? userEmail[0] : undefined,
    roles: typeof userRoles === 'string' ? userRoles.split(',') : userRoles ? userRoles[0].split(',') : undefined
  };
}

/**
 * Middleware to handle Replit authentication
 * If a user doesn't exist, it creates one automatically
 */
export async function handleReplitAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip authentication for non-API routes
    if (!req.path.startsWith('/api')) {
      return next();
    }
    
    // Skip authentication for auth routes
    if (req.path.startsWith('/api/auth')) {
      return next();
    }
    
    // Check if user is already authenticated via session
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    
    // Extract Replit identity
    const identity = extractReplitIdentity(req);
    
    if (!identity) {
      // Not authenticated with Replit
      // Just continue for now, but routes can handle unauthenticated access
      return next();
    }
    
    // Check if user exists in our database
    let user = await storage.getUserByUsername(identity.name);
    
    if (!user) {
      // User doesn't exist, create new user
      // Generate a secure random password (user won't need it due to SSO)
      const randomPassword = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
      
      try {
        // Create user with Replit identity
        user = await registerUser(identity.name, randomPassword, identity.email);
      } catch (error) {
        console.error('Error creating user from Replit identity:', error);
        return next();
      }
    }
    
    // Set user to request
    req.user = user;
    
    // JWT token for API authentication (for client-side API calls)
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'careerate-secret-key',
      { expiresIn: '1d' }
    );
    
    // Set token in response header
    res.setHeader('X-Auth-Token', token);
    
    next();
  } catch (error) {
    console.error('Error in Replit auth middleware:', error);
    next();
  }
}

/**
 * Middleware to check if user is authenticated
 * Use this for routes that require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated via session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Check if user is authenticated via Replit
  if (req.user) {
    return next();
  }
  
  // Check if user is authenticated via JWT
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'careerate-secret-key');
      req.user = decoded;
      return next();
    } catch (error) {
      console.error('Invalid token:', error);
    }
  }
  
  // User is not authenticated
  res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'You must be logged in to access this resource'
  });
}