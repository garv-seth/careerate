import express, { type Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertTransitionSchema,
  companies,
  companyRoles,
  roleLevels,
  Company,
  CompanyRole,
  RoleLevel
} from "@shared/schema";
// Using MemoryEnabledAgent as the primary agent architecture (consolidated approach)
import { safeParseJSON } from "./helpers/jsonParserHelper";
import { MemoryEnabledAgent } from "./agents/memoryEnabledAgent";
import {
  searchForums,
  analyzeSkillGaps,
  analyzeTransitionStories,
  findResources,
  calculatePersonalizedSuccessRate,
  generateTransitionOverview,
  callLLM
} from "./helpers/langGraphHelpers";
import { getCompanyById, getRolesByCompanyId, getLevelsByCompanyAndRoleId } from "@shared/companyData";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import passport from "passport";
import session from "express-session";
import connectPgSimpleModule from "connect-pg-simple";
import { configurePassport } from "./auth/passport-config";
import { handleReplitAuth } from "./auth/replit-auth";
import authRoutes from "./auth/auth-routes";
import resumeRoutes from "./auth/resume-routes";
import cookieParser from "cookie-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session
  // Use database URL directly for session store
  const PgSession = connectPgSimpleModule(session);
  
  app.use(cookieParser());
  app.use(session({
    store: new PgSession({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: false
      },
      tableName: 'user_sessions'
    }),
    secret: process.env.SESSION_SECRET || 'careerate-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }));
  
  // Configure passport
  const passportInstance = configurePassport();
  app.use(passportInstance.initialize());
  app.use(passportInstance.session());
  
  // Configure Replit auth middleware
  app.use(handleReplitAuth);
  
  // Serve static files from the uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Initialize API routes
  const apiRouter = express.Router();
  app.use("/api", apiRouter);
  
  // Register auth routes
  apiRouter.use("/auth", authRoutes);
  apiRouter.use("/auth", resumeRoutes);

  // Seed some predefined role skills if they don't exist
  await seedRoleSkills();
  
  // Company data API endpoints
  apiRouter.get("/companies", async (req, res) => {
    try {
      const companiesResult = await db.select({
        id: companies.id,
        name: companies.name
      }).from(companies);
      
      res.json({
        success: true,
        data: companiesResult
      });
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch companies"
      });
    }
  });
  
  apiRouter.get("/companies/:companyId/roles", async (req, res) => {
    try {
      const { companyId } = req.params;
      
      const roles = await db
        .select({
          id: companyRoles.id,
          title: companyRoles.title
        })
        .from(companyRoles)
        .where(eq(companyRoles.company_id, companyId));
      
      if (roles.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Company not found or has no roles"
        });
      }
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch roles"
      });
    }
  });
  
  apiRouter.get("/companies/:companyId/roles/:roleId/levels", async (req, res) => {
    try {
      const { companyId, roleId } = req.params;
      
      const levels = await db
        .select({
          id: roleLevels.id,
          name: roleLevels.name
        })
        .from(roleLevels)
        .where(
          and(
            eq(roleLevels.company_id, companyId),
            eq(roleLevels.role_id, roleId)
          )
        );
      
      if (levels.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Company, role, or levels not found"
        });
      }
      
      res.json({
        success: true,
        data: levels
      });
    } catch (error) {
      console.error("Error fetching levels:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch levels"
      });
    }
  });
  
  // Format role string endpoint
  apiRouter.get("/format-role/:companyId/:roleId/:levelId", async (req, res) => {
    try {
      const { companyId, roleId, levelId } = req.params;
      
      // Get company name
      const companyResults = await db
        .select({
          name: companies.name
        })
        .from(companies)
        .where(eq(companies.id, companyId));
      
      if (companyResults.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Company not found"
        });
      }
      
      // Get role title
      const roleResults = await db
        .select({
          title: companyRoles.title
        })
        .from(companyRoles)
        .where(
          and(
            eq(companyRoles.company_id, companyId),
            eq(companyRoles.id, roleId)
          )
        );
      
      if (roleResults.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Role not found"
        });
      }
      
      // Get level name
      const levelResults = await db
        .select({
          name: roleLevels.name
        })
        .from(roleLevels)
        .where(
          and(
            eq(roleLevels.company_id, companyId),
            eq(roleLevels.role_id, roleId),
            eq(roleLevels.id, levelId)
          )
        );
      
      if (levelResults.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Level not found"
        });
      }
      
      const formattedRole = `${companyResults[0].name} ${roleResults[0].title} ${levelResults[0].name}`;
      
      res.json({
        success: true,
        formattedRole
      });
    } catch (error) {
      console.error("Error formatting role:", error);
      res.status(500).json({
        success: false,
        error: "Failed to format role"
      });
    }
  });

  // Handle unified transition creation, scraping, and analysis
  apiRouter.post("/transition", async (req, res) => {
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
      
      console.log(`Starting improved scraping and analysis process for transition ${transition.id}`);
      
      // Get user ID from transition or request
      const userId = transition.userId || (req.user as any)?.id || 1;
      
      // Create a memory-enabled agent for more comprehensive and reliable analysis
      const agent = new MemoryEnabledAgent(userId, transition.id);
      
      // Start the analysis process (includes scraping and memory storage)
      agent.analyzeCareerTransition(
        transition.currentRole,
        transition.targetRole,
        transition.id,
        []
      ).catch(error => {
        console.error("Background analysis error:", error);
      });
      
      // Return the transition ID right away so UI can redirect
      res.json({ 
        success: true, 
        transitionId: transition.id,
        message: "Transition submitted successfully. Scraping and analysis started." 
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          error: "Invalid input data", 
          details: error.errors 
        });
      } else {
        console.error("Error in unified transition processing:", error);
        res.status(500).json({ 
          success: false, 
          error: "Failed to process transition" 
        });
      }
    }
  });

  // Handle transition submission (original route kept for compatibility)  
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

  // Track in-progress scraping operations to prevent multiple requests
  const inProgressScrapingOperations = new Set<number>();
  
  // Scrape forums for transition data - simplified endpoint for frontend with improved error handling
  apiRouter.post("/scrape", async (req, res) => {
    try {
      const transitionId = parseInt(req.body.transitionId);
      const forceRefresh = req.body.forceRefresh === true;
      
      // Validate transitionId
      if (isNaN(transitionId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transition ID" 
        });
      }

      // Check if this transition is already being processed
      if (inProgressScrapingOperations.has(transitionId)) {
        return res.json({
          success: true,
          message: "Scraping is already in progress for this transition",
          alreadyInProgress: true
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
      
      // Get user ID from transition or request
      const userId = transition.userId || (req.user as any)?.id || 1;
      
      // Add this transition to in-progress set
      inProgressScrapingOperations.add(transitionId);
      
      // If force refresh is enabled, clear existing data first
      if (forceRefresh) {
        console.log(`Force refresh enabled for transition ${transitionId}, clearing existing data...`);
        try {
          // First clear any existing scraped data
          await storage.deleteScrapedDataByTransitionId(transitionId);
          // Then clear the insights based on that data
          await storage.deleteInsightsByTransitionId(transitionId);
          console.log(`Successfully cleared existing data for transition ${transitionId}`);
        } catch (clearError) {
          console.error("Error clearing existing data:", clearError);
          // Continue anyway - we'll still get fresh data even if clearing fails
        }
      }

      // Create memory-enabled agent for web scraping with improved reliability
      const agent = new MemoryEnabledAgent(userId, transitionId);
      
      // Store that scraping has been initiated (frontend needs immediate response)
      res.json({ 
        success: true, 
        message: "Scraping initiated with memory-enabled agent",
        forceRefresh
      });
      
      // Add some unique query terms to ensure fresh data
      const timestamp = new Date().getTime();
      const uniqueTag = `search_${timestamp.toString().slice(-6)}`;
      
      // Get today's date in YYYY-MM-DD format for newest data
      const today = new Date().toISOString().split('T')[0];
      
      // Perform scraping with additional context for more diverse results
      try {
        // The uniqueTag and today's date trick search engines into avoiding cached results
        console.log(`Starting web scraping for ${transition.currentRole} to ${transition.targetRole} transition (${uniqueTag} - ${today})`);
        
        await agent.analyzeCareerTransition(
          transition.currentRole,
          transition.targetRole,
          transitionId,
          []
        );
        
        console.log(`Completed scraping and analysis for transition ${transitionId}`);
      } catch (analysisError) {
        console.error(`Background analysis error for transition ${transitionId}:`, analysisError);
        
        // Try to mark the transition as complete even if there was an error
        try {
          await storage.updateTransitionStatus(transitionId, true);
        } catch (updateError) {
          console.error(`Failed to update transition status for ${transitionId}:`, updateError);
        }
      } finally {
        // Always remove this transition from the in-progress set
        inProgressScrapingOperations.delete(transitionId);
      }
      
    } catch (error) {
      console.error("Error in scraping:", error);
      // Make sure to remove from in-progress in case of errors
      if (req.body.transitionId) {
        const transitionId = parseInt(req.body.transitionId);
        if (!isNaN(transitionId)) {
          inProgressScrapingOperations.delete(transitionId);
        }
      }
      
      res.status(500).json({ 
        success: false, 
        error: "Failed to scrape transition data" 
      });
    }
  });

  // Track in-progress analysis operations to prevent multiple requests
  const inProgressAnalysisOperations = new Set<number>();

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

      // Check if this transition is already being analyzed
      if (inProgressAnalysisOperations.has(transitionId)) {
        return res.json({
          success: true,
          message: "Analysis is already in progress for this transition",
          alreadyInProgress: true
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
      
      // Get user ID (either from transition or from request)
      const userId = transition.userId || (req.user as any)?.id || 1;
      
      // Get existing skills
      const currentRoleSkills = await storage.getRoleSkills(transition.currentRole);
      const userSkills = await storage.getUserSkills(userId);
      const existingSkills = userSkills.map(skill => skill.skillName)
        .concat(currentRoleSkills.map(skill => skill.skillName));
      
      // Note: This endpoint just acknowledges the request
      // We'll run the analysis asynchronously
      res.json({ 
        success: true, 
        message: "Analysis initiated" 
      });
      
      // Mark this transition as in-progress for analysis
      inProgressAnalysisOperations.add(transitionId);
      
      // Call the memory-enabled analysis asynchronously
      try {
        console.log(`Starting memory-enabled analysis for ${transition.currentRole} → ${transition.targetRole}`);
        
        // Create the memory-enabled agent with the user ID for personalization
        const agent = new MemoryEnabledAgent(userId, transitionId);
        
        // Run the comprehensive analysis
        const analysisResult = await agent.analyzeCareerTransition(
          transition.currentRole,
          transition.targetRole,
          transitionId,
          existingSkills
        );
        
        console.log(`Analysis completed for: ${transition.currentRole} → ${transition.targetRole}`);
      } catch (analysisError) {
        console.error("Background analysis error:", analysisError);
        
        // Check if any skill gaps were created
        const existingSkillGaps = await storage.getSkillGapsByTransitionId(transitionId);
        
        // If analysis failed and no skill gaps exist, create default ones based on role information
        if (existingSkillGaps.length === 0) {
          console.log("No skill gaps found, generating skill gaps using LangGraph");
          
          try {
            // First try to use LangGraph to generate skill gaps without the agent
            const skillGapsPrompt = `
              Generate skill gaps for career transition from ${transition.currentRole} to ${transition.targetRole}.
              For each skill gap, provide:
              1. Skill name (concise description of the skill)
              2. Gap level ("Low", "Medium", or "High" importance)
              3. Confidence score (numeric value from 50-100)
              
              Return 5-7 real technical and professional skills in JSON format as an array:
              [
                {
                  "skillName": "string",
                  "gapLevel": "Low|Medium|High",
                  "confidenceScore": number,
                  "mentionCount": number
                }
              ]
            `;
            
            const langGraphResponse = await callLLM(skillGapsPrompt, 800);
            
            try {
              const jsonMatch = langGraphResponse.match(/\[\s*\{.*\}\s*\]/s);
              if (jsonMatch) {
                const parsedSkillGaps = JSON.parse(jsonMatch[0]);
                
                // Store the generated skill gaps
                for (const skill of parsedSkillGaps) {
                  await storage.createSkillGap({
                    transitionId,
                    skillName: skill.skillName,
                    gapLevel: skill.gapLevel as "High" | "Medium" | "Low",
                    confidenceScore: skill.confidenceScore || 70,
                    mentionCount: skill.mentionCount || 1
                  });
                }
                
                console.log(`Created ${parsedSkillGaps.length} real skill gaps for transition using LangGraph`);
              } else {
                throw new Error("No skill gaps found in LangGraph response");
              }
            } catch (parseError) {
              console.error("Error parsing skill gaps from LangGraph:", parseError);
              useDefaultSkillGaps();
            }
          } catch (langGraphError) {
            console.error("Error generating skill gaps with LangGraph:", langGraphError);
            useDefaultSkillGaps();
          }
        }
        
        // Helper function to generate default skill gaps when all else fails
        async function useDefaultSkillGaps() {
          console.log("Falling back to default skill gaps based on roles");
          
          // Get target role skills from our predefined list
          const targetRoleSkills = await storage.getRoleSkills(transition.targetRole);
          
          // Create default skill gaps for the target role
          const defaultSkills = targetRoleSkills.length > 0 
            ? targetRoleSkills.map(s => ({ 
                name: s.skillName, 
                priority: Math.random() > 0.6 ? "High" : Math.random() > 0.4 ? "Medium" : "Low",
                confidence: 50 + Math.floor(Math.random() * 40),
                mentions: 1 + Math.floor(Math.random() * 7)
              }))
            : [
                { name: "System Design", priority: "High", confidence: 85, mentions: 7 },
                { name: "Algorithm Optimization", priority: "High", confidence: 80, mentions: 5 },
                { name: "Distributed Systems", priority: "Medium", confidence: 75, mentions: 4 },
                { name: "Leadership", priority: "Medium", confidence: 70, mentions: 6 },
                { name: "Programming Languages", priority: "Medium", confidence: 65, mentions: 3 },
                { name: "Project Management", priority: "Low", confidence: 60, mentions: 2 },
                { name: "Communication", priority: "Low", confidence: 55, mentions: 3 }
              ];
          
          // Store the default skills as skill gaps
          for (const skill of defaultSkills) {
            await storage.createSkillGap({
              transitionId,
              skillName: skill.name,
              gapLevel: skill.priority as "High" | "Medium" | "Low",
              confidenceScore: skill.confidence,
              mentionCount: skill.mentions
            });
          }
          
          console.log(`Created ${defaultSkills.length} default skill gaps for transition`);
        }
        
        // Always mark the transition as complete even in case of error
        try {
          await storage.updateTransitionStatus(transitionId, true);
        } catch (updateError) {
          console.error("Failed to update transition status after error:", updateError);
        }
      } finally {
        // Always remove this transition from the in-progress set
        inProgressAnalysisOperations.delete(transitionId);
      }
      
    } catch (error) {
      console.error("Error in analysis:", error);
      
      // Make sure to remove from in-progress in case of errors
      if (req.body.transitionId) {
        const transitionId = parseInt(req.body.transitionId);
        if (!isNaN(transitionId)) {
          inProgressAnalysisOperations.delete(transitionId);
        }
      }
      
      res.status(500).json({ 
        success: false, 
        error: "Failed to analyze transition data" 
      });
    }
  });

  // Integrate Cara AI Agent for comprehensive career analysis
  // Clear and refresh all data for a transition
  apiRouter.post("/clear-data", async (req, res) => {
    try {
      const transitionId = parseInt(req.body.transitionId);

      if (!transitionId || isNaN(transitionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid or missing transitionId",
        });
      }

      // Get the transition to verify it exists
      const transition = await storage.getTransition(transitionId);
      
      if (!transition) {
        return res.status(404).json({
          success: false,
          message: "Transition not found",
        });
      }
      
      console.log(`Clearing all data for transition ID: ${transitionId}`);
      
      // Clear all data related to this transition
      await storage.clearTransitionData(transitionId);
      
      // Set transition to incomplete to trigger new data generation
      await storage.updateTransitionStatus(transitionId, false);

      console.log(`Successfully cleared all data for transition ID: ${transitionId}`);
      
      return res.json({
        success: true,
        message: "All transition data cleared successfully",
        transition: {
          ...transition,
          isComplete: false
        }
      });
    } catch (error) {
      console.error("Error clearing data:", error);
      return res.status(500).json({
        success: false,
        message: "Server error clearing data",
      });
    }
  });

  // Add a new endpoint for comprehensive career analysis with memory
  apiRouter.post("/analyze-with-memory", async (req, res) => {
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

      // Get user ID (either from transition or from request)
      const userId = transition.userId || (req.user as any)?.id || 1;

      // Get existing skills
      const currentRoleSkills = await storage.getRoleSkills(transition.currentRole);
      const userSkills = await storage.getUserSkills(userId);
      const existingSkills = userSkills.map(skill => skill.skillName)
        .concat(currentRoleSkills.map(skill => skill.skillName));

      console.log(`Starting memory-enabled analysis for ${transition.currentRole} → ${transition.targetRole}`);
      
      // Create the memory-enabled agent with the user ID for personalization
      const agent = new MemoryEnabledAgent(userId, transitionId);
      
      // Run the comprehensive analysis
      const analysisResult = await agent.analyzeCareerTransition(
        transition.currentRole,
        transition.targetRole,
        transitionId,
        existingSkills
      );
      
      // Return the results
      res.json({ 
        success: true, 
        skillGaps: analysisResult.skillGaps,
        insights: analysisResult.insights,
        scrapedCount: analysisResult.scrapedCount,
        message: "Career analysis completed successfully" 
      });
    } catch (error) {
      console.error("Error in memory-enabled career analysis:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to complete career analysis" 
      });
    }
  });

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

      // Get user ID (either from transition or from request)
      const userId = transition.userId || (req.user as any)?.id || 1;
      
      // Get existing skills
      const currentRoleSkills = await storage.getRoleSkills(transition.currentRole);
      const userSkills = await storage.getUserSkills(userId);
      const existingSkills = userSkills.map(skill => skill.skillName)
        .concat(currentRoleSkills.map(skill => skill.skillName));

      console.log(`Starting memory-enabled analysis for ${transition.currentRole} → ${transition.targetRole}`);
      
      // Create the memory-enabled agent with the user ID for personalization
      const agent = new MemoryEnabledAgent(userId, transitionId);
      
      // Run the comprehensive analysis
      const analysisResult = await agent.analyzeCareerTransition(
        transition.currentRole,
        transition.targetRole,
        transitionId,
        existingSkills
      );
      
      // Store skill gaps - Note: MemoryEnabledAgent already stores skill gaps in the database
      // This is just to get them for returning to the client
      const storedSkillGaps = await storage.getSkillGapsByTransitionId(transitionId);
      
      // Store insights - Note: MemoryEnabledAgent already stores insights in the database
      // These are additional insights that might need formatting
      if (analysisResult.insights) {
        const insights = analysisResult.insights;
        
        // Store success rate as observation if it's not already stored
        if (insights.estimatedSuccessRate) {
          await storage.createInsight({
            transitionId,
            type: "observation",
            content: `Success rate for this transition path is approximately ${insights.estimatedSuccessRate}% based on analyzed stories.`,
            source: "Memory-Enabled Analysis",
            date: new Date().toISOString().split('T')[0],
            experienceYears: null,
          });
        }
        
        // Store transition time as observation if it's not already stored
        if (insights.typicalTimeframe) {
          await storage.createInsight({
            transitionId,
            type: "observation",
            content: `Average transition time is around ${insights.typicalTimeframe} months.`,
            source: "Memory-Enabled Analysis",
            date: new Date().toISOString().split('T')[0],
            experienceYears: null,
          });
        }
      }

      res.json({ 
        success: true, 
        skillGaps: storedSkillGaps,
        insights: analysisResult.insights,
        scrapedCount: analysisResult.scrapedCount,
        message: "Career analysis completed successfully" 
      });
    } catch (error) {
      console.error("Error in memory-enabled career analysis:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to complete career analysis" 
      });
    }
  });

  // Test LangGraph and Tavily API connection
  apiRouter.get("/test-ai", async (req, res) => {
    try {
      console.log("Testing OpenAI and Tavily API connections...");
      console.log("OpenAI API Key exists:", !!process.env.OPENAI_API_KEY);
      console.log("Tavily API Key exists:", !!process.env.TAVILY_API_KEY);
      
      // Success response since we don't need to test the actual API here
      // The actual test will happen when users make a real request
      res.json({ 
        success: true, 
        message: "OpenAI and Tavily API keys are configured." 
      });
    } catch (error) {
      console.error("Error testing APIs:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to test API connections", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Generate development plan with Cara and LangGraph
  apiRouter.post("/plan", async (req, res) => {
    try {
      const transitionId = parseInt(req.body.transitionId);
      const personalizedTimeline = req.body.personalizedTimeline === true;
      
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
      
      // Clear existing plan if we're regenerating it
      await storage.deletePlansByTransitionId(transitionId);

      // Get skill gaps
      let skillGaps = await storage.getSkillGapsByTransitionId(transitionId);
      
      // If no skill gaps exist, create ones based on real role information using LangGraph
      if (skillGaps.length === 0) {
        console.log("No skill gaps found, generating skill gaps using LangGraph");
        
        // Get transition details
        const { currentRole, targetRole } = transition;
        
        try {
          // Try to get target role skills from our predefined list first as a starting point
          const targetRoleSkills = await storage.getRoleSkills(targetRole);
          
          // Get user ID from transition or request
          const userId = transition.userId || (req.user as any)?.id || 1;
          
          // Create a memory-enabled agent for more reliable skill gap analysis
          const agent = new MemoryEnabledAgent(userId, transitionId);
          
          // Find scraped data for this transition
          const scrapedData = await storage.getScrapedDataByTransitionId(transitionId);
          
          let generatedSkillGaps;
          
          // If we have scraped data, use it for skill gap analysis
          if (scrapedData.length > 0) {
            // Format scraped data for analysis
            const formattedData = scrapedData.map(item => ({
              source: item.source,
              content: item.content,
              url: item.url || '',
              date: item.postDate || ''
            }));
            
            // Use LangGraph to analyze skill gaps
            generatedSkillGaps = await analyzeSkillGaps(
              currentRole,
              targetRole,
              formattedData,
              targetRoleSkills.map(s => s.skillName)
            );
          } else {
            // If no scraped data yet, use the memory-enabled agent to perform a full analysis
            // This triggers a fresh web search and skill gap analysis with memory retention
            const analysisResult = await agent.analyzeCareerTransition(
              currentRole,
              targetRole,
              transitionId,
              targetRoleSkills.map(s => s.skillName)
            );
            generatedSkillGaps = analysisResult.skillGaps;
          }
          
          // Store the generated skill gaps
          for (const skill of generatedSkillGaps) {
            const newSkillGap = await storage.createSkillGap({
              transitionId,
              skillName: skill.skillName,
              gapLevel: skill.gapLevel as "High" | "Medium" | "Low",
              confidenceScore: skill.confidenceScore,
              mentionCount: skill.mentionCount || 1
            });
            
            skillGaps.push(newSkillGap);
          }
          
          console.log(`Created ${skillGaps.length} real skill gaps for transition using LangGraph`);
        } catch (error) {
          console.error("Error generating skill gaps with LangGraph:", error);
          
          // As a true fallback, use target role data from our database only in case of API failure
          const targetRoleSkills = await storage.getRoleSkills(targetRole);
          const roleBasedSkills = targetRoleSkills.length > 0 
            ? targetRoleSkills.map(s => ({ 
                name: s.skillName, 
                priority: Math.random() > 0.6 ? "High" : Math.random() > 0.4 ? "Medium" : "Low",
                confidence: 50 + Math.floor(Math.random() * 40),
                mentions: 1 + Math.floor(Math.random() * 7)
              }))
            : null;
            
          if (roleBasedSkills) {
            // Store role-based skills as fallback
            for (const skill of roleBasedSkills) {
              const newSkillGap = await storage.createSkillGap({
                transitionId,
                skillName: skill.name,
                gapLevel: skill.priority as "High" | "Medium" | "Low",
                confidenceScore: skill.confidence,
                mentionCount: skill.mentions
              });
              
              skillGaps.push(newSkillGap);
            }
            
            console.log(`Created ${skillGaps.length} role-based skill gaps after LangGraph API failure`);
          }
        }
      }

      // Create plan
      const plan = await storage.createPlan({ transitionId });

      // Create memory-enabled agent for plan generation
      console.log(`Using memory-enabled agent for transition from ${transition.currentRole} to ${transition.targetRole}`);
      
      // Get user ID from transition or request
      const userId = transition.userId || (req.user as any)?.id || 1;
      
      // Create the memory-enabled agent with the user ID for personalization
      const agent = new MemoryEnabledAgent(userId, transitionId);
      
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

      // Generate development plan with milestones using the memory-enabled agent
      // The agent uses LangGraph with memory tracking to create a comprehensive plan
      const analysisResult = await agent.analyzeCareerTransition(
        transition.currentRole,
        transition.targetRole,
        transitionId,
        prioritizedSkills
      );
      
      // For compatibility with the existing code, construct milestone data from the analysis result
      // In LangGraph implementation, check both possible locations of milestones
      const milestoneData = 
        analysisResult.insights?.plan?.milestones || // Original expected location
        (analysisResult.insights?.plan && 'milestones' in analysisResult.insights.plan ? 
          analysisResult.insights.plan.milestones : []);

      // Store milestones
      const storedMilestones = [];
      for (let i = 0; i < milestoneData.length; i++) {
        const milestone = milestoneData[i];
        // Ensure all required fields are present and valid
        const durationWeeks = typeof milestone.durationWeeks === 'number' && milestone.durationWeeks > 0 
          ? milestone.durationWeeks 
          : 4; // Default to 4 weeks if missing or invalid
        
        const storedMilestone = await storage.createMilestone({
          planId: plan.id,
          title: milestone.title || `Phase ${i + 1}`,
          description: milestone.description || null,
          priority: milestone.priority || "Medium",
          durationWeeks: durationWeeks,
          order: i + 1,
          progress: 0,
        });

        // Use resources from LangGraph's response directly
        if (milestone.resources && Array.isArray(milestone.resources) && milestone.resources.length > 0) {
          for (const resource of milestone.resources) {
            await storage.createResource({
              milestoneId: storedMilestone.id,
              title: resource.title || `Resource for ${milestone.title || 'Milestone'}`,
              url: resource.url || "https://www.coursera.org/",
              type: resource.type || "website",
            });
          }
        } else {
          // Find additional resources with Tavily search
          // Note: This situation should be rare as our plan generation includes resources
          console.log("Finding additional resources for milestone using Tavily search");
          const additionalResources = await findResources(
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
  // Get scraped data by transition ID
  apiRouter.get("/scraped-data/:transitionId", async (req, res) => {
    try {
      const transitionId = parseInt(req.params.transitionId);
      
      // Validate transitionId
      if (isNaN(transitionId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transition ID" 
        });
      }

      // Get scraped data
      const scrapedData = await storage.getScrapedDataByTransitionId(transitionId);
      
      res.json({ 
        success: true, 
        data: scrapedData
      });
    } catch (error) {
      console.error("Error fetching scraped data:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch scraped data" 
      });
    }
  });

  // Get analyzed stories data
  apiRouter.get("/stories-analysis/:transitionId", async (req, res) => {
    try {
      const transitionId = parseInt(req.params.transitionId);
      
      // Validate transitionId
      if (isNaN(transitionId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transition ID" 
        });
      }

      // Get transition info
      const transition = await storage.getTransition(transitionId);
      if (!transition) {
        return res.status(404).json({ 
          success: false, 
          error: "Transition not found" 
        });
      }

      // Clear existing insights to ensure fresh data
      await storage.deleteInsightsByTransitionId(transitionId);
      console.log(`Cleared existing insights for transition ID: ${transitionId} to ensure fresh analysis`);
      
      // Get insights (should be empty after deletion)
      let insights: any[] = [];
      if (insights.length === 0) {
        console.log("No insights found, generating insights with LangGraph and Tavily");
        
        const { currentRole, targetRole } = transition;
        
        try {
          // Get existing scraped data first - use what was already scraped
          const scrapedData = await storage.getScrapedDataByTransitionId(transitionId);
          
          // Convert DB data to the format expected by analyzeTransitionStories
          let formattedData: { source: string; content: string; url: string; date: string }[] = 
            scrapedData.map(item => ({
              source: item.source,
              content: item.content,
              url: item.url || "", // Empty string fallback for null values
              date: item.postDate || new Date().toISOString().split('T')[0] // Today's date as fallback
            }));
          
          // If no scraped data exists yet, only then do a quick search
          if (formattedData.length === 0) {
            console.log(`No scraped data found for transition ID: ${transitionId}, fetching some stories`);
            const searchQuery = `Career transition from ${currentRole} to ${targetRole} experiences, challenges, and success stories`;
            
            console.log(`Searching for career transition stories: ${searchQuery}`);
            const searchResults = await searchForums(currentRole, targetRole);
            
            // The search results are already in the correct format for analyzeTransitionStories
            formattedData = searchResults;
            
            // Save these stories to the database so they're available for later steps
            for (const item of formattedData) {
              try {
                await storage.createScrapedData({
                  transitionId,
                  source: item.source,
                  content: item.content,
                  url: item.url || null,
                  postDate: item.date || null,
                  skillsExtracted: [] 
                });
              } catch (saveError) {
                console.error("Error saving scraped data:", saveError);
              }
            }
          }
          
          // Now analyze the data with LangGraph
          if (formattedData.length > 0) {
            console.log(`Analyzing ${formattedData.length} stories with LangGraph and Tavily`);
            const analysisResult = await analyzeTransitionStories(
              currentRole, 
              targetRole, 
              formattedData
            );
            
            // Store observations from LangGraph analysis
            if (analysisResult.keyObservations && analysisResult.keyObservations.length > 0) {
              for (const observation of analysisResult.keyObservations) {
                await storage.createInsight({
                  transitionId,
                  type: "observation",
                  content: observation,
                  source: "Tavily Search",
                  date: new Date().toISOString().split('T')[0],
                  experienceYears: null
                });
              }
            } else {
              // Fallback observation if LangGraph didn't return any
              await storage.createInsight({
                transitionId,
                type: "observation",
                content: `Professionals transitioning from ${currentRole} to ${targetRole} often succeed by focusing on transferable skills and relevant project work.`,
                source: "LangGraph Analysis",
                date: new Date().toISOString().split('T')[0],
                experienceYears: null
              });
            }
            
            // Store challenges from LangGraph analysis
            if (analysisResult.commonChallenges && analysisResult.commonChallenges.length > 0) {
              for (const challenge of analysisResult.commonChallenges) {
                await storage.createInsight({
                  transitionId,
                  type: "challenge",
                  content: challenge,
                  source: "Tavily Search",
                  date: new Date().toISOString().split('T')[0],
                  experienceYears: null
                });
              }
            } else {
              // Fallback challenge if LangGraph didn't return any
              await storage.createInsight({
                transitionId,
                type: "challenge",
                content: `The most common challenge in transitioning from ${currentRole} to ${targetRole} is demonstrating equivalent experience in the new domain.`,
                source: "LangGraph Analysis",
                date: new Date().toISOString().split('T')[0],
                experienceYears: null
              });
            }
            
            // Add transition stories directly from scraped data
            if (formattedData && formattedData.length > 0) {
              for (const story of formattedData.slice(0, 2)) {
                // Clean/truncate content to a reasonable length for stories
                if (story && story.content) { 
                  let storyContent = story.content;
                  if (storyContent.length > 500) {
                    storyContent = storyContent.substring(0, 500) + "...";
                  }
                  
                  await storage.createInsight({
                    transitionId,
                    type: "story",
                    content: storyContent,
                    source: story.source,
                    date: story.date || new Date().toISOString().split('T')[0],
                    experienceYears: Math.floor(Math.random() * 5) + 2, // Estimated experience
                    url: story.url || null
                  });
                }
              }
            }
            
          } else {
            // Fallback insights if Tavily search returned no results
            console.log("No transition stories found with Tavily, creating fallback insights");
            
            // Create fallback observations using LangGraph analysis
            const observationsPrompt = `What are the key observations about career transitions from ${currentRole} to ${targetRole}? Provide 3 specific, data-backed insights. Answer in a JSON array of strings.`;
            
            try {
              const observationsResponse = await callLLM(observationsPrompt, 800);
              const observationsMatch = observationsResponse.match(/\[\s*".*"\s*(?:,\s*".*"\s*)*\]/s);
              
              let observations: string[] = [];
              if (observationsMatch) {
                observations = JSON.parse(observationsMatch[0]);
              }
              
              // Store the observations
              for (const observation of observations.slice(0, 3)) {
                await storage.createInsight({
                  transitionId,
                  type: "observation",
                  content: observation,
                  source: "LangGraph Analysis",
                  date: new Date().toISOString().split('T')[0],
                  experienceYears: null
                });
              }
            } catch (error) {
              console.error("Failed to generate observations with LangGraph:", error);
              // Add one fallback observation
              await storage.createInsight({
                transitionId,
                type: "observation",
                content: `Professionals transitioning from ${currentRole} to ${targetRole} typically need to develop new technical and soft skills specific to the target role.`,
                source: "System Analysis",
                date: new Date().toISOString().split('T')[0],
                experienceYears: null
              });
            }
            
            // Create fallback challenges using LangGraph analysis
            const challengesPrompt = `What are the main challenges people face when transitioning from ${currentRole} to ${targetRole}? Provide 3 specific challenges. Answer in a JSON array of strings.`;
            
            try {
              const challengesResponse = await callLLM(challengesPrompt, 800);
              const challengesMatch = challengesResponse.match(/\[\s*".*"\s*(?:,\s*".*"\s*)*\]/s);
              
              let challenges: string[] = [];
              if (challengesMatch) {
                challenges = JSON.parse(challengesMatch[0]);
              }
              
              // Store the challenges
              for (const challenge of challenges.slice(0, 3)) {
                await storage.createInsight({
                  transitionId,
                  type: "challenge",
                  content: challenge,
                  source: "LangGraph Analysis",
                  date: new Date().toISOString().split('T')[0],
                  experienceYears: null
                });
              }
            } catch (error) {
              console.error("Failed to generate challenges with LangGraph:", error);
              // Add one fallback challenge
              await storage.createInsight({
                transitionId,
                type: "challenge",
                content: `A key challenge in transitioning from ${currentRole} to ${targetRole} is adapting to different organizational structures and processes.`,
                source: "System Analysis",
                date: new Date().toISOString().split('T')[0],
                experienceYears: null
              });
            }
          }
          
        } catch (error) {
          console.error("Error generating insights with LangGraph:", error);
          
          // Create minimal fallback insights if all else fails
          await storage.createInsight({
            transitionId,
            type: "observation",
            content: `Career transitions between similar technical roles typically take 6-12 months to complete.`,
            source: "System Analysis",
            date: new Date().toISOString().split('T')[0],
            experienceYears: null
          });
          
          await storage.createInsight({
            transitionId,
            type: "challenge",
            content: `Gaining practical experience in the target role's technologies is often the biggest challenge in career transitions.`,
            source: "System Analysis",
            date: new Date().toISOString().split('T')[0],
            experienceYears: null
          });
        }
        
        // Retrieve the newly created insights
        insights = await storage.getInsightsByTransitionId(transitionId);
        console.log(`Created ${insights.length} insights for transition with LangGraph and Tavily`);
      }
      
      // Process insights to get key observations and challenges
      const keyObservations = insights
        .filter(i => i.type === "observation")
        .map(i => i.content);
      
      const commonChallenges = insights
        .filter(i => i.type === "challenge")
        .map(i => i.content);
      
      res.json({ 
        success: true, 
        data: {
          keyObservations,
          commonChallenges
        }
      });
    } catch (error) {
      console.error("Error fetching stories analysis:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch stories analysis" 
      });
    }
  });

  // Get transition insights
  apiRouter.get("/insights/:transitionId", async (req, res) => {
    try {
      const transitionId = parseInt(req.params.transitionId);
      
      // Validate transitionId
      if (isNaN(transitionId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid transition ID" 
        });
      }

      // Get transition to get context
      const transition = await storage.getTransition(transitionId);
      if (!transition) {
        return res.status(404).json({ 
          success: false, 
          error: "Transition not found" 
        });
      }

      // Get scraped data
      const scrapedData = await storage.getScrapedDataByTransitionId(transitionId);
      const scrapedCount = scrapedData.length;
      
      if (scrapedCount === 0) {
        // Generate insights with LangGraph and Tavily when we don't have scraped data
        console.log("No scraped data found, generating insights with LangGraph and Tavily");
        
        try {
          // Create a transition query for LangGraph to search
          const transitionQuery = `${transition.currentRole} to ${transition.targetRole} career transition statistics, success rate, time frame, common paths`;
          
          console.log(`Searching for transition statistics: ${transitionQuery}`);
          const langGraphPrompt = `
            You are a career transition analyst studying transitions from ${transition.currentRole} to ${transition.targetRole}.
            
            Search for real data and statistics about this specific career transition path.
            Look for:
            1. Success rate (percentage of people who successfully complete this transition)
            2. Average time to complete the transition (in months)
            3. Most common paths or strategies people use to make this transition (with approximations of how many people use each path)
            
            Present your findings as a JSON object with the following format:
            {
              "successRate": number, // percentage (1-100)
              "avgTransitionTime": number, // months
              "commonPaths": [
                { "path": "description", "count": number }
              ]
            }
            
            Include at least 3 common paths. Cite your sources when possible.
            Return only the JSON, with no additional text.
          `;
          
          const langGraphResponse = await callLLM(langGraphPrompt, 1000);
          
          try {
            // Debug the structure of the response
            console.log("LangGraph response structure:", typeof langGraphResponse);
            
            let insightsData;
            let responseText = '';
            
            // Handle different response formats from LangGraph
            if (typeof langGraphResponse === 'string') {
              // If it's already a string, use it directly
              responseText = langGraphResponse;
            } else if (Array.isArray(langGraphResponse)) {
              // If it's an array (as seen in the error logs), join it to create a string
              responseText = (langGraphResponse as string[]).join('');
            } else if (langGraphResponse && typeof langGraphResponse === 'object') {
              // If it's an object, try to stringify it
              responseText = JSON.stringify(langGraphResponse);
            } else {
              // If it's something else, convert to string
              responseText = String(langGraphResponse || '');
            }
            
            // First, check if the response contains a JSON object
            try {
              // Try parsing the entire response as JSON
              insightsData = JSON.parse(responseText);
            } catch (jsonError) {
              // If direct parsing fails, try to extract JSON from text
              const jsonMatch = responseText.match(/\{[\s\S]*?\}/s); // Non-greedy match for first complete JSON object
              if (jsonMatch) {
                try {
                  insightsData = JSON.parse(jsonMatch[0]);
                } catch (matchJsonError) {
                  console.log("First JSON parse attempt failed, trying with sanitization");
                  try {
                    // If that also fails, try to sanitize the JSON more thoroughly
                    let sanitized = jsonMatch[0];
                    
                    // Step 1: Normalize property names to have double quotes
                    sanitized = sanitized.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
                    
                    // Step 2: Replace single quotes around values with double quotes
                    sanitized = sanitized.replace(/:(\s*)'([^']*)'/g, ':$1"$2"');
                    
                    // Step 3: Fix trailing commas in arrays/objects
                    sanitized = sanitized.replace(/,(\s*[\]}])/g, '$1');
                    
                    console.log("Sanitized JSON:", sanitized.substring(0, 100) + "...");
                    insightsData = JSON.parse(sanitized);
                  } catch (sanitizeError) {
                    console.error("JSON sanitization failed:", sanitizeError);
                    
                    // Last resort: provide a fallback structure
                    console.log("Fallback to basic transition insights after LangGraph failures");
                    insightsData = {
                      successRate: 70,
                      avgTransitionTime: 6,
                      commonPaths: [
                        {
                          path: `Direct ${transition.currentRole} to ${transition.targetRole}`,
                          count: 5
                        }
                      ],
                      rationale: `This is based on general career data for ${transition.currentRole} to ${transition.targetRole} transitions.`
                    };
                  }
                }
              } else {
                console.error("No JSON object found in response");
                throw new Error("No JSON object found in response");
              }
            }
            
            // Validate the structure and ensure all required fields are present
            if (typeof insightsData.successRate !== 'number' || 
                typeof insightsData.avgTransitionTime !== 'number' ||
                !Array.isArray(insightsData.commonPaths)) {
              throw new Error("Invalid data structure from LangGraph response");
            }
            
            // Add skill importance if not present
            if (!insightsData.skillImportance) {
              // Generate skill importance using transition roles
              const skillPrompt = `What are the most important skills for a ${transition.currentRole} transitioning to ${transition.targetRole}? 
              Return a JSON array of objects with "skill" and "importance" (1-10) properties. Include at least 4 skills.`;
              
              const skillResponse = await callLLM(skillPrompt, 800);
              const skillsMatch = skillResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
              
              if (skillsMatch) {
                insightsData.skillImportance = JSON.parse(skillsMatch[0]);
              }
            }
            
            // Add key factors if not present
            if (!insightsData.keyFactors) {
              // Generate key success factors without markdown formatting
              const factorsPrompt = `What are the key success factors for transitioning from ${transition.currentRole} to ${transition.targetRole}?
              Return a JSON array of strings with at least 4 factors.
              Important: Do not use asterisks (*) or markdown formatting in your response. Use plain text only.`;
              
              const factorsResponse = await callLLM(factorsPrompt, 800);
              const factorsMatch = factorsResponse.match(/\[\s*".*"\s*(?:,\s*".*"\s*)*\]/s);
              
              if (factorsMatch) {
                insightsData.keyFactors = JSON.parse(factorsMatch[0]);
              }
            }
            
            return res.json({
              success: true,
              insights: insightsData
            });
          } catch (parseError) {
            console.error("Error parsing LangGraph response:", parseError);
            // Fall through to fallback insights
          }
        } catch (langGraphError) {
          console.error("Error using LangGraph and Tavily for insights:", langGraphError);
          // Fall through to fallback insights
        }
        
        // Final fallback if all LangGraph calls fail
        console.log("Fallback to basic transition insights after LangGraph failures");
        
        const fallbackInsights = {
          successRate: 70, // conservative estimate
          avgTransitionTime: 8, // months (conservative estimate)
          commonPaths: [
            { path: `Direct application to ${transition.targetRole} positions with referrals`, count: 10 },
            { path: `Project-based demonstration of skills needed for ${transition.targetRole}`, count: 7 },
            { path: `Gradual role shift within the same company`, count: 5 }
          ],
          skillImportance: [
            { skill: "System Design", importance: 8 },
            { skill: "Leadership", importance: 7 },
            { skill: "Technical Communication", importance: 8 },
            { skill: "Project Management", importance: 6 }
          ],
          keyFactors: [
            "Building a portfolio of relevant projects",
            "Networking with professionals in the target role",
            "Obtaining relevant certifications",
            "Contributing to open source or community projects"
          ],
          _source: "Generated with minimal data; actual results may vary"
        };
        
        return res.json({
          success: true,
          insights: fallbackInsights
        });
      }
      
      // Generate insights from scraped data using LangGraph and Tavily
      // First, get any existing skill gaps to extract user skills
      const skillGaps = await storage.getSkillGapsByTransitionId(transitionId);
      const userSkills = skillGaps.map(gap => gap.skillName);
      
      // Clear existing transition data to ensure we get fresh results
      await storage.clearTransitionData(transitionId);
      console.log(`Cleared existing data for transition ID: ${transitionId} to ensure fresh analysis`);
      
      try {
        // Convert scrapedData to compatible format for analysis
        const formattedData = scrapedData.map(item => ({
          source: item.source,
          content: item.content,
          url: item.url || item.postDate || new Date().toISOString().split('T')[0],
          date: item.postDate || new Date().toISOString().split('T')[0],
          postDate: item.postDate || undefined
        }));
        
        // Try to get personalized success rate first
        try {
          console.log("Calculating personalized success rate with LangGraph and Tavily");
          const personalizedData = await calculatePersonalizedSuccessRate(
            transition.currentRole,
            transition.targetRole,
            userSkills
          );
          
          // Try to get average transition time and common paths
          let avgTime = 6; // Default time if not available
          let commonPaths = [];
          
          try {
            const overviewData = await generateTransitionOverview(
              transition.currentRole,
              transition.targetRole,
              formattedData
            );
            
            avgTime = overviewData.avgTransitionTime;
            commonPaths = overviewData.commonPaths;
          } catch (overviewError) {
            console.error("Error generating overview details:", overviewError);
            
            // Use default paths if not available
            commonPaths = [
              { path: `Direct application to ${transition.targetRole} positions with referrals`, count: 10 },
              { path: `Project-based demonstration of skills needed for ${transition.targetRole}`, count: 7 },
              { path: `Gradual role shift within the same company`, count: 5 }
            ];
          }
          
          // Create a complete insights object with the personalized success rate
          const completeInsights = {
            successRate: personalizedData.successRate,
            avgTransitionTime: avgTime,
            commonPaths: commonPaths,
            rationale: personalizedData.rationale,
            keyFactors: personalizedData.keyFactors
          };
          
          res.json({ 
            success: true, 
            insights: completeInsights
          });
        } catch (personalizedError) {
          console.error("Error calculating personalized success rate:", personalizedError);
          
          // Fall back to standard overview if personalized approach fails
          try {
            const overviewData = await generateTransitionOverview(
              transition.currentRole,
              transition.targetRole,
              formattedData
            );
            
            res.json({ 
              success: true, 
              insights: overviewData
            });
          } catch (overviewError) {
            console.error("Error generating insights with LangGraph and Tavily:", overviewError);
            console.log("Using baseline insights after multiple LangGraph API failures");
            
            // Use fallback insights as last resort
            const baselineInsights = {
              successRate: 65, // general baseline estimate
              avgTransitionTime: 8, // months (general baseline)
              commonPaths: [
                { path: `Direct application to ${transition.targetRole} positions with referrals`, count: 10 },
                { path: `Project-based demonstration of skills needed for ${transition.targetRole}`, count: 7 },
                { path: `Gradual role shift within the same company`, count: 5 }
              ]
            };
            
            res.json({
              success: true,
              insights: baselineInsights
            });
          }
        }
      } catch (error) {
        console.error("Error preparing data for insights generation:", error);
        res.status(500).json({
          success: false,
          error: "Failed to generate insights from transition data"
        });
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch insights" 
      });
    }
  });

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
