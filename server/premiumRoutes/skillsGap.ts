import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';
import { insertUserSkillSchema, insertLearningPathSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get all skills in the library
router.get('/api/premium/skills', isAuthenticated, async (req: any, res) => {
  try {
    const category = req.query.category;
    const skills = await storage.getAllSkills(category);
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ message: 'Failed to fetch skills' });
  }
});

// Get a specific skill
router.get('/api/premium/skills/:id', isAuthenticated, async (req: any, res) => {
  try {
    const skillId = parseInt(req.params.id);
    if (isNaN(skillId)) {
      return res.status(400).json({ message: 'Invalid skill ID' });
    }

    const skill = await storage.getSkillById(skillId);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    res.json(skill);
  } catch (error) {
    console.error('Error fetching skill details:', error);
    res.status(500).json({ message: 'Failed to fetch skill details' });
  }
});

// Get user's skills
router.get('/api/premium/my-skills', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const skills = await storage.getUserSkills(userId);
    res.json(skills);
  } catch (error) {
    console.error('Error fetching user skills:', error);
    res.status(500).json({ message: 'Failed to fetch user skills' });
  }
});

// Add a skill to user's profile
router.post('/api/premium/my-skills', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Validate request body
    const validatedData = insertUserSkillSchema.parse({
      ...req.body,
      userId
    });

    const skill = await storage.addUserSkill(validatedData);
    res.status(201).json(skill);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error adding user skill:', error);
    res.status(500).json({ message: 'Failed to add user skill' });
  }
});

// Update user's skill level
router.patch('/api/premium/my-skills/:id', isAuthenticated, async (req: any, res) => {
  try {
    const skillId = parseInt(req.params.id);
    if (isNaN(skillId)) {
      return res.status(400).json({ message: 'Invalid skill ID' });
    }

    const { currentLevel, targetLevel } = req.body;
    if (typeof currentLevel !== 'number' || typeof targetLevel !== 'number') {
      return res.status(400).json({ message: 'Current level and target level are required' });
    }

    const updatedSkill = await storage.updateUserSkillLevel(skillId, currentLevel, targetLevel);
    res.json(updatedSkill);
  } catch (error) {
    console.error('Error updating skill level:', error);
    res.status(500).json({ message: 'Failed to update skill level' });
  }
});

// Get learning resources for specific skills
router.get('/api/premium/learning-resources', isAuthenticated, async (req: any, res) => {
  try {
    const skillIds = req.query.skillIds;
    if (!skillIds) {
      return res.status(400).json({ message: 'Skill IDs are required' });
    }

    const skillIdArray = Array.isArray(skillIds) 
      ? skillIds.map(id => parseInt(id)) 
      : [parseInt(skillIds)];

    const resources = await storage.getLearningResourcesBySkillIds(skillIdArray);
    res.json(resources);
  } catch (error) {
    console.error('Error fetching learning resources:', error);
    res.status(500).json({ message: 'Failed to fetch learning resources' });
  }
});

// Get a specific learning resource
router.get('/api/premium/learning-resources/:id', isAuthenticated, async (req: any, res) => {
  try {
    const resourceId = parseInt(req.params.id);
    if (isNaN(resourceId)) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }

    const resource = await storage.getLearningResourceById(resourceId);
    if (!resource) {
      return res.status(404).json({ message: 'Learning resource not found' });
    }

    res.json(resource);
  } catch (error) {
    console.error('Error fetching learning resource details:', error);
    res.status(500).json({ message: 'Failed to fetch learning resource details' });
  }
});

// Get user's learning paths
router.get('/api/premium/my-learning-paths', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const paths = await storage.getUserLearningPaths(userId);
    res.json(paths);
  } catch (error) {
    console.error('Error fetching user learning paths:', error);
    res.status(500).json({ message: 'Failed to fetch learning paths' });
  }
});

// Get a specific learning path with its resources
router.get('/api/premium/learning-paths/:id', isAuthenticated, async (req: any, res) => {
  try {
    const pathId = parseInt(req.params.id);
    if (isNaN(pathId)) {
      return res.status(400).json({ message: 'Invalid learning path ID' });
    }

    const path = await storage.getLearningPathById(pathId);
    if (!path) {
      return res.status(404).json({ message: 'Learning path not found' });
    }

    // Verify path belongs to the user
    if (path.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'You do not have permission to view this learning path' });
    }

    res.json(path);
  } catch (error) {
    console.error('Error fetching learning path details:', error);
    res.status(500).json({ message: 'Failed to fetch learning path details' });
  }
});

// Create a new learning path
router.post('/api/premium/learning-paths', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Validate request body
    const validatedData = insertLearningPathSchema.parse({
      ...req.body,
      userId
    });

    const path = await storage.createLearningPath(validatedData);
    res.status(201).json(path);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating learning path:', error);
    res.status(500).json({ message: 'Failed to create learning path' });
  }
});

