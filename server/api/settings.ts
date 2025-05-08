
import express, { Request, Response } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';

const router = express.Router();

// Get user settings
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const userId = req.user.claims.sub;
    
    // Get settings from database
    const settings = await storage.getUserSettings(userId);
    
    if (!settings) {
      // Return default settings if none exist
      return res.status(200).json({
        models: {
          orchestration: 'claude-3-7-sonnet',
          resume: 'gpt-4-1106-preview',
          research: 'pplx-70b-online',
          learning: 'claude-3-7-haiku'
        },
        analysis: {
          deepAnalysis: false,
          realTimeMarketData: true
        },
        theme: {
          darkMode: true,
          highContrast: false
        }
      });
    }
    
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

// Update user settings
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const userId = req.user.claims.sub;
    const settingsData = req.body;
    
    // Validate settings data
    if (!settingsData || typeof settingsData !== 'object') {
      return res.status(400).json({ error: 'Invalid settings data' });
    }
    
    // Save settings to database
    const updatedSettings = await storage.updateUserSettings(userId, settingsData);
    
    return res.status(200).json(updatedSettings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    return res.status(500).json({ error: 'Failed to update user settings' });
  }
});

export default router;
