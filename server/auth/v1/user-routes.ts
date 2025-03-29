import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from './auth-middleware';
import { storage } from '../../storage';

// Create router
const router = Router();

// Get user profile with authentication required
router.get('/profile', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get the user's profile
    const profile = await storage.getProfile(req.user.id);
    
    // Get the user's skills
    const skills = await storage.getUserSkills(req.user.id);
    
    // Get the user's transitions
    const transitions = await storage.getTransitionsByUserId(req.user.id);
    
    return res.json({
      success: true,
      profile: profile || null,
      skills,
      transitions
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Update the user's current role
router.post('/update-role', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const { currentRole } = req.body;
    
    if (!currentRole) {
      return res.status(400).json({
        success: false,
        error: 'Current role is required'
      });
    }
    
    // Update the user's current role
    const updatedUser = await storage.updateUserRole(req.user.id, currentRole);
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Return the updated user data without password
    const { password, ...userWithoutPassword } = updatedUser;
    
    return res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user role'
    });
  }
});

// Export the router
export default router;