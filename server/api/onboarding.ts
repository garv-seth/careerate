import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';
import { uploadResume as storeResumeInObjectStorage, getResume } from '../object-storage';
import path from 'path';
import fs from 'fs';
import { ChatOpenAI } from "@langchain/openai";
import { createMayaAgent } from '../../src/agents/agents';
import { mayaInitialSystemPrompt } from '../../src/agents/prompts';
import { UserSkill } from '@shared/schema';

const router = express.Router();

// Configure multer for file uploads to disk
const tmpDir = path.join(process.cwd(), 'tmp', 'uploads');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const multerDiskStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, tmpDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word documents, and text files are allowed.'));
  }
};

const upload = multer({
  storage: multerDiskStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Initialize LLM for Maya
const llm = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || "gpt-4o",
    temperature: 0.2,
    apiKey: process.env.OPENAI_API_KEY,
});

// Create Maya instance
const maya = createMayaAgent(llm, mayaInitialSystemPrompt);

// Handle resume upload
router.post('/upload-resume', isAuthenticated, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = typeof req.user === 'object' && (req.user as any).id 
      ? (req.user as any).id 
      : (req.user as any).claims?.sub;
      
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }
    
    console.log(`Processing resume upload for user ${userId}`);
    
    upload.single('resume')(req, res, async (err: any) => {
      if (err) {
        console.error("Error in multer file upload:", err);
        const currentFile = req.file as Express.Multer.File;
        if (currentFile && currentFile.path && fs.existsSync(currentFile.path)) {
          try { fs.unlinkSync(currentFile.path); } catch (unlinkErr) { console.error("Error deleting temp file during multer error:", unlinkErr); }
        }
        return res.status(400).json({ error: err.message || 'File upload failed' });
      }
      
      const currentFile = req.file as Express.Multer.File;
      if (!currentFile) {
        console.error("No file was uploaded");
        return res.status(400).json({ error: 'No file was uploaded' });
      }

      let resumeFilePath = currentFile.path;

      try {
        const resumeText = await storeResumeInObjectStorage(currentFile, userId);
        console.log("Resume text extracted and file stored in object storage.");

        // Call Maya for analysis
        console.log(`Invoking Maya for user ${userId}...`);
        const mayaFullAnalysis = await maya.analyze(resumeText);
        console.log("Maya analysis completed.", mayaFullAnalysis);

        const mayaAnalysisResults = mayaFullAnalysis.results;
        const extractedSkillsFromMaya = mayaAnalysisResults?.skills;
        const extractedExperienceFromMaya = mayaAnalysisResults?.experience;
        const resumeSummaryFromMaya = mayaAnalysisResults?.summary;
        const strengths = mayaAnalysisResults?.strengths;
        const areasForDevelopment = mayaAnalysisResults?.areasForDevelopment;

        // Update profile with Maya's analysis
        const profileUpdateData: any = {
            resumeText: resumeText, 
            lastScan: new Date(),
        };
        if (resumeSummaryFromMaya) profileUpdateData.resumeSummary = resumeSummaryFromMaya;
        if (extractedSkillsFromMaya) profileUpdateData.extractedSkills = extractedSkillsFromMaya;
        if (extractedExperienceFromMaya) profileUpdateData.extractedExperience = extractedExperienceFromMaya;
        if (strengths) profileUpdateData.keyStrengths = strengths;
        if (areasForDevelopment) profileUpdateData.areasForDevelopment = areasForDevelopment;

        let userProfile = await storage.getProfileByUserId(userId);
        if (userProfile) {
            await storage.updateProfile(userId, profileUpdateData);
        } else {
            userProfile = await storage.createProfile({ 
                userId, 
                ...profileUpdateData, 
                // Ensure other required fields for createProfile are present if any, or set to defaults
                careerStage: '', 
                industryFocus: [], 
                careerGoals: '' 
            });
        }
        
        // Update user skills from Maya's analysis
        // (Assuming mayaAnalysis.skills is an array of skill strings or objects { name: string, level?: number })
        if (extractedSkillsFromMaya && Array.isArray(extractedSkillsFromMaya)) {
            await storage.deleteUserSkills(userId); // Clear old skills
            for (const skillObj of extractedSkillsFromMaya) {
                // Adapt this based on the actual structure of skillObj from Maya
                const skillName = typeof skillObj === 'string' ? skillObj : skillObj.name;
                const currentLevel = typeof skillObj === 'string' ? 1 : (skillObj.level || 1); // Default level if not provided
                
                if (skillName) {
                    // Check if skill exists in skillsLibrary, otherwise add it (or handle as per app logic)
                    // For now, we assume skills are just names stored in userSkills
                    // In a more complex system, userSkills would reference skillsLibrary
                    await storage.addUserSkill({
                        userId,
                        // skillId: // This would require looking up or creating in skillsLibrary
                        name: skillName, // Storing name directly for now
                        currentLevel: currentLevel, 
                        targetLevel: currentLevel + 1 > 5 ? 5 : currentLevel + 1, // Basic target
                        // priority: 1, // Default priority
                        // source: 'maya_resume_analysis' // Optional: add source
                    });
                }
            }
            console.log("User skills updated from Maya analysis.");
        }
        
        return res.status(200).json({
          message: 'Resume uploaded and analyzed successfully!',
          success: true,
          analysisSummary: {
            resumeSummary: resumeSummaryFromMaya,
            skillsFound: extractedSkillsFromMaya?.length || 0,
            // Add other key insights as needed
          }
        });
      } catch (error: any) {
        console.error('Error processing resume with Maya:', error);
        if (resumeFilePath && fs.existsSync(resumeFilePath)) {
          try { fs.unlinkSync(resumeFilePath); } catch (unlinkErr) { console.error("Error deleting temp file during processing error:", unlinkErr); }
        }
        return res.status(500).json({ error: error.message || 'Failed to process and analyze resume' });
      }
    });
  } catch (outerError: any) {
    console.error("Unexpected error in resume upload endpoint:", outerError);
    return res.status(500).json({ error: outerError.message || 'Server error during upload process' });
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