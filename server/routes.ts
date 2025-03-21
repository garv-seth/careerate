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
  apiRouter.post("/submit", async (req, res) => {
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

  // Scrape forums for transition data
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

      // Get transition data
      const transition = await storage.getTransition(transitionId);
      if (!transition) {
        return res.status(404).json({ 
          success: false, 
          error: "Transition not found" 
        });
      }

      // Scrape forums for data
      const scrapedResults = await scrapeForums(
        transition.currentRole,
        transition.targetRole
      );

      // Store scraped data
      const savedData = [];
      for (const result of scrapedResults) {
        const savedItem = await storage.createScrapedData({
          transitionId,
          source: result.source,
          content: result.content,
          url: result.url,
          skillsExtracted: [],
        });
        savedData.push(savedItem);
      }

      res.json({ 
        success: true, 
        count: savedData.length,
        message: "Scraped and stored forum data" 
      });
    } catch (error) {
      console.error("Error scraping forums:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to scrape forum data" 
      });
    }
  });

  // Analyze skills from scraped data
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

      // Get scraped data
      const scrapedData = await storage.getScrapedDataByTransitionId(transitionId);
      if (scrapedData.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: "No scraped data found for this transition" 
        });
      }

      // Get current role skills
      const currentRoleSkills = await storage.getRoleSkills(transition.currentRole);
      const currentSkills = currentRoleSkills.map(item => item.skillName);

      // Get target role skills
      const targetRoleSkills = await storage.getRoleSkills(transition.targetRole);
      const targetSkills = targetRoleSkills.map(item => item.skillName);

      // Extract skills from scraped content
      const skillsFound = [];
      for (const data of scrapedData) {
        // Skip if already processed
        if (data.skillsExtracted && data.skillsExtracted.length > 0) {
          skillsFound.push(...data.skillsExtracted);
          continue;
        }

        // Extract skills using Claude API
        const extractedSkills = await extractSkills(data.content);
        
        // Update scraped data with extracted skills
        // We need to create a new object with just the fields from the schema
        await storage.createScrapedData({
          transitionId: data.transitionId,
          source: data.source,
          content: data.content,
          url: data.url,
          skillsExtracted: extractedSkills,
        });

        skillsFound.push(...extractedSkills);
      }

      // Count skill mentions
      const skillMentionCounts: {[key: string]: number} = {};
      skillsFound.forEach(skill => {
        skillMentionCounts[skill] = (skillMentionCounts[skill] || 0) + 1;
      });

      // Identify skill gaps
      const gapResults = [];
      for (const targetSkill of targetSkills) {
        const hasCurrentSkill = currentSkills.includes(targetSkill);
        const mentionCount = skillMentionCounts[targetSkill] || 0;
        
        // Calculate gap level
        let gapLevel = "Low";
        if (!hasCurrentSkill && mentionCount >= 3) {
          gapLevel = "High";
        } else if (!hasCurrentSkill && mentionCount > 0) {
          gapLevel = "Medium";
        } else if (hasCurrentSkill && mentionCount >= 3) {
          gapLevel = "Medium";
        }

        // Store skill gap
        const skillGap = await storage.createSkillGap({
          transitionId,
          skillName: targetSkill,
          gapLevel,
          confidenceScore: mentionCount > 0 ? 70 + (mentionCount * 5) : 50,
          mentionCount,
        });

        gapResults.push(skillGap);
      }

      // Add skills from scraped data that aren't in predefined lists
      for (const skill of Object.keys(skillMentionCounts)) {
        if (!targetSkills.includes(skill) && skillMentionCounts[skill] >= 2) {
          const gapLevel = currentSkills.includes(skill) ? "Low" : "Medium";
          
          const skillGap = await storage.createSkillGap({
            transitionId,
            skillName: skill,
            gapLevel,
            confidenceScore: 60 + (skillMentionCounts[skill] * 5),
            mentionCount: skillMentionCounts[skill],
          });

          gapResults.push(skillGap);
        }
      }

      res.json({ 
        success: true, 
        skillGaps: gapResults,
        message: "Skill gap analysis completed" 
      });
    } catch (error) {
      console.error("Error analyzing skills:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to analyze skills" 
      });
    }
  });

  // Generate development plan
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

      // Generate milestones using OpenAI
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

      // Generate development plan with milestones
      const milestoneData = await generatePlan(
        transition.currentRole,
        transition.targetRole,
        prioritizedSkills
      );

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

        // Find resources for this milestone
        const resources = await findResources(milestone.title, milestone.description);

        // Store resources
        for (const resource of resources) {
          await storage.createResource({
            milestoneId: storedMilestone.id,
            title: resource.title,
            url: resource.url,
            type: resource.type,
          });
        }

        storedMilestones.push(storedMilestone);
      }

      // Extract insights from scraped data
      const scrapedData = await storage.getScrapedDataByTransitionId(transitionId);
      
      // Store a few insights
      for (let i = 0; i < Math.min(scrapedData.length, 3); i++) {
        const content = scrapedData[i].content;
        if (content.length > 50) {
          await storage.createInsight({
            transitionId,
            type: i === 0 ? "observation" : i === 1 ? "challenge" : "story",
            content: content.substring(0, 300) + (content.length > 300 ? "..." : ""),
            source: scrapedData[i].source,
            date: "2023",
            experienceYears: 3 + i,
          });
        }
      }

      // Mark transition as complete
      await storage.updateTransitionStatus(transitionId, true);

      res.json({ 
        success: true, 
        planId: plan.id,
        milestones: storedMilestones.length,
        message: "Development plan generated successfully" 
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
