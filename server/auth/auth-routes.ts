import { Router, Request, Response } from 'express';
import passport from 'passport';
import { registerUser } from './passport-config';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';
import { requireAuth } from './replit-auth';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = Router();

// Schema validation for registration
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// Schema validation for login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
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
  email: z.string().email()
});

// Schema validation for reset password
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6)
});

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const data = registerSchema.parse(req.body);
    
    // Check if user exists first
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Registration failed',
        message: 'This email is already registered. Please login instead.'
      });
    }
    
    // Register user using email as identifier
    const user = await registerUser(data.email, data.password);
    
    // Generate JWT token with long expiration (30 days)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'careerate-secret-key',
      { expiresIn: '30d' }
    );
    
    // Set token in HTTP-only cookie for better security
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      sameSite: 'lax'
    });
    
    // Return user and token
    res.json({
      success: true,
      user,
      token // Still include for backward compatibility
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      console.error('Registration error details:', error);
      // Show specific error message to users
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during registration';
      console.error('Registration error details:', error);
      
      res.status(400).json({
        success: false,
        error: `Registration failed: ${errorMessage}`
      });
    }
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    loginSchema.parse(req.body);
    
    const { email, password } = req.body;
    
    try {
      // Use the loginUser helper function which just verifies credentials
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect email or password'
        });
      }
      
      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect email or password'
        });
      }
      
      // Generate JWT token with long expiration (30 days)
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'careerate-secret-key',
        { expiresIn: '30d' } // Increased from 1 day to 30 days
      );
      
      // Set token in HTTP-only cookie for better security
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        sameSite: 'lax'
      });
      
      // Return user without password (still include token in response for legacy clients)
      const { password: _, ...userWithoutPassword } = user;
      
      return res.json({
        success: true,
        user: userWithoutPassword,
        token // Still include for backward compatibility
      });
    } catch (loginErr) {
      console.error('Login error:', loginErr);
      return res.status(500).json({
        success: false,
        error: 'Failed to login'
      });
    }
  } catch (error) {
    // This block handles validation errors only
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors
      });
    } else {
      console.error('Unexpected login error:', error);
      return res.status(500).json({
        success: false,
        error: 'An error occurred during login'
      });
    }
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  // Clear the auth cookie
  res.clearCookie('auth_token');
  
  // Also handle session logout if session is being used
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to logout'
      });
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
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
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
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