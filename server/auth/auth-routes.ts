import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { userValidationSchema, passwordSchema } from '@shared/schema';
import { authService } from './auth-service';
import { requireAuth, optionalAuth, csrfProtection, setCsrfToken } from './auth-middleware';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = Router();

// Apply CSRF protection to all routes
router.use(setCsrfToken);

// Apply rate limiting to sensitive routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many attempts, please try again later'
  }
});

// Schema validation for registration
const registerSchema = userValidationSchema;

// Schema validation for login - less strict for password during login
const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required")
});

// Schema validation for profile update
const profileUpdateSchema = z.object({
  bio: z.string().optional(),
  goals: z.string().optional(),
  experienceYears: z.number().int().min(0).optional(),
  education: z.string().optional()
});

// Schema validation for user skill
const userSkillSchema = z.object({
  skillName: z.string().min(1),
  proficiencyLevel: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional(),
  yearsOfExperience: z.number().int().min(0).optional()
});

// Schema validation for forgot password
const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required")
});

// Schema validation for reset password
const resetPasswordSchema = z.object({
  token: z.string(),
  password: passwordSchema
});

// Register a new user
router.post('/register', csrfProtection, authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request body with secure password requirements
    const data = registerSchema.parse(req.body);
    
    try {
      // Register user with our secure auth service
      const user = await authService.registerUser(data.email, data.password);
      
      // Generate secure JWT token
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
      res.json({
        success: true,
        user,
        token // Still include for backward compatibility
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
  } catch (validationError) {
    // Handle validation errors
    if (validationError instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validationError.errors
      });
    }
    
    // Unexpected errors
    console.error('Unexpected registration error:', validationError);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Login
router.post('/login', csrfProtection, authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    
    try {
      // Authenticate user with secure service
      const user = await authService.authenticateUser(validatedData.email, validatedData.password);
      
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
        token // Still include for backward compatibility
      });
    } catch (authError) {
      // Use a generic error message to prevent user enumeration
      return res.status(401).json({
        success: false,
        error: 'Incorrect email or password'
      });
    }
  } catch (validationError) {
    // Handle validation errors
    if (validationError instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: validationError.errors
      });
    }
    
    // Unexpected errors
    console.error('Unexpected login error:', validationError);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Logout
router.post('/logout', csrfProtection, (req: Request, res: Response) => {
  // Clear the auth cookie with secure attributes
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  
  // Handle passport session logout if being used
  if (req.logout) {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Failed to logout'
        });
      }
      
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } else {
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});

// Get current user
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    let userId: number;
    
    // Extract user ID from JWT token or session
    if (typeof req.user === 'object' && req.user !== null) {
      if ('id' in req.user) {
        userId = typeof req.user.id === 'number' ? req.user.id : parseInt(req.user.id as string);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    console.log('Getting user data for ID:', userId);
    
    // Find current user
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get user profile
    const profile = await storage.getProfile(user.id);
    
    // Get user skills
    const skills = await storage.getUserSkills(user.id);
    
    // Return user without password, profile, and skills
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword,
      profile: profile || null,
      skills: skills || []
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    let userId: number;
    
    // Extract user ID from JWT token or session
    if (typeof req.user === 'object' && req.user !== null) {
      if ('id' in req.user) {
        userId = typeof req.user.id === 'number' ? req.user.id : parseInt(req.user.id as string);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Validate request body
    const data = profileUpdateSchema.parse(req.body);
    
    // Check if profile exists
    let profile = await storage.getProfile(userId);
    
    if (profile) {
      // Update existing profile
      profile = await storage.updateProfile(userId, data);
    } else {
      // Create new profile
      profile = await storage.createProfile({
        userId,
        ...data
      });
    }
    
    // Set profile completed flag
    await storage.updateUserProfileStatus(userId, true);
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
});

// Add user skill
router.post('/skills', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const data = userSkillSchema.parse(req.body);
    
    // Get user ID
    const userId = (req.user as any).id;
    
    // Create skill
    const skill = await storage.createUserSkill({
      userId,
      skillName: data.skillName,
      proficiencyLevel: data.proficiencyLevel,
      yearsOfExperience: data.yearsOfExperience
    });
    
    res.json({
      success: true,
      skill
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to add skill'
      });
    }
  }
});

// Update user skill
router.put('/skills/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const data = userSkillSchema.parse(req.body);
    
    // Get skill ID
    const skillId = parseInt(req.params.id);
    
    if (isNaN(skillId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid skill ID'
      });
    }
    
    // Update skill
    const skill = await storage.updateUserSkill(skillId, data);
    
    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      });
    }
    
    res.json({
      success: true,
      skill
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update skill'
      });
    }
  }
});

// Delete user skill
router.delete('/skills/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    // Get skill ID
    const skillId = parseInt(req.params.id);
    
    if (isNaN(skillId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid skill ID'
      });
    }
    
    // Delete skill
    await storage.deleteUserSkill(skillId);
    
    res.json({
      success: true,
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete skill'
    });
  }
});

// Get all user skills
router.get('/skills', requireAuth, async (req: Request, res: Response) => {
  try {
    // Get user ID
    const userId = (req.user as any).id;
    
    // Get skills
    const skills = await storage.getUserSkills(userId);
    
    res.json({
      success: true,
      skills
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get skills'
    });
  }
});

// Update current role for user
router.put('/current-role', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { currentRole } = req.body;
    
    if (!currentRole || typeof currentRole !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Current role is required'
      });
    }
    
    // Get user ID
    const userId = (req.user as any).id;
    
    // Update user role
    const user = await storage.updateUserRole(userId, currentRole);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update current role'
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const data = forgotPasswordSchema.parse(req.body);
    
    // Check if user exists
    const user = await storage.getUserByEmail(data.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found with this email'
      });
    }
    
    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Save token to database
    await storage.createPasswordResetToken(user.id, token, expiresAt);
    
    // Return success with token (in a real production app, you would send this via email)
    res.json({
      success: true,
      message: 'Password reset link sent. Please check your email.',
      // For easier testing, include token in response - remove this in production
      // and send it via email instead
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to request password reset'
      });
    }
  }
});

// Verify reset token
router.get('/verify-reset-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    // Check if token exists and is valid
    const resetToken = await storage.getPasswordResetToken(token);
    
    if (!resetToken) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Check if token is expired
    if (new Date() > new Date(resetToken.expiresAt)) {
      await storage.deletePasswordResetToken(token);
      return res.status(400).json({
        success: false,
        error: 'Token has expired'
      });
    }
    
    res.json({
      success: true,
      message: 'Token is valid'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify token'
    });
  }
});

// Reset password using token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const data = resetPasswordSchema.parse(req.body);
    
    // Check if token exists and is valid
    const resetToken = await storage.getPasswordResetToken(data.token);
    
    if (!resetToken) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Check if token is expired
    if (new Date() > new Date(resetToken.expiresAt)) {
      await storage.deletePasswordResetToken(data.token);
      return res.status(400).json({
        success: false,
        error: 'Token has expired'
      });
    }
    
    // Hash the new password using authService
    const hashedPassword = await authService.hashPassword(data.password);
    
    // Update user password
    const user = await storage.updatePassword(resetToken.userId, hashedPassword);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Delete the token
    await storage.deletePasswordResetToken(data.token);
    
    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password'
      });
    }
  }
});

export default router;