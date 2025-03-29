import { Request, Response, NextFunction } from 'express';
import { authService } from './auth-service';
import { storage } from '../storage';
import crypto from 'crypto';

/**
 * Authentication middleware with modern security practices
 */

// Extract the token from various sources (cookie, Authorization header)
function extractToken(req: Request): string | null {
  // Check for token in cookies (preferred method for web applications)
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }
  
  // Check for token in Authorization header (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  return null;
}

// Verify the token and attach user to request
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract the token
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Verify the token
    const decoded = authService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Fetch the user from database
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Attach user to request for use in route handlers
    req.user = user;
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

// Optional auth middleware - attaches user if token is valid, but doesn't require it
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract the token
    const token = extractToken(req);
    if (!token) {
      return next(); // No token, just continue
    }
    
    // Verify the token
    const decoded = authService.verifyToken(token);
    if (!decoded) {
      return next(); // Invalid token, just continue
    }
    
    // Fetch the user from database
    const user = await storage.getUser(decoded.userId);
    if (user) {
      // Attach user to request for use in route handlers
      req.user = user;
    }
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    // Just continue if there's an error
    next();
  }
}

// CSRF protection middleware
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip for GET, HEAD, OPTIONS requests (they should be idempotent)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Check CSRF token in header against cookie
  const csrfToken = req.headers['x-csrf-token'] as string;
  const csrfCookie = req.cookies['csrf_token'];
  
  if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token validation failed'
    });
  }
  
  next();
}

// Generate and set CSRF token
export function setCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Generate a new CSRF token if one doesn't exist
  if (!req.cookies['csrf_token']) {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    // Set the CSRF token as a cookie (HTTP only for security)
    res.cookie('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: 'lax'
    });
    
    // Also expose it in a response header for the client to use
    res.setHeader('X-CSRF-Token', csrfToken);
  }
  
  next();
}

// Extend the Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: Express.User;
    }
  }
}