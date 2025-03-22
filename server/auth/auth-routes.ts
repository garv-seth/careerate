import { Router, Request, Response } from 'express';
import passport from 'passport';
import { registerUser } from './passport-config';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';
import { requireAuth } from './replit-auth';
import { z } from 'zod';

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

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const data = registerSchema.parse(req.body);
    
    // Register user using email as identifier
    const user = await registerUser(data.email, data.password);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'careerate-secret-key',
      { expiresIn: '1d' }
    );
    
    // Return user and token
    res.json({
      success: true,
      user,
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
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during registration'
      });
    }
  }
});

// Login
router.post('/login', (req: Request, res: Response, next) => {
  try {
    // Validate request body
    loginSchema.parse(req.body);
    
    passport.authenticate('local', (err: Error, user: any, info: any) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error'
        });
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: info.message || 'Invalid credentials'
        });
      }
      
      // Log in the user
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            error: 'Failed to login'
          });
        }
        
        // Generate JWT token
        const token = jwt.sign(
          { id: user.id, email: user.email },
          process.env.JWT_SECRET || 'careerate-secret-key',
          { expiresIn: '1d' }
        );
        
        // Return user without password and token
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
          success: true,
          user: userWithoutPassword,
          token
        });
      });
    })(req, res, next);
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
        error: 'An error occurred during login'
      });
    }
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
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
    // Find current user
    const user = await storage.getUser((req.user as any).id);
    
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
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const data = profileUpdateSchema.parse(req.body);
    
    // Get user ID
    const userId = (req.user as any).id;
    
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

export default router;