// Add a resource to a learning path
router.post('/api/premium/learning-paths/:id/resources', isAuthenticated, async (req: any, res) => {
  try {
    const pathId = parseInt(req.params.id);
    if (isNaN(pathId)) {
      return res.status(400).json({ message: 'Invalid learning path ID' });
    }

    const { resourceId, order } = req.body;
    if (!resourceId || typeof order !== 'number') {
      return res.status(400).json({ message: 'Resource ID and order are required' });
    }

    // Verify path belongs to the user
    const path = await storage.getLearningPathById(pathId);
    if (!path) {
      return res.status(404).json({ message: 'Learning path not found' });
    }

    if (path.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'You do not have permission to modify this learning path' });
    }

    const pathResource = await storage.addResourceToLearningPath(pathId, resourceId, order);
    res.status(201).json(pathResource);
  } catch (error) {
    console.error('Error adding resource to learning path:', error);
    res.status(500).json({ message: 'Failed to add resource to learning path' });
  }
});

// Mark a resource as completed in a learning path
router.patch('/api/premium/learning-paths/:pathId/resources/:resourceId/complete', isAuthenticated, async (req: any, res) => {
  try {
    const pathId = parseInt(req.params.pathId);
    const resourceId = parseInt(req.params.resourceId);
    
    if (isNaN(pathId) || isNaN(resourceId)) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }

    // Verify path belongs to the user
    const path = await storage.getLearningPathById(pathId);
    if (!path) {
      return res.status(404).json({ message: 'Learning path not found' });
    }

    if (path.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'You do not have permission to modify this learning path' });
    }

    const completedResource = await storage.markResourceAsCompleted(pathId, resourceId);
    const progress = await storage.getLearningPathProgress(pathId);
    
    res.json({ 
      completedResource,
      progress
    });
  } catch (error) {
    console.error('Error marking resource as completed:', error);
    res.status(500).json({ message: 'Failed to mark resource as completed' });
  }
});

// Generate a personalized skills gap analysis using AI
router.post('/api/premium/skills-gap-analysis', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { targetRole } = req.body;
    
    if (!targetRole) {
      return res.status(400).json({ message: 'Target role is required' });
    }

    // Get user's profile and resume
    const profile = await storage.getProfileByUserId(userId);
    if (!profile?.resumeText) {
      return res.status(400).json({ message: 'No resume found. Please upload your resume first.' });
    }

    // Import the Perplexity API client to help generate content
    const { queryPerplexity } = await import('../../src/agents/perplexity');

    // Generate skills gap analysis with AI
    const prompt = `
      You are an expert skills analyst. Based on the following resume, create a detailed skills gap analysis for someone targeting the role of "${targetRole}".
      
      RESUME:
      ${profile.resumeText}
      
      Your response should be in this JSON format:
      {
        "currentSkillsAssessment": [
          {
            "skill": "Skill name",
            "currentLevel": 1-10,
            "targetLevel": 1-10,
            "gap": 0-10,
            "priority": 0-2 (0=normal, 1=high, 2=critical),
            "description": "Description of the gap and importance"
          }
        ],
        "missingCriticalSkills": [
          {
            "skill": "Skill name",
            "description": "Why this skill is critical",
            "learningDifficulty": 1-10,
            "timeToAcquire": "Estimated time (e.g., '3 months')"
          }
        ],
        "recommendedLearningPath": {
          "name": "Path name",
          "description": "Overall learning path description",
          "estimatedTimeToComplete": "Estimated time (e.g., '6 months')",
          "resources": [
            {
              "title": "Resource title",
              "type": "Resource type (course, book, etc.)",
              "provider": "Provider name",
              "url": "URL to resource",
              "duration": "Estimated duration",
              "difficulty": "beginner|intermediate|advanced",
              "skillsAddressed": ["Skill 1", "Skill 2"]
            }
          ]
        }
      }

      Ensure your response is ONLY valid JSON without any explanations or preamble.
    `;

    // Use Perplexity API to generate a personalized skills gap analysis
    const result = await queryPerplexity(prompt);
    
    try {
      // Parse the JSON response
      const skillsAnalysis = JSON.parse(result);
      
      // Create a learning path for the user
      const learningPath = await storage.createLearningPath({
        userId,
        name: skillsAnalysis.recommendedLearningPath.name,
        description: skillsAnalysis.recommendedLearningPath.description,
      });
      
      // Add the current skills assessment to the user's skills
      for (const skillAssessment of skillsAnalysis.currentSkillsAssessment) {
        try {
          // Find or create the skill in our library
          let skillId;
          const existingSkills = await storage.getAllSkills();
          const existingSkill = existingSkills.find(s => s.name.toLowerCase() === skillAssessment.skill.toLowerCase());
          
          if (existingSkill) {
            skillId = existingSkill.id;
          } else {
            // We'd need to add this skill to our library first (not implemented here)
            // For now, we'll skip skills not in our library
            continue;
          }
          
          // Add the skill to the user's profile
          await storage.addUserSkill({
            userId,
            skillId,
            currentLevel: skillAssessment.currentLevel,
            targetLevel: skillAssessment.targetLevel,
            priority: skillAssessment.priority
          });
        } catch (skillError) {
          console.error('Error adding skill:', skillError);
          // Continue with other skills
        }
      }
      
      res.json({
        analysis: skillsAnalysis,
        learningPathId: learningPath.id
      });
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      res.status(500).json({ message: 'Failed to generate skills gap analysis', error: 'Invalid response from AI service' });
    }
  } catch (error) {
    console.error('Error generating skills gap analysis:', error);
    res.status(500).json({ message: 'Failed to generate skills gap analysis' });
  }
});

export default router;