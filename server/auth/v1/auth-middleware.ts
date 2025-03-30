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
  try {
    // Try to get token from cookies
    const cookieToken = req.cookies?.auth_token;
    
    // Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader || null; // Also accept raw token without Bearer prefix
    
    // Return the first available token
    const token = cookieToken || headerToken || null;
    
    // Basic validation to ensure token is reasonably formatted (JWT tokens have 3 parts separated by dots)
    if (token && (token.length < 10 || !token.includes('.'))) {
      console.log('[Auth Debug] Token found but invalid format:', token.substring(0, 5) + '...');
      return null;
    }
    
    if (token) {
      console.log('[Auth Debug] Valid token found, length:', token.length);
    }
    
    return token;
  } catch (error) {
    console.error('[Auth Debug] Error extracting token:', error);
    return null;
  }
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
    // Log all requests to help debug
    console.log(`[Auth Debug] Request path: ${req.method} ${req.path}`);
    
    // Extract token from request
    const token = extractToken(req);
    
    // If no token, continue without authentication
    if (!token) {
      console.log('[Auth Debug] No token found');
      return next();
    }
    
    // Verify token
    const payload = authService.verifyToken(token);
    
    // If invalid token, continue without authentication
    if (!payload) {
      console.log('[Auth Debug] Invalid token');
      return next();
    }
    
    console.log(`[Auth Debug] Valid token for user ${payload.userId}`);
    
    // Get user from database
    storage.getUser(payload.userId)
      .then(user => {
        if (user) {
          // Attach user to request object (except password)
          const { password, ...userWithoutPassword } = user;
          req.user = userWithoutPassword;
          console.log(`[Auth Debug] User found: ${user.email}`);
        } else {
          console.log('[Auth Debug] User not found in database');
        }
        
        next();
      })
      .catch((err) => {
        // Continue if error
        console.log('[Auth Debug] Error retrieving user:', err);
        next();
      });
  } catch (error) {
    // Continue if error
    console.log('[Auth Debug] Authentication error:', error);
    next();
  }
}