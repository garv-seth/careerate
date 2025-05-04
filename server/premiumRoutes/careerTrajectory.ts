import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';
import { insertCareerPathSchema, insertCareerMilestoneSchema, careerMilestones, careerPaths } from '@shared/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';

const router = Router();

// Get all career paths for a user
router.get('/api/premium/career-paths', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const careerPaths = await storage.getCareerPathsByUserId(userId);
    res.json(careerPaths);
  } catch (error) {
    console.error('Error fetching career paths:', error);
    res.status(500).json({ message: 'Failed to fetch career paths' });
  }
});

// Get a specific career path with all its milestones and alternative paths
router.get('/api/premium/career-paths/:id', isAuthenticated, async (req: any, res) => {
  try {
    const pathId = parseInt(req.params.id);
    if (isNaN(pathId)) {
      return res.status(400).json({ message: 'Invalid career path ID' });
    }

    const careerPath = await storage.getCareerPathById(pathId);
    if (!careerPath) {
      return res.status(404).json({ message: 'Career path not found' });
    }

    // Verify that the career path belongs to the authenticated user
    if (careerPath.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'You do not have permission to view this career path' });
    }

    // Get all milestones for this career path
    const milestones = await storage.getMilestonesByCareerPathId(pathId);

    // Get all alternative paths for this career path
    const alternativePaths = await storage.getAlternativePathsByCareerPathId(pathId);

    res.json({
      ...careerPath,
      milestones,
      alternativePaths
    });
  } catch (error) {
    console.error('Error fetching career path details:', error);
    res.status(500).json({ message: 'Failed to fetch career path details' });
  }
});

// Create a new career path
router.post('/api/premium/career-paths', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Validate request body
    const validatedData = insertCareerPathSchema.parse({
      ...req.body,
      userId
    });

    const careerPath = await storage.createCareerPath(validatedData);
    res.status(201).json(careerPath);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating career path:', error);
    res.status(500).json({ message: 'Failed to create career path' });
  }
});

// Update a career path
router.patch('/api/premium/career-paths/:id', isAuthenticated, async (req: any, res) => {
  try {
    const pathId = parseInt(req.params.id);
    if (isNaN(pathId)) {
      return res.status(400).json({ message: 'Invalid career path ID' });
    }

    const careerPath = await storage.getCareerPathById(pathId);
    if (!careerPath) {
      return res.status(404).json({ message: 'Career path not found' });
    }

    // Verify that the career path belongs to the authenticated user
    if (careerPath.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'You do not have permission to update this career path' });
    }

    // Update the career path
    const updatedPath = await storage.updateCareerPath(pathId, req.body);
    res.json(updatedPath);
  } catch (error) {
    console.error('Error updating career path:', error);
    res.status(500).json({ message: 'Failed to update career path' });
  }
});

// Delete a career path
router.delete('/api/premium/career-paths/:id', isAuthenticated, async (req: any, res) => {
  try {
    const pathId = parseInt(req.params.id);
    if (isNaN(pathId)) {
      return res.status(400).json({ message: 'Invalid career path ID' });
    }

    const careerPath = await storage.getCareerPathById(pathId);
    if (!careerPath) {
      return res.status(404).json({ message: 'Career path not found' });
    }

    // Verify that the career path belongs to the authenticated user
    if (careerPath.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'You do not have permission to delete this career path' });
    }

    // Delete the career path and all related milestones and alternative paths
    await storage.deleteCareerPath(pathId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting career path:', error);
    res.status(500).json({ message: 'Failed to delete career path' });
  }
});

// Create a new milestone for a career path
router.post('/api/premium/career-paths/:pathId/milestones', isAuthenticated, async (req: any, res) => {
  try {
    const pathId = parseInt(req.params.pathId);
    if (isNaN(pathId)) {
      return res.status(400).json({ message: 'Invalid career path ID' });
    }

    const careerPath = await storage.getCareerPathById(pathId);
    if (!careerPath) {
      return res.status(404).json({ message: 'Career path not found' });
    }

    // Verify that the career path belongs to the authenticated user
    if (careerPath.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'You do not have permission to add milestones to this career path' });
    }

    // Validate request body
    const validatedData = insertCareerMilestoneSchema.parse({
      ...req.body,
      careerPathId: pathId
    });

    const milestone = await storage.createCareerMilestone(validatedData);
    res.status(201).json(milestone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating milestone:', error);
    res.status(500).json({ message: 'Failed to create milestone' });
  }
});

