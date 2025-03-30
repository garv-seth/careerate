import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userValidationSchema } from '@shared/schema';
import { authService } from './auth-service';
import { requireAuth, AuthenticatedRequest } from './auth-middleware';
import rateLimit from 'express-rate-limit';
import { storage } from '../../storage';

// Create router
const router = Router();

// Temporarily disable rate limiting as it's causing issues
// We'll implement a simpler version that doesn't rely on IP detection
const authLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Just pass through for now - no rate limiting
  next();
};

// Schema for login
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validationResult = userValidationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }
    
    const { email, password } = validationResult.data;
    
    try {
      // Register user
      const user = await authService.registerUser(email, password);
      
      // Generate token
      const token = authService.generateToken(user);
      
      // Set token in HTTP-only cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax',
        path: '/'
      });
      
      // Return success response
      return res.status(201).json({
        success: true,
        user,
        token // Include token in response for API clients
      });
    } catch (error: any) {
      // Handle user already exists error
      if (error.name === 'UserExistsError') {
        return res.status(409).json({
          success: false,
          error: 'Email already registered'
        });
      }
      
      // Handle other errors
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  } catch (error) {
    console.error('Unexpected registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request
    const validationResult = loginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }
    
    const { email, password } = validationResult.data;
    
    try {
      // Authenticate user
      const user = await authService.authenticateUser(email, password);
      
      // Generate token
      const token = authService.generateToken(user);
      
      // Set token in HTTP-only cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax',
        path: '/'
      });
      
      // Return success response
      return res.json({
        success: true,
        user,
        token // Include token in response for API clients
      });
    } catch (error) {
      // Use a generic error message to prevent user enumeration
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Unexpected login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Get current user (without authentication requirement for checking auth status)
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Extract token from cookie or header
    const token = req.cookies?.auth_token || 
      (req.headers.authorization?.startsWith('Bearer ') 
        ? req.headers.authorization.substring(7) 
        : null);
    
    if (!token) {
      return res.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }
    
    // Verify token
    const payload = authService.verifyToken(token);
    
    if (!payload) {
      return res.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }
    
    // Get user data
    const user = await storage.getUser(payload.userId);
    
    if (!user) {
      return res.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }
    
    // Return user data without password
    const { password, ...userWithoutPassword } = user;
    
    // Also fetch profile and skills if available
    const profile = await storage.getProfile(user.id);
    const skills = await storage.getUserSkills(user.id);
    
    return res.json({
      success: true,
      authenticated: true,
      user: userWithoutPassword,
      profile: profile || null,
      skills: skills || []
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch current user'
    });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  // Clear the auth cookie
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Export the router
export default router;