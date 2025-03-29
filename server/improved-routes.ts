/**
 * Improved Routes for Career Transition Agent
 * 
 * Contains optimized API routes for the lightweight SimpleMemoryAgent
 * to reduce resource usage during transitions. Also provides dedicated
 * authentication endpoints that bypass the Vite middleware.
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { IStorage } from './storage';
import { SimpleMemoryAgent, getSimpleMemoryAgent } from './agents/simpleMemoryAgent';
import { validateAPIKeys } from './validateApiKeys';
import { authService } from './auth/auth-service';
import { userValidationSchema, passwordSchema } from '@shared/schema';
import cookieParser from 'cookie-parser';

// Type for requests with user payload
interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

/**
 * Middleware to verify authentication tokens
 */
const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Extract token from cookie or Authorization header
    const token = req.cookies.auth_token || (
      req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null
    );
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No token provided'
      });
    }
    
    // Verify the token
    const payload = authService.verifyToken(token);
    
    if (!payload || !payload.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }
    
    // Attach the user payload to the request
    req.user = payload;
    
    // Continue to the next middleware/controller
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid token'
    });
  }
};

// Define the router
const improvedRouter = express.Router();

/**
 * GET /api/v2/health
 * Health check endpoint
 */
improvedRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/v2/api-keys
 * Check API key status
 */
improvedRouter.get('/api-keys', (req, res) => {
  const apiKeyStatus = validateAPIKeys();
  res.json({
    status: 'ok',
    keys: apiKeyStatus
  });
});

/**
 * POST /api/v2/transitions
 * Start a simple career transition analysis
 */
improvedRouter.post('/transitions', async (req, res) => {
  try {
    // Validate request body
    const schema = z.object({
      currentRole: z.string().min(2).max(100),
      targetRole: z.string().min(2).max(100),
      userId: z.number().optional().nullable()
    });
    
    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request body',
        errors: validationResult.error.errors
      });
    }
    
    const { currentRole, targetRole, userId = 1 } = validationResult.data;
    
    // Create a unique ID for this transition
    const transitionId = Date.now();
    
    // Start the analysis process (non-blocking)
    const storage = req.app.locals.storage as IStorage;
    const agent = getSimpleMemoryAgent(storage);
    
    // Start the analysis in the background
    agent.analyzeCareerTransition(
      currentRole,
      targetRole,
      userId ?? 1, // Ensure we have a number, not null
      transitionId
    ).catch(error => {
      console.error(`Background analysis error for transition ${transitionId}:`, error);
    });
    
    // Return the transition ID immediately
    res.json({
      status: 'ok',
      transitionId,
      message: 'Career transition analysis started',
      estimatedTime: '30-60 seconds'
    });
  } catch (error) {
    console.error('Error starting transition analysis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error starting transition analysis'
    });
  }
});

/**
 * GET /api/v2/user/profile
 * Get user profile data
 */
improvedRouter.get('/user/profile', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }
    
    // Get profile data
    const storage = req.app.locals.storage;
    const profile = await storage.getProfile(req.user.userId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }
    
    return res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error in /user/profile endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * PUT /api/v2/user/profile
 * Update user profile
 */
