import { Router, Request, Response } from 'express';
import multer from 'multer';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';
import { uploadResume } from '../object-storage';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF, DOC, and DOCX files
    if (
      file.mimetype === 'application/pdf' || 
      file.mimetype === 'application/msword' || 
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Upload resume
router.post('/upload-resume', isAuthenticated, upload.single('resume'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = (req.user as any)?.claims?.sub as string;
    
    // Use the ResumeText extraction functionality
    await uploadResume(req, res, () => {});
    
    res.status(200).json({ message: 'Resume uploaded successfully' });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ message: 'Error uploading resume' });
  }
});

// Create or update user profile
router.post('/user-profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.claims?.sub as string;
    const {
      careerStage,
      industryFocus,
      careerGoals,
      skills,
      preferredLearningStyle,
      timeAvailability
    } = req.body;

    // Get existing profile
    const existingProfile = await storage.getProfileByUserId(userId);
    
    if (existingProfile) {
      // Update profile with preferences
      const updatedProfile = await storage.updateProfile(
        userId,
        {
          careerStage,
          industryFocus,
          careerGoals,
          preferredLearningStyle,
          timeAvailability
        }
      );
      
      // Handle skills separately
      if (skills && skills.length > 0) {
        // First remove existing skills
        await storage.deleteUserSkills(userId);
        
        // Then add new skills
        for (const skill of skills) {
          await storage.addUserSkill({
            userId,
            name: skill.name,
            currentLevel: skill.level,
            targetLevel: Math.min(skill.level + 2, 10), // Default target is 2 levels higher
            priority: skill.interest >= 8 ? 2 : skill.interest >= 5 ? 1 : 0
          });
        }
      }
      
      res.status(200).json(updatedProfile);
    } else {
      // Create new profile with default values and overrides
      const newProfile = await storage.createProfile({
        userId,
        resumeText: null,
        lastScan: null,
        careerStage,
        industryFocus,
        careerGoals,
        preferredLearningStyle,
        timeAvailability
      });
      
      // Add skills
      if (skills && skills.length > 0) {
        for (const skill of skills) {
          await storage.addUserSkill({
            userId,
            name: skill.name,
            currentLevel: skill.level,
            targetLevel: Math.min(skill.level + 2, 10), // Default target is 2 levels higher
            priority: skill.interest >= 8 ? 2 : skill.interest >= 5 ? 1 : 0
          });
        }
      }
      
      res.status(201).json(newProfile);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error updating user profile' });
  }
});

// Get user profile
router.get('/user-profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.claims?.sub as string;
    
    // Get profile data
    const profile = await storage.getProfileByUserId(userId);
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    // Get skills data
    const skills = await storage.getUserSkills(userId);
    
    // Combine data
    const result = {
      ...profile,
      skills
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Error getting user profile' });
  }
});

// Check if onboarding is complete
router.get('/onboarding-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.claims?.sub as string;
    
    // Get profile data
    const profile = await storage.getProfileByUserId(userId);
    
    // If profile exists and has basic fields filled out, onboarding is complete
    const isComplete = Boolean(
      profile && 
      profile.careerStage && 
      profile.preferredLearningStyle
    );
    
    res.status(200).json({ isComplete });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({ message: 'Error checking onboarding status' });
  }
});

export default router;