// server/agents/memoryEnabledAgent.ts

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { StructuredTool } from "@langchain/core/tools";
import { storage } from "../storage";
import { z } from "zod";
import { SkillGapAnalysis } from "./langGraphAgent";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MCPHandler } from "../helpers/mcpHandler";
import { careerTransitionMemory } from './memoryStore';
import { safeParseJSON } from '../helpers/jsonParserHelper';
import { CareerTransitionSearch, SkillGapSearch, LearningResourceSearch } from '../tools/tavilySearch';

/**
 * A single agent with long-term memory for career transition analysis
 * This replaces the multi-agent system with a simpler, more robust approach
 */
export class MemoryEnabledAgent {
  private model: any;
  private tools: StructuredTool[] = [];
  private memoryStore: MemoryVectorStore | null = null;
  private userId: number;
  private transitionId: number;
  private mcpHandler: any;

  // Simple string hashing function for embedding generation
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  constructor(userId: number, transitionId: number) {
    this.transitionId = transitionId;
    this.userId = userId;
    
    // Initialize the model with Gemini 2.0 Flash Lite
    this.model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY || "",
      modelName: "gemini-2.0-flash-lite", // Use Gemini for all operations
      temperature: 0.3,
      maxOutputTokens: 2048,
    });
    
    // Initialize memory store with simple embeddings that don't require OpenAI
    try {
      // Use a simple cosine similarity function for embeddings
      const embeddings = {
        embedDocuments: async (texts: string[]) => {
          // Create simple word-based embeddings
          return texts.map(text => {
            // Split text into words, normalize, and count word frequencies
            const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
            const vector = Array(512).fill(0); // Smaller vector size than OpenAI (1536)
            
            // Hash words into vector positions
            for (const word of words) {
              const position = Math.abs(this.simpleHash(word) % 512);
              vector[position] += 1;
            }
            
            // Normalize vector
            const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
            return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
          });
        },
        embedQuery: async (text: string) => {
          // Use the same embedding logic for queries
          const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
          const vector = Array(512).fill(0);
          
          for (const word of words) {
            const position = Math.abs(this.simpleHash(word) % 512);
            vector[position] += 1;
          }
          
          // Normalize vector
          const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
          return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
        }
      };
      
      this.memoryStore = new MemoryVectorStore(embeddings);
      console.log("Initialized memory store with simple embeddings (no OpenAI dependency)");
    } catch (error) {
      console.warn("Failed to initialize memory store with embeddings:", error);
      // Use an even simpler fallback if the above fails
      const fallbackEmbeddings = {
        embedDocuments: async (texts: string[]) => texts.map(() => Array(512).fill(0)),
        embedQuery: async (text: string) => Array(512).fill(0),
      };
      this.memoryStore = new MemoryVectorStore(fallbackEmbeddings);
    }
    
    // Initialize MCP handler
    try {
      this.mcpHandler = new MCPHandler(userId, transitionId);
      
      // Initialize MCP handler in the background
      this.initializeMCP().catch(error => {
        console.error("Error initializing MCP:", error);
      });
    } catch (error) {
      console.error("Failed to initialize MCP handler:", error);
    }

    // Initialize tools - using only TavilySearchResults without Zod schema
    // to avoid serialization issues with Google Gemini
    try {
      this.tools = [
        new TavilySearchResults({
          maxResults: 5,
          apiKey: process.env.TAVILY_API_KEY,
        })
      ];
    } catch (error) {
      console.error("Failed to initialize tools:", error);
      this.tools = [];
    }
    
    // Initialize agent state in memory store
    careerTransitionMemory.updateMemory(transitionId, userId, {
      state: 'initializing',
      data: {}
    });
  }

  /**
   * Initialize MCP handler by loading contexts
   */
  private async initializeMCP(): Promise<void> {
    await this.mcpHandler.initialize();
  }

  /**
   * Analyze a career transition from current to target role
   */
  async analyzeCareerTransition(
    currentRole: string,
    targetRole: string,
    transitionId: number,
    existingSkills: string[] = [],
    forceRefresh: boolean = false,
  ): Promise<{
    skillGaps: SkillGapAnalysis[];
    insights: any;
    scrapedCount: number;
  }> {
    // Check if this transition is already being processed using the memory store
    if (careerTransitionMemory.isTransitionInProgress(transitionId, forceRefresh)) {
      console.warn(`Career transition analysis already in progress for ID ${transitionId}, skipping duplicate request`);
      
      // Return the current state from memory, or fallbacks if nothing exists
      const memory = careerTransitionMemory.getMemory(transitionId);
      if (memory && memory.data) {
        return {
          skillGaps: memory.data.skillGaps || this.getFallbackSkillGaps(currentRole, targetRole),
          insights: memory.data.insights || this.getFallbackInsights(currentRole, targetRole),
          scrapedCount: memory.data.scrapedData?.length || 0,
        };
      }
      
      return {
        skillGaps: this.getFallbackSkillGaps(currentRole, targetRole),
        insights: this.getFallbackInsights(currentRole, targetRole),
        scrapedCount: 0,
      };
    }
    
    // If force refresh is enabled, clear existing data
    if (forceRefresh) {
      console.log(`Force refresh enabled for transition ${transitionId}, clearing existing data...`);
      try {
        await storage.clearTransitionData(transitionId);
        console.log(`Successfully cleared existing data for transition ${transitionId}`);
      } catch (error) {
        console.error(`Error clearing data for transition ${transitionId}:`, error);
      }
    }
    
    // Mark this transition as in-progress in the memory store
    careerTransitionMemory.markTransitionInProgress(transitionId);
    
    try {
      console.log(`Starting career transition analysis: ${currentRole} → ${targetRole}`);
      
      // Store initial state
      careerTransitionMemory.updateMemory(transitionId, this.userId, {
        state: 'initializing',
        data: {}
      });

      // Clear existing data for fresh analysis
      await storage.clearTransitionData(transitionId);
      
      // Update memory state to scraping
      careerTransitionMemory.updateMemory(transitionId, this.userId, {
        state: 'scraping'
      });

      // Check if tools exist before trying to bind them
      let modelWithTools;
      if (this.tools && this.tools.length > 0) {
        try {
          // Bind tools to the model with error handling
          modelWithTools = this.model.bindTools(this.tools);
        } catch (bindError) {
          console.error("Error binding tools to model:", bindError);
          // Fall back to using the model without tools
          modelWithTools = this.model;
        }
      } else {
        // If no tools are available, just use the base model
        modelWithTools = this.model;
      }

      // Step 1: Research transition stories - with error isolation
      let stories = [];
      try {
        stories = await this.researchTransitionStories(
          modelWithTools,
          currentRole,
          targetRole,
          transitionId,
        );
        
        // Update memory with scraped data
        careerTransitionMemory.updateMemory(transitionId, this.userId, {
          state: 'analyzing',
          data: {
            scrapedData: stories
          }
        });
      } catch (storiesError) {
        console.error("Error researching transition stories:", storiesError);
        // Continue with empty stories rather than failing the whole process
      }

      // Step 2: Analyze skill gaps - with error isolation
      let skillGaps = [];
      try {
        skillGaps = await this.analyzeSkillGaps(
          modelWithTools,
          currentRole,
          targetRole,
          transitionId,
          existingSkills,
          stories,
        );
        
        // Update memory with skill gaps
        careerTransitionMemory.updateMemory(transitionId, this.userId, {
          data: {
            ...careerTransitionMemory.getMemory(transitionId)?.data,
            skillGaps: skillGaps
          }
        });
      } catch (skillGapsError) {
        console.error("Error analyzing skill gaps:", skillGapsError);
        // Fall back to generated skill gaps
        skillGaps = this.getFallbackSkillGaps(currentRole, targetRole);
        
        // Update memory with fallback skill gaps
        careerTransitionMemory.updateMemory(transitionId, this.userId, {
          data: {
            ...careerTransitionMemory.getMemory(transitionId)?.data,
            skillGaps: skillGaps
          }
        });
      }

      // Step 3: Generate insights - with error isolation
      let insights = {};
      try {
        insights = await this.generateInsights(
          modelWithTools,
          currentRole,
          targetRole,
          transitionId,
          stories,
          skillGaps,
        );
        
        // Update memory with insights
        careerTransitionMemory.updateMemory(transitionId, this.userId, {
          state: 'planning',
          data: {
            ...careerTransitionMemory.getMemory(transitionId)?.data,
            insights: insights
          }
        });
      } catch (insightsError) {
        console.error("Error generating insights:", insightsError);
        // Fall back to generated insights
        insights = this.getFallbackInsights(currentRole, targetRole);
        
        // Update memory with fallback insights
        careerTransitionMemory.updateMemory(transitionId, this.userId, {
          state: 'planning',
          data: {
            ...careerTransitionMemory.getMemory(transitionId)?.data,
            insights: insights
          }
        });
      }

      // Step 4: Create development plan - with error isolation
      let plan = {};
      try {
        plan = await this.createDevelopmentPlan(
          modelWithTools,
          currentRole,
          targetRole,
          transitionId,
          skillGaps,
          insights,
        );
        
        // Update memory with plan
        careerTransitionMemory.updateMemory(transitionId, this.userId, {
          data: {
            ...careerTransitionMemory.getMemory(transitionId)?.data,
            plan: plan
          }
        });
      } catch (planError) {
        console.error("Error creating development plan:", planError);
        // Continue without a plan
      }

      // Mark transition as complete in the memory store
      careerTransitionMemory.updateMemory(transitionId, this.userId, {
        state: 'complete'
      });
      
      // Always mark the transition as complete in the database, regardless of partial failures
      await storage.updateTransitionStatus(transitionId, true);

      // Return the combined results
      return {
        skillGaps,
        insights: {
          ...insights,
          plan,
        },
        scrapedCount: stories.length,
      };
    } catch (error) {
      console.error("Critical error in career transition analysis:", error);
      
      // Update memory to mark as complete but with error status
      const currentData = careerTransitionMemory.getMemory(transitionId)?.data || {};
      careerTransitionMemory.updateMemory(transitionId, this.userId, {
        state: 'complete',
        data: {
          ...currentData,
          // Include error information without breaking the type
          skillGaps: currentData.skillGaps || this.getFallbackSkillGaps(currentRole, targetRole),
          insights: {
            ...(currentData.insights || {}),
            errorOccurred: true
          }
        }
      });
      
      // Try to mark the transition as complete even in case of error
      try {
        await storage.updateTransitionStatus(transitionId, true);
      } catch (updateError) {
        console.error("Failed to update transition status after error:", updateError);
      }
      
      // Return fallback results if there's an error
      return {
        skillGaps: this.getFallbackSkillGaps(currentRole, targetRole),
        insights: this.getFallbackInsights(currentRole, targetRole),
        scrapedCount: 0,
      };
    } finally {
      // Always mark the transition as complete in the memory store
      careerTransitionMemory.markTransitionComplete(transitionId);
    }
  }

  /**
   * Research transition stories using Tavily search
   */
  private async researchTransitionStories(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
  ): Promise<any[]> {
    try {
      console.log(
        `Researching transition stories for ${currentRole} → ${targetRole}`,
      );

      // Extract company and role information for broader searches
      const currentParts = currentRole.split(' ');
      const currentCompany = currentParts[0] || "";
      const currentRoleTitle = currentParts.slice(1, -1).join(' ') || "Software Engineer";
      
      const targetParts = targetRole.split(' ');
      const targetCompany = targetParts[0] || "";
      const targetRoleTitle = targetParts.slice(1, -1).join(' ') || "Software Engineer";
      
      // Define a series of search queries with decreasing specificity
      const searchQueries = [
        // Exact role transition
        `career transition stories from ${currentRole} to ${targetRole} experiences challenges success`,
        
        // Company transition with role
        `${currentCompany} to ${targetCompany} ${currentRoleTitle} to ${targetRoleTitle} transition stories experiences`,
        
        // Generic role transition without company
        `${currentRoleTitle} to ${targetRoleTitle} career transition experiences success stories challenges`,
        
        // Industry transition
        `software engineer career advancement to senior staff engineer transition experiences`,
        
        // Similar role transition (if roles are different)
        `similar transitions to ${targetRoleTitle} from other technical roles success stories`
      ];
      
      // Construct the research prompt with broader search parameters
      const researchPrompt = `
      Research career transition stories that can help someone moving from ${currentRole} to ${targetRole}.

      Follow these steps:
      1. Use Tavily search to find relevant transition stories from credible sources
      2. Consider stories from similar roles or companies if exact matches aren't available
      3. Look at both specific (${currentCompany} to ${targetCompany}) transitions and general role progressions
      4. Extract specific details about:
         - Technical skill requirements
         - Timeline and learning paths
         - Common challenges faced
         - Success strategies

      Even if you can't find exact matches, find stories of similar transitions that would be relevant.
      Focus on career blogs, tech forums, LinkedIn articles, Medium posts, and company culture insights.
      
      Extract at least 3-5 examples that would be helpful for this specific transition.
      `;

      // Use multiple search approaches with different queries
      for (let queryIndex = 0; queryIndex < searchQueries.length; queryIndex++) {
        const currentQuery = searchQueries[queryIndex];
        console.log(`Searching: ${currentQuery}`);
        
        try {
          const response = await modelWithTools.invoke([
            new SystemMessage(
              "You are a career researcher who finds and adapts relevant transition stories. Even if exact matches aren't available, find similar transitions that provide valuable insights."
            ),
            new HumanMessage(`
              ${researchPrompt}
              
              Current search focus: ${currentQuery}
              
              If you don't find exact matches, extract insights from similar transitions that would be useful.
            `),
          ]);

          // Parse the response to extract stories
          const content = response.content.toString();
          const stories = this.extractStories(content, currentRole, targetRole);

          if (stories.length > 0) {
            console.log(`Successfully extracted ${stories.length} stories from search approach ${queryIndex + 1}`);
            
            // Save the stories to the database
            for (const story of stories) {
              try {
                await storage.createScrapedData({
                  transitionId,
                  source: story.source || "AI Research",
                  content: story.content,
                  url: story.url || null,
                  postDate: story.date || null,
                  skillsExtracted: [],
                });
              } catch (dbError) {
                console.error("Error saving story to database:", dbError);
              }
            }
            
            return stories;
          }
        } catch (attemptError) {
          console.error(`Error in search approach ${queryIndex + 1}:`, attemptError);
        }
      }

      // If we reached here, all attempts failed
      console.log("All story search attempts failed, using simulated stories");
      const simulatedStories = this.generateSimulatedStories(currentRole, targetRole);
      
      // Save simulated stories to database
      for (const story of simulatedStories) {
        await storage.createScrapedData({
          transitionId,
          source: story.source,
          content: story.content,
          url: null,
          postDate: null,
          skillsExtracted: [],
        });
      }
      
      return simulatedStories;
    } catch (error) {
      console.error("Error researching transition stories:", error);
      
      // If all else fails, return an empty array
      return [];
    }
  }
  
  /**
   * Extract stories from AI model response
   */
  private extractStories(content: string, currentRole: string, targetRole: string): any[] {
    try {
      // Try to extract structured stories from the response
      const storyPattern = /(?:Story|Example|Transition)\s*\d+:\s*([^]+?)(?=(?:Story|Example|Transition)\s*\d+:|$)/gi;
      const storyMatches = content.match(storyPattern);

      if (storyMatches && storyMatches.length > 0) {
        return storyMatches.map((storyText, index) => {
          // Try to extract source
          const sourceMatch = storyText.match(/(?:Source|From|Posted on):\s*([^,\n]+)/i);
          const source = sourceMatch ? sourceMatch[1].trim() : "Research";

          // Try to extract URL
          const urlMatch = storyText.match(/(?:URL|Link):\s*(https?:\/\/[^\s,\n]+)/i);
          const url = urlMatch ? urlMatch[1].trim() : "";

          // Try to extract date
          const dateMatch = storyText.match(/(?:Date|Posted|Published):\s*([^\n,]+\d{4})/i);
          const date = dateMatch ? dateMatch[1].trim() : "";

          return {
            id: index,
            source,
            content: storyText.trim(),
            url,
            date,
          };
        });
      }

      // If structured stories weren't found, try to extract paragraphs as stories
      const paragraphs = content.split(/\n\n+/).filter(p => p.length > 100);
      if (paragraphs.length > 0) {
        return paragraphs.map((paragraph, index) => ({
          id: index,
          source: "AI Research",
          content: paragraph.trim(),
          url: "",
          date: "",
        }));
      }

      return [];
    } catch (error) {
      console.error("Error extracting stories:", error);
      return [];
    }
  }

  /**
   * Generate simulated transition stories when research fails
   */
  private generateSimulatedStories(currentRole: string, targetRole: string): any[] {
    return [
      {
        id: 1,
        source: "Professional Transition Blog",
        content: `After spending 5 years as a ${currentRole}, I decided to transition to a ${targetRole} role. The biggest challenges were learning new technical skills and adapting to a different workflow. I spent about 6 months taking online courses and working on side projects to build my portfolio. What helped most was connecting with people already in ${targetRole} positions who could provide mentorship and advice.`,
        url: "",
        date: new Date().toISOString().split("T")[0],
      },
      {
        id: 2,
        source: "Career Forum",
        content: `My journey from ${currentRole} to ${targetRole} took about 9 months of dedicated effort. I started by identifying the skill gaps - particularly in technical areas I hadn't been exposed to before. The interview process was challenging, but highlighting my transferable skills from my previous role really helped. My advice is to focus on building practical experience through projects rather than just theoretical learning.`,
        url: "",
        date: new Date().toISOString().split("T")[0],
      },
    ];
  }

  /**
   * Analyze skill gaps between roles
   */
  private async analyzeSkillGaps(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
    existingSkills: string[],
    stories: any[],
  ): Promise<SkillGapAnalysis[]> {
    try {
      console.log(`Analyzing skill gaps for ${currentRole} → ${targetRole}`);

      // Format stories for analysis
      const storiesText = stories.map((story) => story.content).join("\n\n");
      
      // Format existing skills for analysis
      const formattedExistingSkills = existingSkills.length > 0 
        ? existingSkills.join(", ")
        : "None provided";
        
      // Get target role skills from the database if available
      let targetRoleSkills: string[] = [];
      try {
        const roleSkills = await storage.getRoleSkills(targetRole);
        targetRoleSkills = roleSkills.map(skill => skill.skillName);
      } catch(error) {
        console.error("Error retrieving target role skills:", error);
      }
      
      // Format target role skills for the prompt
      const targetRoleSkillsText = targetRoleSkills.length > 0
        ? `\nSkills typically required for ${targetRole}: ${targetRoleSkills.join(", ")}`
        : "";

      const skillGapPrompt = `
      Analyze skill gaps for transition from ${currentRole} to ${targetRole}.

      User's existing skills: ${formattedExistingSkills}
      ${targetRoleSkillsText}

      Transition stories:
      ${storiesText}

      Instructions:
      1. Carefully analyze which skills from the target role requirements are missing from the user's existing skills
      2. Focus on identifying the most critical gaps needed for successful transition
      3. Prioritize skills mentioned frequently in transition stories
      4. Include both technical and soft skills relevant to the transition

      For each skill gap, identify:
      1. Skill name (be specific and actionable)
      2. Gap level (Low, Medium, High)
      3. Confidence score (0-100)
      4. Number of mentions in stories
      5. Context summary explaining importance and how it relates to the transition

      Return JSON array with these fields.
      `;

      const response = await modelWithTools.invoke([
        new SystemMessage(
          "You are a career skills analyst who identifies skill gaps between roles.",
        ),
        new HumanMessage(skillGapPrompt),
      ]);

      // Process the response to extract skill gaps
      let skillGaps: SkillGapAnalysis[] = [];

      try {
        // Use our enhanced JSON parser with robust error handling
        const rawSkillGaps = safeParseJSON(response.content.toString(), "skillGaps");
        
        // Additional normalization for field names
        const normalizedSkillGaps = rawSkillGaps.map((gap: any) => {
          // Check for snake_case fields and convert them
          const skillName = gap.skillName || gap.skill_name;
          const gapLevel = gap.gapLevel || gap.gap_level;
          const confidenceScore = gap.confidenceScore || gap.confidence_score;
          const mentionCount = gap.mentionCount || gap.number_of_mentions || gap.mentions || 1;
          
          return {
            skillName,
            gapLevel,
            confidenceScore,
            mentionCount,
            contextSummary: gap.contextSummary || gap.context_summary
          };
        }).filter((gap: any) => gap.skillName); // Filter out invalid gaps
        
        skillGaps = normalizedSkillGaps;
      } catch (parseError) {
        console.error("Error parsing skill gaps:", parseError);
      }

      // Save skill gaps to database with validation
      for (const gap of skillGaps) {
        if (gap && gap.skillName) {
          await storage.createSkillGap({
            transitionId,
            skillName: gap.skillName,
            gapLevel: gap.gapLevel as "Low" | "Medium" | "High" || "Medium",
            confidenceScore: gap.confidenceScore || 70,
            mentionCount: gap.mentionCount || 1,
          });
        } else {
          console.warn("Skipping invalid skill gap with missing skillName:", gap);
        }
      }

      return skillGaps.length > 0
        ? skillGaps
        : this.getFallbackSkillGaps(currentRole, targetRole);
    } catch (error) {
      console.error("Error analyzing skill gaps:", error);
      return this.getFallbackSkillGaps(currentRole, targetRole);
    }
  }

  /**
   * Generate insights about the transition
   */
  private async generateInsights(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
    stories: any[],
    skillGaps: SkillGapAnalysis[],
  ): Promise<any> {
    try {
      console.log(`Generating insights for ${currentRole} → ${targetRole}`);

      const storiesText = stories.map((story) => story.content).join("\n\n");
      const skillGapsText = skillGaps
        .map(
          (gap) =>
            `${gap.skillName} (${gap.gapLevel} gap): ${gap.contextSummary || ""}`,
        )
        .join("\n");

      const insightsPrompt = `
      Generate career transition insights from ${currentRole} to ${targetRole}.

      Stories:
      ${storiesText}

      Skill Gaps:
      ${skillGapsText}

      Provide:
      1. Key observations (3-5 bullet points)
      2. Common challenges (3-5 bullet points)
      3. Estimated success rate (percentage)
      4. Typical timeframe for transition (months)
      5. Success factors (3-5 bullet points)

      Return as JSON with these fields.
      `;

      const response = await modelWithTools.invoke([
        new SystemMessage(
          "You are a career insights specialist who extracts patterns and observations from transition data.",
        ),
        new HumanMessage(insightsPrompt),
      ]);

      // Process the response to extract insights
      let insights: any = {};

      try {
        // Use our enhanced JSON parser with robust error handling
        insights = safeParseJSON(response.content.toString(), "insights");
      } catch (parseError) {
        console.error("Error parsing insights:", parseError);
      }

      // Save insights to database
      if (insights.keyObservations) {
        for (const observation of insights.keyObservations) {
          await storage.createInsight({
            transitionId,
            type: "observation",
            content: observation,
            source: null,
            date: null,
            experienceYears: null,
          });
        }
      }

      if (insights.commonChallenges) {
        for (const challenge of insights.commonChallenges) {
          await storage.createInsight({
            transitionId,
            type: "challenge",
            content: challenge,
            source: null,
            date: null,
            experienceYears: null,
          });
        }
      }

      return Object.keys(insights).length > 0
        ? insights
        : this.getFallbackInsights(currentRole, targetRole);
    } catch (error) {
      console.error("Error generating insights:", error);
      return this.getFallbackInsights(currentRole, targetRole);
    }
  }

  /**
   * Create a development plan
   */
  private async createDevelopmentPlan(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
    skillGaps: SkillGapAnalysis[],
    insights: any,
  ): Promise<any> {
    try {
      console.log(
        `Creating development plan for ${currentRole} → ${targetRole}`,
      );

      // Format skill gaps
      const skillGapsText = skillGaps
        .map(
          (gap) =>
            `${gap.skillName} (${gap.gapLevel} gap): ${gap.contextSummary || ""}`,
        )
        .join("\n");
        
      // Get transition stories from the memory to inform the plan
      let transitionStories = "";
      try {
        // Only attempt to retrieve memories if memoryStore is initialized
        if (this.memoryStore) {
          // Try to retrieve relevant stories from memory
          const memories = await this.memoryStore.similaritySearch(
            `career transition from ${currentRole} to ${targetRole} stories and advice`,
            3,
            (doc) => doc.metadata.userId === this.userId && doc.metadata.type === "story"
          );
          
          if (memories && memories.length > 0) {
            transitionStories = "Relevant transition stories:\n" + 
              memories.map(doc => doc.pageContent).join("\n\n");
          }
        }
      } catch (error) {
        console.error("Error retrieving transition stories from memory:", error);
      }
      
      // Get the user's existing skills
      let userSkills: any[] = [];
      try {
        // Get user ID
        const userId = this.userId;
        
        // Get skills from storage
        const skills = await storage.getUserSkills(userId);
        userSkills = skills.map(s => `${s.skillName} (${s.proficiencyLevel || 'Intermediate'})`);
      } catch (error) {
        console.error("Error getting user skills:", error);
      }
      
      const userSkillsText = userSkills.length > 0 
        ? `\nUser's Existing Skills:\n${userSkills.join("\n")}`
        : "\nUser Skills: Not specified";

      // Add a search tool to find related articles
      const careerResourceSearch = new LearningResourceSearch();
      
      // First, search for relevant career articles to ground recommendations
      console.log(`Searching for career resources for ${currentRole} to ${targetRole} transition`);
      let relatedArticles = [];
      try {
        // Extract the key parts of the roles for better search
        const currentParts = currentRole.split(' ');
        const currentCompany = currentParts[0] || "";
        const currentRoleTitle = currentParts.slice(1, -1).join(' ') || "Software Engineer";
        
        const targetParts = targetRole.split(' ');
        const targetCompany = targetParts[0] || "";
        const targetRoleTitle = targetParts.slice(1, -1).join(' ') || "Software Engineer";
        
        // Perform searches for relevant articles
        const searchResponses = await Promise.allSettled([
          careerResourceSearch.invoke(`Best learning resources for ${targetRoleTitle} skills`),
          careerResourceSearch.invoke(`${currentCompany} to ${targetCompany} career transition guide`),
          careerResourceSearch.invoke(`Career progression to ${targetRoleTitle} learning path`),
          careerResourceSearch.invoke(`Required skills for ${targetRoleTitle} at ${targetCompany}`)
        ]);
        
        // Process successful responses
        searchResponses.forEach(result => {
          if (result.status === "fulfilled") {
            try {
              const response = JSON.parse(result.value);
              if (response && response.results) {
                relatedArticles = [...relatedArticles, ...response.results];
              }
            } catch (error) {
              console.error("Error parsing search response:", error);
            }
          }
        });
        
        // Keep only unique articles by URL
        const uniqueUrls = new Set();
        relatedArticles = relatedArticles.filter(article => {
          if (!article.url || uniqueUrls.has(article.url)) return false;
          uniqueUrls.add(article.url);
          return true;
        });
        
        console.log(`Found ${relatedArticles.length} related articles/resources`);
      } catch (searchError) {
        console.error("Error searching for career resources:", searchError);
      }
      
      // Format articles for inclusion in the prompt
      const articlesText = relatedArticles.length > 0 
        ? `\nRelevant Articles and Resources:\n${relatedArticles.map(a => 
          `- ${a.title || 'Article'}: ${a.url} (${a.description ? a.description.substring(0, 100) + '...' : 'Career resource'})`
        ).join('\n')}`
        : "";
      
      // Create a more personalized plan using all available information
      const planPrompt = `
      Create a personalized development plan for transition from ${currentRole} to ${targetRole}.
      
      ${userSkillsText}

      Skill Gaps to Address:
      ${skillGapsText}
      
      ${transitionStories}
      
      ${articlesText}

      Based on the user's existing skills and the identified skill gaps, create a detailed plan with:
      1. 4-6 milestone phases organized by priority
      2. For each milestone:
         - Clear title that relates to the skills being developed
         - Detailed description that references the user's existing skills where relevant
         - Priority (High, Medium, Low)
         - Duration in weeks (be realistic about learning timelines)
         - Order (sequence number)
         - 3-4 specific learning resources for each milestone including:
           * At least one specific YouTube video or channel (provide exact video title and URL)
           * A specific blog post, tutorial or technical documentation (with exact URL)
           * A recommended book or online course (with title and where to find it)
           * Any other relevant resources like GitHub repositories, community forums, etc.
      
      Make the plan hyper-personalized with very specific resources that address the exact skill gaps.
      Each resource should have a detailed explanation of why it's relevant to this specific transition.
      Ensure each resource includes its type (video, article, course, book, etc.) and a direct URL when applicable.
      
      The plan should be tailored to leverage the user's existing skills and address the critical skill gaps.
      Return as JSON with milestones array.
      `;

      const response = await modelWithTools.invoke([
        new SystemMessage(
          "You are a career development planner who creates personalized transition plans.",
        ),
        new HumanMessage(planPrompt),
      ]);

      // Process the response to extract the plan
      let plan: any = { milestones: [] };

      try {
        // Use our enhanced JSON parser with robust error handling
        const parsed = safeParseJSON(response.content.toString(), "plan");
        
        // Check if we got a valid plan with milestones
        if (parsed && parsed.milestones && Array.isArray(parsed.milestones)) {
          plan = parsed;
        } 
        // If we got an array directly, assume it's the milestones array
        else if (Array.isArray(parsed)) {
          plan = { milestones: parsed };
        }
        
        // If no milestones were generated, create default ones based on skill gaps
        if (!plan.milestones || plan.milestones.length === 0) {
          console.log("No milestones generated, creating defaults based on skill gaps");
          
          plan.milestones = skillGaps
            .slice(0, 5)
            .map((gap, index) => ({
              title: `Develop ${gap.skillName}`,
              description: gap.contextSummary || `Improve skills in ${gap.skillName} needed for the transition`,
              priority: gap.gapLevel || "Medium",
              durationWeeks: 4,
              order: index + 1,
              resources: [
                {
                  title: `Learn ${gap.skillName}`,
                  url: "https://www.coursera.org/",
                  type: "course"
                }
              ]
            }));
        }
      } catch (parseError) {
        console.error("Error parsing plan:", parseError);
      }

      return plan;
    } catch (error) {
      console.error("Error creating development plan:", error);
      return { milestones: [] };
    }
  }

  /**
   * Get fallback skill gaps when analysis fails
   */
  private getFallbackSkillGaps(
    currentRole: string,
    targetRole: string,
  ): SkillGapAnalysis[] {
    return [
      {
        skillName: "Technical Skills",
        gapLevel: "Medium",
        confidenceScore: 70,
        mentionCount: 1,
        contextSummary: `Core technical skills needed for the ${targetRole} role`,
      },
      {
        skillName: "Domain Knowledge",
        gapLevel: "High",
        confidenceScore: 80,
        mentionCount: 2,
        contextSummary: "Specific knowledge required for the industry",
      },
      {
        skillName: "Leadership Experience",
        gapLevel: "Medium",
        confidenceScore: 75,
        mentionCount: 3,
        contextSummary: `Leadership expectations for ${targetRole}`,
      },
    ];
  }

  /**
   * Get fallback insights when analysis fails
   */
  private getFallbackInsights(currentRole: string, targetRole: string): any {
    return {
      keyObservations: [
        `Most successful transitions from ${currentRole} to ${targetRole} take 6-12 months`,
        "Building a portfolio of relevant projects is critical",
        "Networking with professionals already in the target role increases success rate",
      ],
      commonChallenges: [
        "Adapting to new technical requirements",
        "Building required domain knowledge",
        "Demonstrating leadership capabilities",
      ],
      successRate: 65,
      timeframe: "6-12 months",
      successFactors: [
        "Continuously expanding technical skills",
        "Building a professional network",
        "Creating a portfolio of relevant projects",
        "Understanding company-specific culture and processes",
      ],
    };
  }
}