import { Request, Response } from 'express';
import { storage } from '../../storage';
import { isAuthenticated } from '../../replitAuth';

/**
 * Admin endpoint to set a specific user to premium status
 */
export const setPremiumStatus = async (req: Request, res: Response) => {
  try {
    // Admin-only access check
    if (!(req.user as any)?.claims?.email === 'garv.seth@gmail.com') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: Admin access required' 
      });
    }

    const { userId, isPremium = true } = req.body;
    
    // Default to self if no userId is provided
    const targetUserId = userId || (req.user as any)?.claims?.sub;
    
    if (!targetUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    // Set subscription details
    const now = new Date();
    // Set an expiration date 1 year in the future
    const expirationDate = new Date();
    expirationDate.setFullYear(now.getFullYear() + 1);

    // Update user with premium status
    const updatedUser = await storage.updateUserSubscription(targetUserId, {
      subscriptionTier: isPremium ? 'premium' : 'free',
      subscriptionStatus: isPremium ? 'active' : 'free',
      subscriptionPeriodEnd: isPremium ? expirationDate : null
    });

    return res.status(200).json({
      success: true,
      message: `User ${targetUserId} premium status set to ${isPremium ? 'premium' : 'free'}`,
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error setting premium status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

/**
 * Express route handler for setting premium status
 */
export default [isAuthenticated, setPremiumStatus];