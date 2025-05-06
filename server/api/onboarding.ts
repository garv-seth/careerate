import express, { Request, Response } from 'express';
import multer from 'multer';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';
import { uploadResume, getResume } from '../object-storage';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Check file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word documents, and text files are allowed.'));
    }
  }
});

// Handle resume upload
router.post('/upload-resume', isAuthenticated, upload.single('resume'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const userId = req.user.claims.sub;
    
    // Upload resume to storage
    const uploadResult = await uploadResume(req, res, () => {});
    
    // Extract text from resume using our AI agent
    const { agents } = require('../src/agents/agents');
    const resumeText = await agents.cara.extractResumeText(req.file.buffer);
    
    // Analyze resume to extract skills and experience
    const analysis = await agents.cara.analyzeResume(resumeText);
    
    // Store extracted text and analysis
    await storage.updateProfile(userId, {
      resumeText,
      lastScan: new Date(),
      extractedSkills: analysis.skills,
      yearsOfExperience: analysis.yearsOfExperience,
      currentRole: analysis.currentRole,
      educationLevel: analysis.educationLevel
    });

    return res.status(200).json({
      message: 'Resume uploaded and analyzed successfully',
      analysis
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    return res.status(500).json({ error: 'Failed to upload resume' });
  }
});

// Save user profile data
router.post('/user-profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const userId = req.user.claims.sub;
    const profileData = req.body;

    // Check if profile already exists
    const existingProfile = await storage.getProfileByUserId(userId);

    // Get resume text if it exists
    const resumeText = await getResume(userId);

    if (existingProfile) {
      // Update existing profile
      const updatedProfile = await storage.updateProfile(userId, {
        careerStage: profileData.careerStage,
        industryFocus: profileData.industryFocus,
        careerGoals: profileData.careerGoals,
        preferredLearningStyle: profileData.preferredLearningStyle,
        timeAvailability: profileData.timeAvailability
      });

      // Delete existing skills and add new ones
      await storage.deleteUserSkills(userId);
      
      if (profileData.skills && profileData.skills.length > 0) {
        for (const skill of profileData.skills) {
          await storage.addUserSkill({
            userId,
            name: skill.name,
            currentLevel: skill.level,
            targetLevel: Math.min(skill.level + 2, 5), // Target level is 2 higher than current (max 5)
            priority: Math.floor(skill.interest / 2) // Convert 1-10 interest to 1-5 priority
          });
        }
      }

      return res.status(200).json(updatedProfile);
    } else {
      // Create new profile
      const newProfile = await storage.createProfile({
        userId,
        resumeText,
        lastScan: resumeText ? new Date() : null,
        careerStage: profileData.careerStage,
        industryFocus: profileData.industryFocus,
        careerGoals: profileData.careerGoals,
        preferredLearningStyle: profileData.preferredLearningStyle,
        timeAvailability: profileData.timeAvailability
      });

      // Add skills
      if (profileData.skills && profileData.skills.length > 0) {
        for (const skill of profileData.skills) {
          await storage.addUserSkill({
            userId,
            name: skill.name,
            currentLevel: skill.level,
            targetLevel: Math.min(skill.level + 2, 5), // Target level is 2 higher than current (max 5)
            priority: Math.floor(skill.interest / 2) // Convert 1-10 interest to 1-5 priority
          });
        }
      }

      return res.status(201).json(newProfile);
    }
  } catch (error) {
    console.error('Error saving user profile:', error);
    return res.status(500).json({ error: 'Failed to save user profile' });
  }
});

// Get user profile data
router.get('/user-profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const userId = req.user.claims.sub;
    
    // Get profile data
    const profile = await storage.getProfileByUserId(userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Get skills data
    const skills = await storage.getUserSkills(userId);
    
    // Format response
    const responseData = {
      ...profile,
      skills: skills.map(skill => ({
        name: skill.name,
        currentLevel: skill.currentLevel,
        targetLevel: skill.targetLevel,
        interest: skill.priority ? skill.priority * 2 : 5 // Convert 1-5 priority to 1-10 interest scale
      }))
    };
    
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Check if onboarding is complete
router.get('/onboarding-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const userId = req.user.claims.sub;
    
    // Check if profile exists
    const profile = await storage.getProfileByUserId(userId);
    
    // Onboarding is complete if profile exists and has required fields filled
    const isComplete = Boolean(
      profile && 
      profile.careerStage && 
      profile.industryFocus && 
      profile.industryFocus.length > 0 &&
      profile.preferredLearningStyle &&
      profile.timeAvailability
    );
    
    return res.status(200).json({ isComplete });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return res.status(500).json({ error: 'Failed to check onboarding status' });
  }
});

export default router;