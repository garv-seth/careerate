import { Request, Response, NextFunction } from 'express';
import { authService } from './auth-service';
import { storage } from '../../storage';

// Request with authenticated user data
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    currentRole?: string | null;
    profileCompleted?: boolean | null;
    createdAt?: Date;
    updated_at?: Date | null;
    verified?: boolean | null;
  };
}

/**
 * Middleware to extract token from various sources (cookie, auth header)
 */
function extractToken(req: Request): string | null {
  // Try to get token from cookies
  const cookieToken = req.cookies?.auth_token;
  
  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  // Return the first available token
  return cookieToken || headerToken || null;
}

/**
 * Middleware to require authentication for protected routes
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Extract token from request
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Verify token
    const payload = authService.verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Get user from database to ensure it exists
    storage.getUser(payload.userId)
      .then(user => {
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'User not found'
          });
        }
        
        // Attach user to request object (except password)
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
        
        next();
      })
      .catch(error => {
        console.error('Error fetching user:', error);
        return res.status(500).json({
          success: false,
          error: 'Server error'
        });
      });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

/**
 * Middleware for optional authentication
 * Will attach user to request if token is valid, but won't require authentication
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Extract token from request
    const token = extractToken(req);
    
    // If no token, continue without authentication
    if (!token) {
      return next();
    }
    
    // Verify token
    const payload = authService.verifyToken(token);
    
    // If invalid token, continue without authentication
    if (!payload) {
      return next();
    }
    
    // Get user from database
    storage.getUser(payload.userId)
      .then(user => {
        if (user) {
          // Attach user to request object (except password)
          const { password, ...userWithoutPassword } = user;
          req.user = userWithoutPassword;
        }
        
        next();
      })
      .catch(() => {
        // Continue if error
        next();
      });
  } catch (error) {
    // Continue if error
    next();
  }
}