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
    
    try {
      // Initialize the model with OpenAI GPT-4o-mini-realtime-preview (primary choice)
      if (process.env.OPENAI_API_KEY) {
        const { ChatOpenAI } = require("@langchain/openai");
        this.model = new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          modelName: "gpt-4o-mini-realtime-preview", // Fastest GPT-4 variant
          temperature: 0.3,
          maxTokens: 2048,
        });
        console.log("Using OpenAI gpt-4o-mini-realtime-preview as primary model");
      } else {
        // Fallback to Gemini if no OpenAI key
        this.model = new ChatGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_API_KEY || "",
          modelName: "gemini-2.0-flash-lite", // Use Gemini as fallback
          temperature: 0.3,
          maxOutputTokens: 2048,
        });
        console.log("Fallback to Gemini 2.0 Flash Lite (no OpenAI API key found)");
      }
    } catch (error) {
      console.error("Failed to initialize primary LLM, using Gemini as fallback:", error);
      // If OpenAI fails for any reason, use Gemini as fallback
      this.model = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || "",
        modelName: "gemini-2.0-flash-lite",
        temperature: 0.3,
        maxOutputTokens: 2048,
      });
      console.log("Using Gemini 2.0 Flash Lite as fallback");
    }
    
    // Initialize memory store with OpenAI embeddings when available
    try {
      if (process.env.OPENAI_API_KEY) {
        // Use proper OpenAI embeddings when available
        const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
        const embeddings = new OpenAIEmbeddings({
          apiKey: process.env.OPENAI_API_KEY,
          modelName: "text-embedding-3-small", // Fast and cost-effective embedding model
          dimensions: 1536, // Standard embedding size
        });
        
        this.memoryStore = new MemoryVectorStore(embeddings);
        console.log("Initialized memory store with OpenAI embeddings");
      } else {
        // Use a simple cosine similarity function for embeddings as fallback
        const embeddings = {
          embedDocuments: async (texts: string[]) => {
            // Create simple word-based embeddings
            return texts.map(text => {
              // Split text into words, normalize, and count word frequencies
              const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 0);
              const vector = Array(512).fill(0); // Smaller vector size
              
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
        console.log("Initialized memory store with fallback simple embeddings (no OpenAI)");
      }
    } catch (error) {
      console.warn("Failed to initialize memory store with OpenAI embeddings:", error);
      // Use a simple fallback if OpenAI embeddings fail
      const fallbackEmbeddings = {
        embedDocuments: async (texts: string[]) => texts.map(() => Array(512).fill(0)),
        embedQuery: async (text: string) => Array(512).fill(0),
      };
      this.memoryStore = new MemoryVectorStore(fallbackEmbeddings);
      console.log("Using most basic fallback embeddings");
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
   * Create a hyper-personalized development plan for the transition
   * Uses OpenAI (or Gemini as fallback) with enhanced learning resource search
   * to create detailed, actionable plans with specific resources
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
        `Creating hyper-personalized development plan for ${currentRole} → ${targetRole} with specific resources`,
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

      // Initialize enhanced learning resource search tool
      const learningResourceSearch = new LearningResourceSearch();
      
      // First, search for hyper-specific learning resources for each skill gap
      console.log(`Searching for hyper-personalized learning resources for ${currentRole} to ${targetRole} transition`);
      let skillSpecificResources: Record<string, string> = {};
      
      // Extract role components for better searches
      const currentParts = currentRole.split(' ');
      const currentCompany = currentParts[0] || "";
      let currentRoleTitle = "";
      if (currentParts.length > 2) {
        currentRoleTitle = currentParts.slice(1, -1).join(' ');
      } else {
        currentRoleTitle = currentParts.join(' ');
      }
      
      const targetParts = targetRole.split(' ');
      const targetCompany = targetParts[0] || "";
      let targetRoleTitle = "";
      if (targetParts.length > 2) {
        targetRoleTitle = targetParts.slice(1, -1).join(' ');
      } else {
        targetRoleTitle = targetParts.join(' ');
      }
      
      // Get specific resources for each skill gap
      try {
        console.log("Fetching hyper-personalized resources for each skill gap");
        
        // For each high and medium priority skill gap, find specific resources
        for (const gap of skillGaps.filter(g => g.gapLevel !== "Low").slice(0, 5)) { // Limit to top 5 most important gaps
          const skillName = gap.skillName;
          console.log(`Finding specific resources for skill: ${skillName}`);
          
          try {
            // Use advanced search to find resources with different difficulty levels
            const resourceResults = await learningResourceSearch.invoke({
              skillName: skillName,
              resourceType: "course tutorial video guide book project",
              difficulty: gap.gapLevel === "High" ? "comprehensive" : "intermediate" 
            });
            
            if (resourceResults) {
              // Store the resources for this skill
              skillSpecificResources[skillName] = resourceResults;
            }
          } catch (resourceError) {
            console.error(`Error finding resources for ${skillName}:`, resourceError);
          }
        }
        
        // Also get general career transition resources
        const careerTransitionResources = await learningResourceSearch.invoke({
          skillName: `${currentRoleTitle} to ${targetRoleTitle} career transition`,
          resourceType: "guide roadmap testimonial case study"
        });
        
        if (careerTransitionResources) {
          skillSpecificResources["career_transition"] = careerTransitionResources;
        }
        
        // Get company-specific transition resources
        if (currentCompany !== targetCompany) {
          const companyTransitionResources = await learningResourceSearch.invoke({
            skillName: `${currentCompany} to ${targetCompany} company culture transition`,
            resourceType: "guide article blog testimonial"
          });
          
          if (companyTransitionResources) {
            skillSpecificResources["company_transition"] = companyTransitionResources;
          }
        }
        
        // Get interview preparation resources
        const interviewResources = await learningResourceSearch.invoke({
          skillName: `${targetRole} interview preparation`,
          resourceType: "guide practice questions tips"
        });
        
        if (interviewResources) {
          skillSpecificResources["interview_prep"] = interviewResources;
        }
      } catch (error) {
        console.error("Error searching for specific learning resources:", error);
      }
      
      // Format hyper-specific resources into structured text
      let resourcesText = "### Specific Learning Resources:\n\n";
      
      for (const [skill, resources] of Object.entries(skillSpecificResources)) {
        // Add a section for this skill
        resourcesText += `## Resources for ${skill === "career_transition" ? "Career Transition" : 
                          skill === "company_transition" ? `${currentCompany} to ${targetCompany} Transition` :
                          skill === "interview_prep" ? "Interview Preparation" : skill}:\n\n`;
                          
        // Try to extract and format the resources
        try {
          // See if it's already formatted with sections like Courses, Videos, etc.
          if (resources.includes("## Courses:") || 
              resources.includes("## Videos:") || 
              resources.includes("## Tutorials:")) {
            // Already formatted, just add it
            resourcesText += resources + "\n\n";
          } else {
            // Try to parse any URL patterns to identify resources
            const urlPattern = /(https?:\/\/[^\s]+)/g;
            const urls = resources.match(urlPattern) || [];
            
            if (urls.length > 0) {
              urls.forEach((url, i) => {
                // Find context for this URL (try to extract title)
                const urlContext = resources.substring(
                  Math.max(0, resources.indexOf(url) - 100),
                  Math.min(resources.length, resources.indexOf(url) + 100)
                );
                
                // Try to extract a title, or use a generic one
                let title = "Resource " + (i + 1);
                const titleMatch = urlContext.match(/Title: ([^\n]+)/);
                if (titleMatch) {
                  title = titleMatch[1];
                }
                
                resourcesText += `- ${title}: ${url}\n`;
              });
            } else {
              // Just add the raw resources
              resourcesText += resources + "\n\n";
            }
          }
        } catch (formatError) {
          console.error(`Error formatting resources for ${skill}:`, formatError);
          // Just add the raw resources
          resourcesText += resources + "\n\n";
        }
      }

      console.log(`Found hyper-specific resources for ${Object.keys(skillSpecificResources).length} skills`);

      // Create the development plan prompt with a structured format and hyper-specific resources
      const planPrompt = `
      Create a hyper-personalized, practical career transition plan from ${currentRole} to ${targetRole} with specific, actionable recommendations.

      ### User Information:
      ${userSkillsText}

      ### Skill Gaps to Address:
      ${skillGapsText}
      
      ### Learning Resources Available:
      ${resourcesText}
      
      ${transitionStories || ""}

      ### Requirements:
      - Create a 3-6 month structured plan with SPECIFIC actionable steps
      - For EACH milestone and task, include AT LEAST TWO specific YouTube videos, online courses, or tutorials
      - Always include the EXACT title and complete URL for each resource
      - Focus on both technical skills and soft skills needed for this transition
      - Include detailed networking strategies with specific platforms and groups to join
      - Provide precise interview preparation tactics for ${targetRole} roles
      - Structure the plan with 4-5 clear milestones and specific week-by-week timelines
      - Consider the culture differences between ${currentCompany} and ${targetCompany}
      - All recommended resources MUST have ACTUAL URLs from the resources provided above
      
      ### Response Format:
      Return ONLY a JSON object with this structure:
      {
        "overview": "Brief overview of the transition strategy",
        "estimatedTimeframe": "X-Y months",
        "milestones": [
          {
            "title": "Milestone title",
            "description": "Description of this milestone",
            "timeframe": "X weeks",
            "tasks": [
              {
                "task": "Specific action item",
                "resources": [
                  {"title": "EXACT Resource name", "url": "EXACT resource URL", "type": "course/video/book/etc"}
                ]
              }
            ]
          }
        ],
        "successMetrics": ["Metric 1", "Metric 2"],
        "potentialChallenges": ["Challenge 1", "Challenge 2"]
      }
      
      Ensure each milestone has 3-5 specific tasks with at least two real learning resources with actual URLs.
      `;

      // Generate the development plan using the configured model
      console.log(`Generating plan using ${modelWithTools.modelName || "configured LLM"}`);
      const response = await modelWithTools.invoke([
        new SystemMessage(
          "You are a career development expert who creates hyper-specific transition plans with actual resources.",
        ),
        new HumanMessage(planPrompt),
      ]);

      // Process the response to extract the plan
      let plan: any = { milestones: [] };

      try {
        // Try to parse as JSON with robust error handling
        const content = response.content.toString();
        
        // First try to extract a JSON object using regex
        const jsonRegex = /{[\s\S]*}/;
        const jsonMatch = content.match(jsonRegex);
        
        if (jsonMatch) {
          const possibleJson = jsonMatch[0];
          plan = safeParseJSON(possibleJson, "plan");
        } else {
          // If no JSON object found, try parsing the entire content
          plan = safeParseJSON(content, "plan");
        }
        
        // If parsing fails or plan is invalid, create a fallback
        if (!plan || !plan.milestones || !Array.isArray(plan.milestones) || plan.milestones.length === 0) {
          console.log("Creating fallback plan from resources found");
          plan = this.createFallbackPlan(currentRole, targetRole, skillGaps, skillSpecificResources);
        }
        
        // Store the development plan in the database
        await this.storeDevelopmentPlan(transitionId, plan);
        
        return plan;
      } catch (error) {
        console.error("Error parsing development plan:", error);
        
        // Create a fallback plan using the resources we found
        const fallbackPlan = this.createFallbackPlan(currentRole, targetRole, skillGaps, skillSpecificResources);
        
        // Store the fallback plan
        await this.storeDevelopmentPlan(transitionId, fallbackPlan);
        
        return fallbackPlan;
      }
    } catch (error) {
      console.error("Error creating development plan:", error);
      return { milestones: [] };
    }
  }
  
  /**
   * Create a fallback plan when the primary plan generation fails
   * Uses the resources we've already gathered
   */
  private createFallbackPlan(
    currentRole: string, 
    targetRole: string, 
    skillGaps: SkillGapAnalysis[],
    skillSpecificResources: Record<string, string>
  ): any {
    console.log("Creating fallback plan with gathered resources");
    
    // Extract basic components
    const currentParts = currentRole.split(' ');
    const currentCompany = currentParts[0] || "";
    const targetParts = targetRole.split(' ');
    const targetCompany = targetParts[0] || "";
    
    // Create milestones
    const milestones = [];
    
    // Milestone 1: High priority skill gaps
    const highPriorityGaps = skillGaps.filter(gap => gap.gapLevel === "High");
    if (highPriorityGaps.length > 0) {
      const highPriorityTasks = [];
      
      for (const gap of highPriorityGaps) {
        const skillName = gap.skillName;
        const resources = [];
        
        // Try to find resources for this skill
        if (skillSpecificResources[skillName]) {
          // Extract URLs from the resources
          const urlPattern = /(https?:\/\/[^\s]+)/g;
          const resourceText = skillSpecificResources[skillName];
          const urls = resourceText.match(urlPattern) || [];
          
          urls.slice(0, 2).forEach((url, i) => {
            resources.push({
              title: `${skillName} Resource ${i+1}`,
              url: url,
              type: "course"
            });
          });
        }
        
        // If no resources found, add a placeholder
        if (resources.length === 0) {
          resources.push({
            title: `Learn ${skillName}`,
            url: "https://www.coursera.org/",
            type: "course"
          });
        }
        
        highPriorityTasks.push({
          task: `Develop ${skillName} skills`,
          resources: resources
        });
      }
      
      milestones.push({
        title: "Address Critical Skill Gaps",
        description: "Focus on the highest priority skills needed for the transition",
        timeframe: "4-6 weeks",
        tasks: highPriorityTasks
      });
    }
    
    // Milestone 2: Medium priority skill gaps
    const mediumPriorityGaps = skillGaps.filter(gap => gap.gapLevel === "Medium");
    if (mediumPriorityGaps.length > 0) {
      const mediumPriorityTasks = [];
      
      for (const gap of mediumPriorityGaps.slice(0, 3)) {
        const skillName = gap.skillName;
        const resources = [];
        
        // Try to find resources for this skill
        if (skillSpecificResources[skillName]) {
          // Extract URLs from the resources
          const urlPattern = /(https?:\/\/[^\s]+)/g;
          const resourceText = skillSpecificResources[skillName];
          const urls = resourceText.match(urlPattern) || [];
          
          urls.slice(0, 2).forEach((url, i) => {
            resources.push({
              title: `${skillName} Resource ${i+1}`,
              url: url,
              type: "course"
            });
          });
        }
        
        // If no resources found, add a placeholder
        if (resources.length === 0) {
          resources.push({
            title: `Learn ${skillName}`,
            url: "https://www.coursera.org/",
            type: "course"
          });
        }
        
        mediumPriorityTasks.push({
          task: `Develop ${skillName} skills`,
          resources: resources
        });
      }
      
      milestones.push({
        title: "Build Secondary Skills",
        description: "Develop supporting skills needed for the role",
        timeframe: "3-4 weeks",
        tasks: mediumPriorityTasks
      });
    }
    
    // Milestone 3: Interview preparation
    const interviewTasks = [];
    
    // Add interview prep resources if available
    if (skillSpecificResources["interview_prep"]) {
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const resourceText = skillSpecificResources["interview_prep"];
      const urls = resourceText.match(urlPattern) || [];
      
      if (urls.length > 0) {
        interviewTasks.push({
          task: "Prepare for technical interviews",
          resources: urls.slice(0, 2).map((url, i) => ({
            title: `Interview Preparation Resource ${i+1}`,
            url: url,
            type: "guide"
          }))
        });
      }
    }
    
    // Add networking task
    interviewTasks.push({
      task: "Network with professionals in target role",
      resources: [
        {
          title: "LinkedIn Networking Strategy",
          url: "https://www.linkedin.com",
          type: "networking"
        }
      ]
    });
    
    // Add company research task
    if (currentCompany !== targetCompany) {
      interviewTasks.push({
        task: `Research ${targetCompany} culture and values`,
        resources: [
          {
            title: `${targetCompany} Company Research`,
            url: `https://www.glassdoor.com/Overview/Working-at-${targetCompany}`,
            type: "research"
          }
        ]
      });
    }
    
    milestones.push({
      title: "Interview Preparation & Networking",
      description: "Prepare for interviews and build professional network",
      timeframe: "2-3 weeks",
      tasks: interviewTasks
    });
    
    // Create the complete plan
    return {
      overview: `Personalized transition plan from ${currentRole} to ${targetRole} focusing on skill development, networking, and interview preparation.`,
      estimatedTimeframe: "3-6 months",
      milestones: milestones,
      successMetrics: [
        `Successfully interview for ${targetRole}`,
        "Demonstrate mastery of required technical skills",
        "Build a professional network in the target role",
        "Complete at least one portfolio project demonstrating key skills"
      ],
      potentialChallenges: [
        "Time management while working full-time",
        "Competitive job market for this role",
        "Rapidly evolving skill requirements",
        `Adjusting to ${targetCompany} culture from ${currentCompany} background`
      ]
    };
  }
  
  /**
   * Store the development plan in the database
   */
  private async storeDevelopmentPlan(transitionId: number, plan: any): Promise<void> {
    try {
      await storage.storeDevelopmentPlan(transitionId, plan);
    } catch (error) {
      console.error("Error storing development plan:", error);
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