// Update milestone completion status
router.patch('/api/premium/milestones/:id/status', isAuthenticated, async (req: any, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    if (isNaN(milestoneId)) {
      return res.status(400).json({ message: 'Invalid milestone ID' });
    }

    const { isCompleted } = req.body;
    if (typeof isCompleted !== 'boolean') {
      return res.status(400).json({ message: 'Missing or invalid isCompleted status' });
    }

    // Find the milestone and verify ownership
    const milestones = await db.select()
      .from(careerMilestones)
      .innerJoin(careerPaths, eq(careerMilestones.careerPathId, careerPaths.id))
      .where(eq(careerMilestones.id, milestoneId));

    if (milestones.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    const milestone = milestones[0];
    
    // Verify that the milestone belongs to the authenticated user
    if (milestone.careerPaths.userId !== req.user.claims.sub) {
      return res.status(403).json({ message: 'You do not have permission to update this milestone' });
    }

    // Update the milestone status
    const updatedMilestone = await storage.updateCareerMilestoneStatus(milestoneId, isCompleted);
    res.json(updatedMilestone);
  } catch (error) {
    console.error('Error updating milestone status:', error);
    res.status(500).json({ message: 'Failed to update milestone status' });
  }
});

// Generate a career trajectory path using AI
router.post('/api/premium/career-paths/generate', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { targetRole, targetTimeframe } = req.body;
    
    if (!targetRole || !targetTimeframe) {
      return res.status(400).json({ message: 'Target role and timeframe are required' });
    }

    // Get user's profile and resume
    const profile = await storage.getProfileByUserId(userId);
    if (!profile?.resumeText) {
      return res.status(400).json({ message: 'No resume found. Please upload your resume first.' });
    }

    // Import the Perplexity API client to help generate content
    const { queryPerplexity } = await import('../../src/agents/perplexity');

    // Generate career path with AI
    const prompt = `
      You are an expert career advisor. Based on the following resume, create a detailed career path to reach the target role of "${targetRole}" within ${targetTimeframe} months.
      
      RESUME:
      ${profile.resumeText}
      
      Your response should be in this JSON format:
      {
        "name": "Career Path to ${targetRole}",
        "description": "A detailed, personalized description of the overall path",
        "targetRole": "${targetRole}",
        "targetTimeframe": ${targetTimeframe},
        "milestones": [
          {
            "title": "Milestone title",
            "description": "Detailed description",
            "targetDate": "YYYY-MM-DD",
            "milestonePriority": 0 or 1 or 2 (0=normal, 1=high, 2=critical)
          }
        ],
        "alternativePaths": [
          {
            "name": "Alternative path name",
            "description": "Description of this alternative direction",
            "probabilityScore": 1-100,
            "potentialUpsides": "Benefits of this path",
            "potentialDownsides": "Risks of this path"
          }
        ]
      }

      Ensure your response is ONLY valid JSON without any explanations or preamble.
    `;

    // Use Perplexity API to generate a personalized career path
    const result = await queryPerplexity(prompt);
    
    try {
      // Parse the JSON response
      const careerPathPlan = JSON.parse(result);

      // Create the career path in the database
      const careerPath = await storage.createCareerPath({
        userId,
        name: careerPathPlan.name,
        description: careerPathPlan.description,
        targetRole: careerPathPlan.targetRole,
        targetTimeframe: careerPathPlan.targetTimeframe
      });

      // Create milestones
      const milestones = [];
      for (const milestoneData of careerPathPlan.milestones) {
        const milestone = await storage.createCareerMilestone({
          careerPathId: careerPath.id,
          title: milestoneData.title,
          description: milestoneData.description,
          targetDate: new Date(milestoneData.targetDate),
          milestonePriority: milestoneData.milestonePriority
        });
        milestones.push(milestone);
      }

      // The complete response with the newly created career path and milestones
      res.json({
        ...careerPath,
        milestones,
        alternativePaths: careerPathPlan.alternativePaths
      });
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      res.status(500).json({ message: 'Failed to generate career path', error: 'Invalid response from AI service' });
    }
  } catch (error) {
    console.error('Error generating career path:', error);
    res.status(500).json({ message: 'Failed to generate career path' });
  }
});

export default router;