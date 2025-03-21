import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertTransitionSchema } from "@shared/schema";
import { CaraAgent } from "./agents/caraAgent"; 
import { findResourcesWithGemini } from "./apis/gemini";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize API routes
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // Seed some predefined role skills if they don't exist
  await seedRoleSkills();

  // Handle transition submission
  apiRouter.post("/transitions", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertTransitionSchema.parse({
        currentRole: req.body.currentRole,
        targetRole: req.body.targetRole,
      });

      // Check if this transition already exists
      let transition = await storage.getTransitionByRoles(
        validatedData.currentRole,
        validatedData.targetRole
      );

      if (!transition) {
        // Create new transition if it doesn't exist
        transition = await storage.createTransition(validatedData);
      }

      // Return the transition ID
      res.json({ 
        success: true, 
        transitionId: transition.id,
        message: "Transition submitted successfully" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          error: "Invalid input data", 
          details: error.errors 
        });
      } else {
        console.error("Error submitting transition:", error);
        res.status(500).json({ 
          success: false, 
          error: "Failed to submit transition" 
        });
      }
    }
  });

  // Scrape forums for transition data - simplified endpoint for frontend
  apiRouter.post("/scrape", async (req, res) => {
    try {
      const transitionId = parseInt(req.body.transitionId);
      
      // Validate transitionId
      if (isNaN(transitionId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transition ID" 
        });
      }

      // Get transition
      const transition = await storage.getTransition(transitionId);
      if (!transition) {
        return res.status(404).json({ 
          success: false, 
          error: "Transition not found" 
        });
      }

      // Create Cara agent for web scraping
      const cara = new CaraAgent(transition.currentRole, transition.targetRole);
      
      // Store that scraping has been initiated (frontend needs immediate response)
      res.json({ 
        success: true, 
        message: "Scraping initiated" 
      });
      
      // Perform scraping asynchronously
      cara.scrapeWebContent().catch(error => {
        console.error("Background scraping error:", error);
      });
      
    } catch (error) {
      console.error("Error in scraping:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to scrape transition data" 
      });
    }
  });

  // Analyze skill gaps - simplified endpoint for frontend
  apiRouter.post("/analyze", async (req, res) => {
    try {
      const transitionId = parseInt(req.body.transitionId);
      
      // Validate transitionId
      if (isNaN(transitionId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transition ID" 
        });
      }

      // Get transition
      const transition = await storage.getTransition(transitionId);
      if (!transition) {
        return res.status(404).json({ 
          success: false, 
          error: "Transition not found" 
        });
      }
      
      // Get current role skills
      const currentRoleSkills = await storage.getRoleSkills(transition.currentRole);
      const currentSkills = currentRoleSkills.map(item => item.skillName);
      
      // Note: This endpoint just acknowledges the request
      // We'll use analyze-career for the actual implementation
      res.json({ 
        success: true, 
        message: "Analysis initiated" 
      });
      
      // Call the comprehensive analysis endpoint asynchronously
      try {
        // Create Cara agent 
        const cara = new CaraAgent(transition.currentRole, transition.targetRole);
        
        // Perform analysis
        const analysisResult = await cara.analyzeCareerTransition(currentSkills);
        
        // Store skill gaps
        for (const skillGap of analysisResult.skillGaps) {
          await storage.createSkillGap({
            transitionId,
            skillName: skillGap.skillName,
            gapLevel: skillGap.gapLevel as "Low" | "Medium" | "High",
            confidenceScore: skillGap.confidenceScore,
            mentionCount: skillGap.mentionCount || 0
          });
        }
      } catch (analysisError) {
        console.error("Background analysis error:", analysisError);
      }
      
    } catch (error) {
      console.error("Error in analysis:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to analyze transition data" 
      });
    }
  });

  // Integrate Cara AI Agent for comprehensive career analysis
  apiRouter.post("/analyze-career", async (req, res) => {
    try {
      const transitionId = parseInt(req.body.transitionId);
      
      // Validate transitionId
      if (isNaN(transitionId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transition ID" 
        });
      }

      // Get transition data
      const transition = await storage.getTransition(transitionId);
      if (!transition) {
        return res.status(404).json({ 
          success: false, 
          error: "Transition not found" 
        });
      }

      // Get current role skills
      const currentRoleSkills = await storage.getRoleSkills(transition.currentRole);
      const currentSkills = currentRoleSkills.map(item => item.skillName);

      console.log(`Starting Cara analysis for transition from ${transition.currentRole} to ${transition.targetRole}`);
      
      // Create Cara agent instance
      const cara = new CaraAgent(transition.currentRole, transition.targetRole);
      
      // Perform comprehensive analysis
      const analysisResult = await cara.analyzeCareerTransition(currentSkills);
      
      // Store scraped data
      if (analysisResult.scrapedCount > 0) {
        // Note: Scraped data is already stored in the agent process
        console.log(`Cara found ${analysisResult.scrapedCount} relevant transition stories`);
      }
      
      // Store skill gaps
      const storedSkillGaps = [];
      for (const skillGap of analysisResult.skillGaps) {
        const stored = await storage.createSkillGap({
          transitionId,
          skillName: skillGap.skillName,
          gapLevel: skillGap.gapLevel as "Low" | "Medium" | "High",
          confidenceScore: skillGap.confidenceScore,
          mentionCount: skillGap.mentionCount || 0
        });
        storedSkillGaps.push(stored);
      }
      
      // Store insights
      if (analysisResult.insights) {
        const insights = analysisResult.insights;
        
        // Store success rate as observation
        if (insights.successRate) {
          await storage.createInsight({
            transitionId,
            type: "observation",
            content: `Success rate for this transition path is approximately ${insights.successRate}% based on analyzed stories.`,
            source: "Cara Analysis",
            date: new Date().toISOString().split('T')[0],
            experienceYears: null,
          });
        }
        
        // Store transition time as observation
        if (insights.avgTransitionTime) {
          await storage.createInsight({
            transitionId,
            type: "observation",
            content: `Average transition time is around ${insights.avgTransitionTime} months.`,
            source: "Cara Analysis",
            date: new Date().toISOString().split('T')[0],
            experienceYears: null,
          });
        }
        
        // Store common paths
        if (insights.commonPaths && insights.commonPaths.length > 0) {
          for (const path of insights.commonPaths.slice(0, 2)) {
            await storage.createInsight({
              transitionId,
              type: "story",
              content: `Common transition approach: ${path.path} (mentioned ${path.count} times)`,
              source: "Cara Analysis",
              date: new Date().toISOString().split('T')[0],
              experienceYears: null,
            });
          }
        }
        
        // Store challenges
        if (insights.commonChallenges && insights.commonChallenges.length > 0) {
          for (const challenge of insights.commonChallenges.slice(0, 2)) {
            await storage.createInsight({
              transitionId,
              type: "challenge",
              content: challenge,
              source: "Cara Analysis",
              date: new Date().toISOString().split('T')[0],
              experienceYears: null,
            });
          }
        }
      }

      res.json({ 
        success: true, 
        skillGaps: storedSkillGaps,
        scrapedCount: analysisResult.scrapedCount,
        message: "Cara's career analysis completed successfully" 
      });
    } catch (error) {
      console.error("Error in Cara's career analysis:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to complete career analysis with Cara" 
      });
    }
  });

  // Generate development plan with Cara and Gemini
  apiRouter.post("/plan", async (req, res) => {
    try {
      const transitionId = parseInt(req.body.transitionId);
      
      // Validate transitionId
      if (isNaN(transitionId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transition ID" 
        });
      }

      // Get transition
      const transition = await storage.getTransition(transitionId);
      if (!transition) {
        return res.status(404).json({ 
          success: false, 
          error: "Transition not found" 
        });
      }

      // Get skill gaps
      const skillGaps = await storage.getSkillGapsByTransitionId(transitionId);
      if (skillGaps.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: "No skill gaps found for this transition" 
        });
      }

      // Create plan
      const plan = await storage.createPlan({ transitionId });

      // Create Cara agent for plan generation
      console.log(`Cara is generating a plan for transition from ${transition.currentRole} to ${transition.targetRole}`);
      const cara = new CaraAgent(transition.currentRole, transition.targetRole);
      
      // Prioritize skills
      const prioritizedSkills = skillGaps
        .sort((a, b) => {
          // Sort by gap level and mention count
          const gapOrder: {[key: string]: number} = { "High": 3, "Medium": 2, "Low": 1 };
          // Handle null mention counts
          const aMentionCount = a.mentionCount || 0;
          const bMentionCount = b.mentionCount || 0; 
          return (gapOrder[b.gapLevel] - gapOrder[a.gapLevel]) || 
                 (bMentionCount - aMentionCount);
        })
        .slice(0, 5) // Limit to top 5 skill gaps
        .map(gap => gap.skillName);

      // Generate development plan with milestones using Gemini
      const milestoneData = await cara.generatePlan(prioritizedSkills);

      // Store milestones
      const storedMilestones = [];
      for (let i = 0; i < milestoneData.length; i++) {
        const milestone = milestoneData[i];
        const storedMilestone = await storage.createMilestone({
          planId: plan.id,
          title: milestone.title,
          description: milestone.description,
          priority: milestone.priority,
          durationWeeks: milestone.durationWeeks,
          order: i + 1,
          progress: 0,
        });

        // Use resources from Gemini's response directly
        if (milestone.resources && milestone.resources.length > 0) {
          for (const resource of milestone.resources) {
            await storage.createResource({
              milestoneId: storedMilestone.id,
              title: resource.title,
              url: resource.url,
              type: resource.type,
            });
          }
        } else {
          // Fallback: find additional resources with Gemini
          const additionalResources = await findResourcesWithGemini(
            milestone.title, 
            `${transition.currentRole} to ${transition.targetRole} transition`
          );
          
          for (const resource of additionalResources) {
            await storage.createResource({
              milestoneId: storedMilestone.id,
              title: resource.title,
              url: resource.url,
              type: resource.type,
            });
          }
        }

        storedMilestones.push(storedMilestone);
      }

      console.log(`Cara successfully generated a plan with ${storedMilestones.length} milestones`);
      
      // Mark transition as complete
      await storage.updateTransitionStatus(transitionId, true);

      res.json({ 
        success: true, 
        planId: plan.id,
        milestones: storedMilestones.length,
        message: "Cara generated your development plan successfully" 
      });
    } catch (error) {
      console.error("Error generating plan:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate development plan" 
      });
    }
  });

  // Get dashboard data
  apiRouter.get("/dashboard/:transitionId", async (req, res) => {
    try {
      const transitionId = parseInt(req.params.transitionId);
      
      // Validate transitionId
      if (isNaN(transitionId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transition ID" 
        });
      }

      // Get transition
      const transition = await storage.getTransition(transitionId);
      if (!transition) {
        return res.status(404).json({ 
          success: false, 
          error: "Transition not found" 
        });
      }

      // Get skill gaps
      const skillGaps = await storage.getSkillGapsByTransitionId(transitionId);

      // Get plan and milestones
      const plan = await storage.getPlanByTransitionId(transitionId);
      let milestones: any[] = [];
      let milestonesWithResources: any[] = [];

      if (plan) {
        milestones = await storage.getMilestonesByPlanId(plan.id);
        
        // Get resources for each milestone
        milestonesWithResources = await Promise.all(
          milestones.map(async (milestone) => {
            const resources = await storage.getResourcesByMilestoneId(milestone.id);
            return {
              ...milestone,
              resources,
            };
          })
        );
      }

      // Get insights
      const insights = await storage.getInsightsByTransitionId(transitionId);

      // Get scraped data
      const scrapedData = await storage.getScrapedDataByTransitionId(transitionId);

      // Return complete dashboard data
      res.json({
        success: true,
        transition,
        skillGaps,
        plan,
        milestones: milestonesWithResources,
        insights,
        scrapedCount: scrapedData.length,
        isComplete: transition.isComplete,
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch dashboard data" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Seed predefined role skills
async function seedRoleSkills() {
  try {
    // Microsoft Level 63 skills
    const microsoftRoleName = "Microsoft Level 63";
    const microsoftSkills = [
      "C#", "Azure", ".NET", "SQL Server", 
      "Windows Development", "Team Leadership",
      "Agile Methodology", "Microservices"
    ];
    
    for (const skill of microsoftSkills) {
      try {
        await storage.createRoleSkill({
          roleName: microsoftRoleName,
          skillName: skill,
        });
      } catch (e) {
        // Ignore duplicates
      }
    }

    // Google L6 skills
    const googleRoleName = "Google L6";
    const googleSkills = [
      "Python", "System Design", "Distributed Systems",
      "Algorithm Optimization", "TensorFlow", "Kubernetes",
      "Leadership", "Go", "Java", "Mentorship"
    ];
    
    for (const skill of googleSkills) {
      try {
        await storage.createRoleSkill({
          roleName: googleRoleName,
          skillName: skill,
        });
      } catch (e) {
        // Ignore duplicates
      }
    }

    console.log("Predefined role skills seeded");
  } catch (error) {
    console.error("Error seeding role skills:", error);
  }
}