improvedRouter.put('/user/profile', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }
    
    // Validate request body
    // Note: We'll need to create a proper validation schema for profile updates
    
    // Update profile
    const storage = req.app.locals.storage;
    const updatedProfile = await storage.updateProfile(req.user.userId, req.body);
    
    return res.json({
      success: true,
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error in PUT /user/profile endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/v2/user/skills
 * Get user skills
 */
improvedRouter.get('/user/skills', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }
    
    // Get skills
    const storage = req.app.locals.storage;
    const skills = await storage.getUserSkills(req.user.userId);
    
    return res.json({
      success: true,
      skills: skills || []
    });
  } catch (error) {
    console.error('Error in /user/skills endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/v2/user/skills
 * Add a new skill
 */
improvedRouter.post('/user/skills', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }
    
    // Validate request body
    // Note: We'll need to create a proper validation schema for skills
    
    // Add skill
    const storage = req.app.locals.storage;
    const newSkill = await storage.addUserSkill(req.user.userId, req.body);
    
    return res.json({
      success: true,
      skill: newSkill
    });
  } catch (error) {
    console.error('Error in POST /user/skills endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

/**
 * GET /api/v2/transitions/:id
 * Get the status/results of a career transition analysis
 */
improvedRouter.get('/transitions/:id', async (req, res) => {
  try {
    const transitionId = parseInt(req.params.id, 10);
    
    if (isNaN(transitionId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid transition ID'
      });
    }
    
    const storage = req.app.locals.storage as IStorage;
    const agent = getSimpleMemoryAgent(storage);
    
    // This will return the current state from memory, without re-running the analysis
    const result = await agent.analyzeCareerTransition(
      '', // These values are ignored if there's already a memory for this transition
      '',
      1,
      transitionId
    );
    
    if (result.error) {
      return res.status(500).json({
        status: 'error',
        message: 'Error in transition analysis',
        error: result.error
      });
    }
    
    if (!result.complete) {
      return res.json({
        status: 'processing',
        message: 'Career transition analysis is still in progress',
        transitionId,
        partial: result
      });
    }
    
    res.json({
      status: 'complete',
      transitionId,
      result
    });
  } catch (error) {
    console.error('Error getting transition analysis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving transition analysis'
    });
  }
});

/**
 * Authentication endpoints that bypass the Vite middleware
 */

// Simple login endpoint
improvedRouter.post('/auth/login', async (req, res) => {
  try {
    // Validate request body
    const loginSchema = z.object({
      email: z.string().email("Valid email is required"),
      password: z.string().min(1, "Password is required")
    });
    
    const validatedData = loginSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validatedData.error.errors
      });
    }
    
    try {
      // Authenticate user with secure service
      const user = await authService.authenticateUser(validatedData.data.email, validatedData.data.password);
      
      // Generate secure token
      const token = authService.generateToken(user);
      
      // Set token in HTTP-only cookie with secure attributes
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        sameSite: 'lax',
        path: '/'
      });
      
      // Return success response with user data
      return res.json({
        success: true,
        user,
        token // Include for backward compatibility
      });
    } catch (authError) {
      console.error('Authentication error:', authError);
      // Use a generic error message to prevent user enumeration
      return res.status(401).json({
        success: false,
        error: 'Incorrect email or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login'
    });
  }
});

// Get current user endpoint
improvedRouter.get('/auth/me', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }
    
    try {
      
      // Get user data
      const storage = req.app.locals.storage;
      const user = await storage.getUser(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Remove password from user object
      const { password, ...userWithoutPassword } = user;
      
      // Get profile and skills
      const profile = await storage.getProfile(user.id);
      const skills = await storage.getUserSkills(user.id);
      
      return res.json({
        success: true,
        user: userWithoutPassword,
        profile: profile || null,
        skills: skills || []
      });
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }
  } catch (error) {
    console.error('Error in /me endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Logout endpoint
improvedRouter.post('/auth/logout', async (req, res) => {
  // Clear the auth cookie with secure attributes
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

// Simple registration endpoint
improvedRouter.post('/auth/register', async (req, res) => {
  try {
    // Validate request body
    const validatedData = userValidationSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validatedData.error.errors
      });
    }
    
    try {
      // Register user
      const user = await authService.registerUser(validatedData.data.email, validatedData.data.password);
      
      // Generate token
      const token = authService.generateToken(user);
      
      // Set token in HTTP-only cookie with secure attributes
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        sameSite: 'lax',
        path: '/'
      });
      
      // Return success response with user data
      return res.json({
        success: true,
        user,
        token // Include for backward compatibility
      });
    } catch (registrationError: any) {
      // Handle specific errors
      if (registrationError.name === 'UserExistsError') {
        return res.status(409).json({
          success: false,
          error: 'Registration failed',
          message: 'This email is already registered. Please login instead.'
        });
      }
      
      // Log the detailed error but return a generic message
      console.error('Registration error:', registrationError);
      return res.status(500).json({
        success: false,
        error: 'Failed to register user'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during registration'
    });
  }
});

/**
 * Export the router
 */
export default improvedRouter;

/**
 * Register improved routes function for Express app
 */
export async function registerRoutes(app: any): Promise<any> {
  const http = await import('http');
  const server = http.createServer(app);
  
  // Set up cookie parser middleware
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Import storage instance from main storage
  const { storage } = await import('./storage');
  app.locals.storage = storage;
  
  // Register the improved routes
  app.use('/api/v2', improvedRouter);
  
  return server;
}