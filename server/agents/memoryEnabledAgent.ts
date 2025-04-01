// server/agents/memoryEnabledAgent.ts

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { StructuredTool } from "@langchain/core/tools";
import { storage } from "../storage";
import { z } from "zod";
import { SkillGapAnalysis } from "../types/skillGapTypes";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MCPHandler } from "../helpers/mcpHandler";
import { careerTransitionMemory } from "./memoryStore";
import { safeJsonParse } from "../helpers/jsonParserHelper";
import {
  improvedTavilySearch,
  fallbackSearch,
} from "../tools/improvedTavilySearch";

// Resolve dynamic import issues for OpenAI components
let OpenAIEmbeddings: any = null;
let ChatOpenAI: any = null;

// Try to dynamically import OpenAI components
const importOpenAI = async () => {
  try {
    const openaiModule = await import("@langchain/openai");
    ChatOpenAI = openaiModule.ChatOpenAI;
    OpenAIEmbeddings = openaiModule.OpenAIEmbeddings;
    console.log("Loaded OpenAI components successfully");
  } catch (err: any) {
    console.warn("OpenAI components not available:", err.message);
  }
};

// Execute import but don't wait for it
importOpenAI().catch(error => {
  console.warn("Error initializing OpenAI imports:", error);
});

/**
 * A single agent with long-term memory for career transition analysis
 * This replaces the multi-agent system with a simpler, more robust approach
 */
export class MemoryEnabledAgent {
  transitionId: number;
  userId: number;
  model: any;
  tools: StructuredTool[] = [];
  memoryStore: MemoryVectorStore | null = null;
  mcpHandler: any;

  // Simple string hashing function for embedding generation
  simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  constructor(userId: number, transitionId: number) {
    this.transitionId = transitionId;
    this.userId = userId;

    try {
      // Initialize the model with OpenAI GPT-4o-mini if available
      if (process.env.OPENAI_API_KEY && ChatOpenAI) {
        try {
          this.model = new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-4o-mini",
            temperature: 0.3,
            maxTokens: 2048,
          });
          console.log("Using OpenAI gpt-4o-mini as primary model");
        } catch (openaiError) {
          console.error("Failed to initialize OpenAI model:", openaiError);
          throw openaiError; // Propagate to the fallback
        }
      } else {
        // Fallback to Gemini if no OpenAI key or imports
        throw new Error("OpenAI not available, using fallback");
      }
    } catch (error) {
      console.error(
        "Failed to initialize primary LLM, using Gemini as fallback:",
        error,
      );
      // If OpenAI fails for any reason, use Gemini as fallback
      this.model = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || "",
        modelName: "gemini-2.0-flash-lite",
        temperature: 0.3,
        maxOutputTokens: 2048,
      });
      console.log("Using Gemini 2.0 Flash Lite as fallback");
    }

    // Initialize memory store with fallback options
    this.initializeMemoryStore();

    // Initialize MCP handler
    try {
      this.mcpHandler = new MCPHandler(userId, transitionId);

      // Initialize MCP handler in the background
      this.initializeMCP().catch((error) => {
        console.error("Error initializing MCP:", error);
      });
    } catch (error) {
      console.error("Failed to initialize MCP handler:", error);
    }

    // Initialize tools with improved search capabilities
    this.initializeTools();

    // Initialize agent state in memory store
    careerTransitionMemory.updateMemory(transitionId, userId, {
      state: "in_progress",
      data: {},
    });
  }

  /**
   * Initialize memory store with proper fallbacks
   */
  async initializeMemoryStore(): Promise<void> {
    try {
      // Try to use OpenAI embeddings if available
      if (process.env.OPENAI_API_KEY && OpenAIEmbeddings) {
        try {
          const embeddings = new OpenAIEmbeddings({
            apiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-3-small",
            dimensions: 1536,
          });

          this.memoryStore = new MemoryVectorStore(embeddings);
          console.log("Initialized memory store with OpenAI embeddings");
          return;
        } catch (embeddingError) {
          console.error(
            "Failed to initialize OpenAI embeddings:",
            embeddingError,
          );
          // Continue to fallback
        }
      }

      // Use a simple fallback embedding system
      this.useBasicEmbeddings();
    } catch (error) {
      console.warn(
        "Failed to initialize memory store with OpenAI embeddings:",
        error,
      );
      // Use a simple fallback if OpenAI embeddings fail
      this.useBasicEmbeddings();
    }
  }

  /**
   * Initialize tools with improved search capabilities
   */
  initializeTools(): void {
    try {
      // Initialize with direct search functions instead of tool classes
      this.tools = [
        // Custom structured tool for career transition search
        {
          name: "career_transition_search",
          description:
            "Search for real-world information about career transitions and skills",
          func: async ({
            query,
            currentRole,
            targetRole,
          }: {
            query: string;
            currentRole: string;
            targetRole: string;
          }) => {
            const results = await improvedTavilySearch(
              `{query} {currentRole} to {targetRole} career transition experiences challenges success stories`,
              7, // Max results
              "deep", // Deep search
            );
            return JSON.stringify(results);
          },
          schema: z.object({
            query: z.string().describe("Search query"),
            currentRole: z.string().describe("Current role"),
            targetRole: z.string().describe("Target role"),
          }),
        } as any,

        // Custom structured tool for skill gap search
        {
          name: "skill_gap_search",
          description:
            "Search for information about specific skills and their relevance to roles",
          func: async ({
            skillName,
            targetRole,
          }: {
            skillName: string;
            targetRole: string;
          }) => {
            const results = await improvedTavilySearch(
              `{skillName} skill requirements importance for {targetRole} position job descriptions expectations`,
              5,
              "deep",
            );
            return JSON.stringify(results);
          },
          schema: z.object({
            skillName: z.string().describe("Skill name"),
            targetRole: z.string().describe("Target role"),
          }),
        } as any,

        // Custom structured tool for learning resources
        {
          name: "learning_resource_search",
          description: "Search for learning resources for skills development",
          func: async ({
            skillName,
            resourceType = "course tutorial video guide",
            difficulty = "comprehensive",
          }: {
            skillName: string;
            resourceType?: string;
            difficulty?: string;
          }) => {
            const searchQueries = [
              `best {resourceType} to learn {skillName} {difficulty} skill professional development`,
              `{skillName} {resourceType} {difficulty} level tutorial guide`,
              `learn {skillName} {resourceType} {difficulty}`,
            ];

            // Try each query until we get results
            let results: any = null;
            for (const query of searchQueries) {
              results = await improvedTavilySearch(query, 5, "basic");
              if (results.results.length > 0) break;
            }

            if (!results || results.results.length === 0) {
              // Use fallback search if all queries fail
              results = await fallbackSearch(
                `{skillName} {resourceType} {difficulty}`,
              );
            }

            // Format the results
            return this.formatResourceResults(results, skillName, resourceType);
          },
          schema: z.object({
            skillName: z.string().describe("Skill name"),
            resourceType: z.string().optional().describe("Resource type"),
            difficulty: z.string().optional().describe("Difficulty level"),
          }),
        } as any,
      ];

      console.log("Initialized tools with improved search capabilities");
    } catch (error) {
      console.error("Failed to initialize tools:", error);
      this.tools = [];
    }
  }

  /**
   * Format resource search results
   */
  formatResourceResults(
    results: any,
    skillName: string,
    resourceType: string,
  ): string {
    try {
      let output = `## Learning Resources for {skillName}:\n\n`;

      // Categorize resources
      const categories: Record<string, any[]> = {
        Courses: [],
        Videos: [],
        Tutorials: [],
        Projects: [],
        Other: [],
      };

      // Process results
      if (results && results.results && Array.isArray(results.results)) {
        results.results.forEach((result: any) => {
          const url = result.url || "";
          const title = result.title || `Resource for {skillName}`;
          const content = result.content || "";

          // Determine category
          let category = "Other";
          if (
            url.includes("youtube") ||
            url.includes("youtu.be") ||
            title.toLowerCase().includes("video")
          ) {
            category = "Videos";
          } else if (
            url.includes("course") ||
            url.includes("udemy") ||
            url.includes("coursera")
          ) {
            category = "Courses";
          } else if (url.includes("github") || url.includes("project")) {
            category = "Projects";
          } else if (
            url.includes("tutorial") ||
            url.includes("guide") ||
            url.includes("how-to")
          ) {
            category = "Tutorials";
          }

          // Add to category
          categories[category].push({
            title,
            url,
            content:
              content.substring(0, 200) + (content.length > 200 ? "..." : ""),
          });
        });
      }

      // Generate output
      for (const [category, categoryItems] of Object.entries(categories)) {
        if (categoryItems.length > 0) {
          output += `### {category}:\n\n`;
          categoryItems.forEach((item, index) => {
            output += `#### {item.title}\n`;
            output += `URL: {item.url}\n`;
            if (item.content) {
              output += `Description: {item.content}\n`;
            }
            output += "\n";
          });
        }
      }

      // Add fallback if no results
      if (Object.values(categories).flat().length === 0) {
        output += `No specific resources found for {skillName}. Try checking these general learning platforms:\n\n`;
        output += `- Coursera: https://www.coursera.org/search?query={encodeURIComponent(skillName)}\n`;
        output += `- Udemy: https://www.udemy.com/courses/search/?src=ukw&q={encodeURIComponent(skillName)}\n`;
        output += `- YouTube: https://www.youtube.com/results?search_query={encodeURIComponent(skillName + " tutorial")}\n`;
      }

      return output;
    } catch (error) {
      console.error("Error formatting resource results:", error);
      return `Error formatting resource results: {error}`;
    }
  }

  /**
   * Use basic embeddings as fallback
   */
  useBasicEmbeddings(): void {
    // Create a simple embedding function that works without external APIs
    const embeddings = {
      embedDocuments: async (texts: string[]) => {
        // Create simple word-based embeddings
        return texts.map((text) => {
          // Split text into words, normalize, and count word frequencies
          const words = text
            .toLowerCase()
            .split(/\W+/)
            .filter((w) => w.length > 0);
          const vector = Array(512).fill(0); // Smaller vector size

          // Hash words into vector positions
          for (const word of words) {
            const position = Math.abs(this.simpleHash(word) % 512);
            vector[position] += 1;
          }

          // Normalize vector
          const magnitude = Math.sqrt(
            vector.reduce((sum, val) => sum + val * val, 0),
          );
          return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
        });
      },
      embedQuery: async (text: string) => {
        // Use the same embedding logic for queries
        const words = text
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 0);
        const vector = Array(512).fill(0);

        for (const word of words) {
          const position = Math.abs(this.simpleHash(word) % 512);
          vector[position] += 1;
        }

        // Normalize vector
        const magnitude = Math.sqrt(
          vector.reduce((sum, val) => sum + val * val, 0),
        );
        return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
      },
    };

    this.memoryStore = new MemoryVectorStore(embeddings);
    console.log("Using most basic fallback embeddings");
  }

  /**
   * Initialize MCP handler by loading contexts
   */
  async initializeMCP(): Promise<void> {
    if (this.mcpHandler) {
      await this.mcpHandler.initialize();
    }
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
    if (
      careerTransitionMemory.isTransitionInProgress(transitionId, forceRefresh)
    ) {
      console.warn(
        `Career transition analysis already in progress for ID {transitionId}, skipping duplicate request`,
      );

      // Return the current state from memory, or fallbacks if nothing exists
      const memory = careerTransitionMemory.getMemory(transitionId);
      if (memory && memory.data) {
        return {
          skillGaps:
            memory.data.skillGaps ||
            this.getFallbackSkillGaps(currentRole, targetRole),
          insights:
            memory.data.insights ||
            this.getFallbackInsights(currentRole, targetRole),
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
      console.log(
        `Force refresh enabled for transition {transitionId}, clearing existing data...`,
      );
      try {
        await storage.clearTransitionData(transitionId);
        console.log(
          `Successfully cleared existing data for transition {transitionId}`,
        );
      } catch (error) {
        console.error(
          `Error clearing data for transition {transitionId}:`,
          error,
        );
      }
    }

    // Mark this transition as in-progress in the memory store
    careerTransitionMemory.markTransitionInProgress(transitionId);

    try {
      console.log(
        `Starting career transition analysis: {currentRole} → {targetRole}`,
      );

      // Store initial state
      careerTransitionMemory.updateMemory(transitionId, this.userId, {
        state: "in_progress",
        data: {},
      });

      // Clear existing data for fresh analysis
      await storage.clearTransitionData(transitionId);

      // Update memory state to in_progress
      careerTransitionMemory.updateMemory(transitionId, this.userId, {
        state: "in_progress",
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
          state: "in_progress",
          data: {
            scrapedData: stories,
          },
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
            skillGaps: skillGaps,
          },
        });
      } catch (skillGapsError) {
        console.error("Error analyzing skill gaps:", skillGapsError);
        // Fall back to generated skill gaps
        skillGaps = this.getFallbackSkillGaps(currentRole, targetRole);

        // Update memory with fallback skill gaps
        careerTransitionMemory.updateMemory(transitionId, this.userId, {
          data: {
            ...careerTransitionMemory.getMemory(transitionId)?.data,
            skillGaps: skillGaps,
          },
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
          state: "in_progress",
          data: {
            ...careerTransitionMemory.getMemory(transitionId)?.data,
            insights: insights,
          },
        });
      } catch (insightsError) {
        console.error("Error generating insights:", insightsError);
        // Fall back to generated insights
        insights = this.getFallbackInsights(currentRole, targetRole);

        // Update memory with fallback insights
        careerTransitionMemory.updateMemory(transitionId, this.userId, {
          state: "in_progress",
          data: {
            ...careerTransitionMemory.getMemory(transitionId)?.data,
            insights: insights,
          },
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
            plan: plan,
          },
        });
      } catch (planError) {
        console.error("Error creating development plan:", planError);
        // Continue without a plan
      }

      // Mark transition as complete in the memory store
      careerTransitionMemory.updateMemory(transitionId, this.userId, {
        state: "complete",
      });

      // Always mark the transition as complete in the database, regardless of partial failures
      await storage.updateTransitionStatus(transitionId, true);

      // Return the combined results
      console.log(`Analysis completed for: {currentRole} → {targetRole}`);
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
      const currentData =
        careerTransitionMemory.getMemory(transitionId)?.data || {};
      careerTransitionMemory.updateMemory(transitionId, this.userId, {
        state: "complete",
        data: {
          ...currentData,
          // Include error information without breaking the type
          skillGaps:
            currentData.skillGaps ||
            this.getFallbackSkillGaps(currentRole, targetRole),
          insights: {
            ...(currentData.insights || {}),
            errorOccurred: true,
          },
        },
      });

      // Try to mark the transition as complete even in case of error
      try {
        await storage.updateTransitionStatus(transitionId, true);
      } catch (updateError) {
        console.error(
          "Failed to update transition status after error:",
          updateError,
        );
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
   * Research transition stories using improved search
   */
  async researchTransitionStories(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
  ): Promise<any[]> {
    try {
      console.log(
        `Researching transition stories for {currentRole} → {targetRole}`,
      );

      // Extract company and role information for broader searches
      const currentParts = currentRole.split(" ");
      const currentCompany = currentParts[0] || "";
      const currentRoleTitle =
        currentParts.slice(1, -1).join(" ") || "Software Engineer";

      const targetParts = targetRole.split(" ");
      const targetCompany = targetParts[0] || "";
      const targetRoleTitle =
        targetParts.slice(1, -1).join(" ") || "Software Engineer";

      // Define a series of search queries with decreasing specificity
      const searchQueries = [
        // Exact role transition
        `career transition stories from {currentRole} to {targetRole} experiences challenges success`,

        // Company transition with role
        `{currentCompany} to {targetCompany} {currentRoleTitle} to {targetRoleTitle} transition stories experiences`,

        // Generic role transition without company
        `{currentRoleTitle} to {targetRoleTitle} career transition experiences success stories challenges`,

        // Industry transition
        `software engineer career advancement to senior staff engineer transition experiences`,

        // Similar role transition (if roles are different)
        `similar transitions to {targetRoleTitle} from other technical roles success stories`,
      ];

      // Construct the research prompt with broader search parameters
      const researchPrompt = `
      Research career transition stories that can help someone moving from {currentRole} to {targetRole}.

      Follow these steps:
      1. Use search to find relevant transition stories from credible sources
      2. Consider stories from similar roles or companies if exact matches aren't available
      3. Look at both specific ({currentCompany} to {targetCompany}) transitions and general role progressions
      4. Extract specific details about:
         - Technical skill requirements
         - Timeline and learning paths
         - Common challenges faced
         - Success strategies

      Even if you can't find exact matches, find stories of similar transitions that would be relevant.
      Focus on career blogs, tech forums, LinkedIn articles, Medium posts, and company culture insights.

      Extract at least 3-5 examples that would be helpful for this specific transition.
      `;

      // Try direct research with tool first
      try {
        if (modelWithTools) {
          // Use the model with tools if available
          const response = await modelWithTools.invoke([
            new SystemMessage(
              "You are a career researcher who finds and adapts relevant transition stories. Even if exact matches aren't available, find similar transitions that provide valuable insights.",
            ),
            new HumanMessage(researchPrompt),
          ]);

          // Extract stories from the response
          const content = response.content.toString();
          const stories = this.extractStories(content, currentRole, targetRole);

          if (stories.length > 0) {
            console.log(
              `Successfully extracted {stories.length} stories from AI response`,
            );

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
        }
      } catch (aiError) {
        console.error("Error using AI for research:", aiError);
      }

      // If AI approach fails, try direct search
      for (const query of searchQueries) {
        try {
          console.log(`Searching with query: {query}`);
          const searchResults = await improvedTavilySearch(query);

          if (searchResults.results.length > 0) {
            // Convert search results to stories
            const stories = searchResults.results.map((result, index) => ({
              id: index,
              source: new URL(result.url).hostname,
              content: result.content || result.title,
              url: result.url,
              date: new Date().toISOString().split("T")[0],
            }));

            console.log(`Found {stories.length} stories via direct search`);

            // Save the stories to the database
            for (const story of stories) {
              try {
                await storage.createScrapedData({
                  transitionId,
                  source: story.source,
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
        } catch (searchError) {
          console.error(`Error in search query "{query}":`, searchError);
        }
      }

      // If all searches fail, use simulated stories
      console.log("All story search attempts failed, using simulated stories");
      const simulatedStories = this.generateSimulatedStories(
        currentRole,
        targetRole,
      );

      // Save simulated stories to database
      for (const story of simulatedStories) {
        try {
          await storage.createScrapedData({
            transitionId,
            source: story.source,
            content: story.content,
            url: null,
            postDate: null,
            skillsExtracted: [],
          });
        } catch (dbError) {
          console.error("Error saving simulated story to database:", dbError);
        }
      }

      return simulatedStories;
    } catch (error) {
      console.error("Error researching transition stories:", error);
      return this.generateSimulatedStories(currentRole, targetRole);
    }
  }

  /**
   * Extract stories from AI model response
   */
  extractStories(
    content: string,
    currentRole: string,
    targetRole: string,
  ): any[] {
    try {
      // Try to extract structured stories from the response
      const storyPattern =
        /(?:Story|Example|Transition)\s*\d+:\s*([^]+?)(?=(?:Story|Example|Transition)\s*\d+:|)/gi;
      const storyMatches = content.match(storyPattern);

      if (storyMatches && storyMatches.length > 0) {
        return storyMatches.map((storyText, index) => {
          // Try to extract source
          const sourceMatch = storyText.match(
            /(?:Source|From|Posted on):\s*([^,\n]+)/i,
          );
          const source = sourceMatch ? sourceMatch[1].trim() : "Research";

          // Try to extract URL
          const urlMatch = storyText.match(
            /(?:URL|Link):\s*(https?:\/\/[^\s,\n]+)/i,
          );
          const url = urlMatch ? urlMatch[1].trim() : "";

          // Try to extract date
          const dateMatch = storyText.match(
            /(?:Date|Posted|Published):\s*([^\n,]+\d{4})/i,
          );
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
      const paragraphs = content.split(/\n\n+/).filter((p) => p.length > 100);
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
  generateSimulatedStories(currentRole: string, targetRole: string): any[] {
    const currentParts = currentRole.split(" ");
    const currentCompany = currentParts[0] || "Previous Company";
    const currentRoleTitle =
      currentParts.slice(1, -1).join(" ") || "Professional";

    const targetParts = targetRole.split(" ");
    const targetCompany = targetParts[0] || "New Company";
    const targetRoleTitle =
      targetParts.slice(1, -1).join(" ") || "Professional";

    return [
      {
        id: 1,
        source: "Professional Transition Blog",
        content: `After spending 5 years as a {currentRoleTitle} at {currentCompany}, I decided to transition to a {targetRoleTitle} role at {targetCompany}. The biggest challenges were learning new technical skills and adapting to a different workflow. I spent about 6 months taking online courses and working on side projects to build my portfolio. What helped most was connecting with people already in {targetRoleTitle} positions who could provide mentorship and advice.`,
        url: "",
        date: new Date().toISOString().split("T")[0],
      },
      {
        id: 2,
        source: "Career Forum",
        content: `My journey from {currentCompany} to {targetCompany} as a {currentRoleTitle} transitioning to {targetRoleTitle} took about 9 months of dedicated effort. I started by identifying the skill gaps - particularly in technical areas I hadn't been exposed to before. The interview process was challenging, but highlighting my transferable skills from my previous role really helped. My advice is to focus on building practical experience through projects rather than just theoretical learning.`,
        url: "",
        date: new Date().toISOString().split("T")[0],
      },
      {
        id: 3,
        source: "Tech Career Network",
        content: `Transitioning from {currentRole} to {targetRole} required me to develop several new skills. I found that the company cultures differed significantly - {currentCompany} was more process-oriented while {targetCompany} emphasized innovation and rapid iteration. The compensation package was better at {targetCompany}, but the work expectations were also higher. I recommend networking extensively and preparing specifically for the different interview format. It took me about 4 months to complete the transition successfully.`,
        url: "",
        date: new Date().toISOString().split("T")[0],
      },
    ];
  }

  /**
   * Analyze skill gaps between roles
   */
  async analyzeSkillGaps(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
    existingSkills: string[],
    stories: any[],
  ): Promise<SkillGapAnalysis[]> {
    try {
      console.log(`Analyzing skill gaps for {currentRole} → {targetRole}`);

      // Format stories for analysis
      const storiesText = stories.map((story) => story.content).join("\n\n");

      // Format existing skills for analysis
      const formattedExistingSkills =
        existingSkills.length > 0 ? existingSkills.join(", ") : "None provided";

      // Get target role skills from the database if available
      let targetRoleSkills: string[] = [];
      try {
        const roleSkills = await storage.getRoleSkills(targetRole);
        targetRoleSkills = roleSkills.map((skill) => skill.skillName);
      } catch (error) {
        console.error("Error retrieving target role skills:", error);
      }

      // Format target role skills for the prompt
      const targetRoleSkillsText =
        targetRoleSkills.length > 0
          ? `\nSkills typically required for {targetRole}: {targetRoleSkills.join(", ")}`
          : "";

      const skillGapPrompt = `
      Analyze skill gaps for transition from {currentRole} to {targetRole}.

      User's existing skills: {formattedExistingSkills}
      {targetRoleSkillsText}

      Transition stories:
      {storiesText}

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

      // Try using the model with tools
      try {
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
          const rawSkillGaps = safeJsonParse(
            response.content.toString(),
            "skillGaps",
          );

          // Additional normalization for field names
          const normalizedSkillGaps = rawSkillGaps
            .map((gap: any) => {
              // Check for snake_case fields and convert them
              const skillName = gap.skillName || gap.skill_name;
              const gapLevel = gap.gapLevel || gap.gap_level;
              const confidenceScore =
                gap.confidenceScore || gap.confidence_score;
              const mentionCount =
                gap.mentionCount || gap.number_of_mentions || gap.mentions || 1;

              return {
                skillName,
                gapLevel,
                confidenceScore,
                mentionCount,
                contextSummary: gap.contextSummary || gap.context_summary,
              };
            })
            .filter((gap: any) => gap.skillName); // Filter out invalid gaps

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
              gapLevel: (gap.gapLevel as "Low" | "Medium" | "High") || "Medium",
              confidenceScore: gap.confidenceScore || 70,
              mentionCount: gap.mentionCount || 1,
            });
          } else {
            console.warn(
              "Skipping invalid skill gap with missing skillName:",
              gap,
            );
          }
        }

        if (skillGaps.length > 0) {
          return skillGaps;
        }
      } catch (modelError) {
        console.error("Error analyzing skill gaps with model:", modelError);
      }

      // If the model fails, try a direct approach using existing data
      try {
        // If we have target role skills and existing skills, compare them directly
        if (targetRoleSkills.length > 0) {
          const existingSkillsSet = new Set(
            existingSkills.map((s) => s.toLowerCase()),
          );

          const directSkillGaps: SkillGapAnalysis[] = targetRoleSkills
            .filter((skill) => !existingSkillsSet.has(skill.toLowerCase()))
            .map((skill, index) => ({
              skillName: skill,
              gapLevel: index < 3 ? "High" : index < 6 ? "Medium" : "Low",
              confidenceScore: 70,
              mentionCount: 1,
              contextSummary: `Required skill for the {targetRole} position.`,
            }));

          // Save these skill gaps to the database
          for (const gap of directSkillGaps) {
            await storage.createSkillGap({
              transitionId,
              skillName: gap.skillName,
              gapLevel: gap.gapLevel as "Low" | "Medium" | "High",
              confidenceScore: gap.confidenceScore || 70,
              mentionCount: gap.mentionCount || 1,
            });
          }

          if (directSkillGaps.length > 0) {
            return directSkillGaps;
          }
        }
      } catch (directError) {
        console.error("Error in direct skill gap analysis:", directError);
      }

      // If everything fails, return fallback skill gaps
      return this.getFallbackSkillGaps(currentRole, targetRole);
    } catch (error) {
      console.error("Error analyzing skill gaps:", error);
      return this.getFallbackSkillGaps(currentRole, targetRole);
    }
  }

  /**
   * Generate insights about the transition
   */
  async generateInsights(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
    stories: any[],
    skillGaps: SkillGapAnalysis[],
  ): Promise<any> {
    try {
      console.log(`Generating insights for {currentRole} → {targetRole}`);

      const storiesText = stories.map((story) => story.content).join("\n\n");
      const skillGapsText = skillGaps
        .map(
          (gap) =>
            `{gap.skillName} ({gap.gapLevel} gap): {gap.contextSummary || ""}`,
        )
        .join("\n");

      const insightsPrompt = `
      Generate career transition insights from {currentRole} to {targetRole}.

      Stories:
      {storiesText}

      Skill Gaps:
      {skillGapsText}

      Provide:
      1. Key observations (3-5 bullet points)
      2. Common challenges (3-5 bullet points)
      3. Estimated success rate (percentage)
      4. Typical timeframe for transition (months)
      5. Success factors (3-5 bullet points)

      Return as JSON with these fields.
      `;

      try {
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
          insights = safeJsonParse(response.content.toString(), "insights");
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

        if (Object.keys(insights).length > 0) {
          return insights;
        }
      } catch (modelError) {
        console.error("Error generating insights with model:", modelError);
      }

      // If the model fails, return fallback insights
      return this.getFallbackInsights(currentRole, targetRole);
    } catch (error) {
      console.error("Error generating insights:", error);
      return this.getFallbackInsights(currentRole, targetRole);
    }
  }

  /**
   * Create a development plan for the career transition
   */
  async createDevelopmentPlan(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
    skillGaps: SkillGapAnalysis[],
    insights: any,
  ): Promise<any> {
    try {
      console.log(
        `Creating development plan for {currentRole} → {targetRole} with specific resources`,
      );

      // Format skill gaps
      const skillGapsText = skillGaps
        .map(
          (gap) =>
            `{gap.skillName} ({gap.gapLevel} gap): {gap.contextSummary || ""}`,
        )
        .join("\n");

      // Get relevant user skills
      const userSkills = await storage.getUserSkills(this.userId);
      const userSkillsText =
        userSkills.length > 0
          ? `\nUser's Existing Skills:\n{userSkills.map((s) => s.skillName).join(", ")}`
          : "\nUser Skills: Not specified";

      // Get resources for skill gaps
      const resources: Record<string, any[]> = {};

      // Identify top skill gaps to focus on
      const topSkillGaps = skillGaps
        .sort((a, b) => {
          const priorityMap: Record<string, number> = {
            High: 3,
            Medium: 2,
            Low: 1,
          };
          return (
            (priorityMap[b.gapLevel] || 0) - (priorityMap[a.gapLevel] || 0)
          );
        })
        .slice(0, 5);

      // Search for resources for each skill gap
      for (const gap of topSkillGaps) {
        try {
          // Using the improved search directly
          console.log(`Finding resources for skill: {gap.skillName}`);

          const searchResults = await improvedTavilySearch(
            `best resources courses tutorials to learn {gap.skillName} for {targetRole}`,
            5,
            "basic",
          );

          // Extract resources
          const skillResources = searchResults.results.map((result: any) => ({
            title: result.title || `Learn {gap.skillName}`,
            url: result.url,
            type: this.guessResourceType(result.url, result.title),
          }));

          // Store resources
          resources[gap.skillName] = skillResources;
        } catch (searchError) {
          console.error(
            `Error finding resources for {gap.skillName}:`,
            searchError,
          );

          // Add fallback resources
          resources[gap.skillName] = [
            {
              title: `{gap.skillName} on Coursera`,
              url: `https://www.coursera.org/search?query={encodeURIComponent(gap.skillName)}`,
              type: "course",
            },
            {
              title: `{gap.skillName} on YouTube`,
              url: `https://www.youtube.com/results?search_query={encodeURIComponent(gap.skillName)}+tutorial`,
              type: "video",
            },
          ];
        }
      }

      // Get interview prep resources
      try {
        const interviewSearchResults = await improvedTavilySearch(
          `{targetRole} interview preparation guide tips questions`,
          3,
          "basic",
        );

        resources["interview_prep"] = interviewSearchResults.results.map(
          (result: any) => ({
            title: result.title || "Interview Preparation",
            url: result.url,
            type: "guide",
          }),
        );
      } catch (interviewError) {
        console.error("Error finding interview resources:", interviewError);

        resources["interview_prep"] = [
          {
            title: "Interview Preparation Guide",
            url: `https://www.google.com/search?q={encodeURIComponent(targetRole)}+interview+questions+guide`,
            type: "guide",
          },
        ];
      }

      // Format resources for the plan prompt
      let resourcesText = "### Learning Resources:\n\n";

      for (const [skillName, skillResources] of Object.entries(resources)) {
        resourcesText += `## Resources for {skillName === "interview_prep" ? "Interview Preparation" : skillName}:\n\n`;

        skillResources.forEach((resource, i) => {
          resourcesText += `- {resource.title}: {resource.url}\n`;
        });

        resourcesText += "\n";
      }

      // Create a detailed plan prompt
      const planPrompt = `
      Create a practical career transition plan from {currentRole} to {targetRole} with specific recommendations.

      ### User Information:
      {userSkillsText}

      ### Skill Gaps to Address:
      {skillGapsText}

      {resourcesText}

      ### Requirements:
      - Create a 3-6 month structured plan with actionable steps
      - For each milestone and task, include specific resources from the provided list
      - Focus on both technical skills and soft skills needed for this transition
      - Include networking strategies and interview preparation
      - Structure the plan with 4-5 clear milestones and timeframes

      ### Response Format:
      Return a JSON object with this structure:
      {
        "overview": "Brief overview of the transition strategy",
        "estimatedTimeframe": "X-Y months",
        "milestones": [
          {
            "title": "Milestone title",
            "description": "Description of this milestone",
            "timeframe": "X weeks",
            "durationWeeks": 4,
            "priority": "High|Medium|Low",
            "resources": [
              {"title": "Resource name", "url": "resource URL", "type": "course/video/book/etc"}
            ],
            "tasks": [
              {
                "task": "Specific action item",
                "resources": [
                  {"title": "Resource name", "url": "resource URL", "type": "course/video/book/etc"}
                ]
              }
            ]
          }
        ],
        "successMetrics": ["Metric 1", "Metric 2"],
        "potentialChallenges": ["Challenge 1", "Challenge 2"]
      }
      `;

      try {
        // Generate the plan using the model
        const response = await modelWithTools.invoke([
          new SystemMessage(
            "You are a career development expert who creates specific transition plans with actual resources.",
          ),
          new HumanMessage(planPrompt),
        ]);

        // Process the response
        const content = response.content.toString();

        // Try to extract and parse the plan
        let plan: any = null;

        try {
          // First try: extract JSON object using regex
          const jsonRegex = /{[\s\S]*}/;
          const jsonMatch = content.match(jsonRegex);

          if (jsonMatch) {
            plan = safeJsonParse(jsonMatch[0], "development_plan");
          } else {
            throw new Error("No JSON found in response");
          }
        } catch (jsonError) {
          console.error("Error parsing plan JSON:", jsonError);
          throw jsonError;
        }

        // Validate the plan structure
        if (
          !plan ||
          !plan.milestones ||
          !Array.isArray(plan.milestones) ||
          plan.milestones.length === 0
        ) {
          console.log("Invalid plan structure, creating fallback plan");
          throw new Error("Invalid plan structure");
        }

        // Ensure all milestones have required properties
        plan.milestones = plan.milestones.map(
          (milestone: any, index: number) => ({
            title: milestone.title || `Phase {index + 1}`,
            description:
              milestone.description || `Development phase {index + 1}`,
            timeframe: milestone.timeframe || `{4} weeks`,
            durationWeeks: milestone.durationWeeks || 4,
            priority: milestone.priority || "Medium",
            order: index + 1,
            progress: 0,
            resources: Array.isArray(milestone.resources)
              ? milestone.resources
              : [],
            tasks: Array.isArray(milestone.tasks) ? milestone.tasks : [],
          }),
        );

        // Store the plan
        await this.storeDevelopmentPlan(transitionId, plan);

        return plan;
      } catch (error) {
        console.error("Error generating plan:", error);

        // Create a fallback plan
        const fallbackPlan = this.createFallbackPlan(
          currentRole,
          targetRole,
          skillGaps,
          resources,
        );

        // Store the fallback plan
        await this.storeDevelopmentPlan(transitionId, fallbackPlan);

        return fallbackPlan;
      }
    } catch (error) {
      console.error("Error creating development plan:", error);
      return this.createFallbackPlan(currentRole, targetRole, skillGaps, {});
    }
  }

  /**
   * Create a fallback plan when the primary plan generation fails
   */
  createFallbackPlan(
    currentRole: string,
    targetRole: string,
    skillGaps: SkillGapAnalysis[],
    resources: Record<string, any[]>,
  ): any {
    console.log("Creating fallback plan with gathered resources");

    // Extract basic components
    const currentParts = currentRole.split(" ");
    const currentCompany = currentParts[0] || "";
    const targetParts = targetRole.split(" ");
    const targetCompany = targetParts[0] || "";

    // Create milestones based on skill gaps
    const milestones = [];

    // Milestone 1: High priority skill gaps
    const highPriorityGaps = skillGaps.filter((gap) => gap.gapLevel === "High");
    if (highPriorityGaps.length > 0) {
      const highPriorityTasks = [];

      for (const gap of highPriorityGaps) {
        const skillName = gap.skillName;
        const taskResources = [];

        // Try to find resources for this skill
        if (resources[skillName] && Array.isArray(resources[skillName])) {
          taskResources.push(...resources[skillName].slice(0, 2));
        } else {
          // Add default resources
          taskResources.push({
            title: `Learn {skillName}`,
            url: `https://www.coursera.org/search?query={encodeURIComponent(skillName)}`,
            type: "course",
          });
        }

        highPriorityTasks.push({
          task: `Develop {skillName} skills`,
          resources: taskResources,
        });
      }

      milestones.push({
        title: "Address Critical Skill Gaps",
        description:
          "Focus on the highest priority skills needed for the transition",
        timeframe: "4-6 weeks",
        durationWeeks: 6,
        priority: "High",
        order: 1,
        progress: 0,
        resources: [
          {
            title: "Critical Skills Learning Path",
            url: "https://www.linkedin.com/learning/",
            type: "learning_path",
          },
        ],
        tasks: highPriorityTasks,
      });
    }

    // Milestone 2: Medium priority skill gaps
    const mediumPriorityGaps = skillGaps.filter(
      (gap) => gap.gapLevel === "Medium",
    );
    if (mediumPriorityGaps.length > 0) {
      const mediumPriorityTasks = [];

      for (const gap of mediumPriorityGaps.slice(0, 3)) {
        const skillName = gap.skillName;
        const taskResources = [];

        // Try to find resources for this skill
        if (resources[skillName] && Array.isArray(resources[skillName])) {
          taskResources.push(...resources[skillName].slice(0, 2));
        } else {
          // Add default resources
          taskResources.push({
            title: `Learn {skillName}`,
            url: `https://www.udemy.com/courses/search/?src=ukw&q={encodeURIComponent(skillName)}`,
            type: "course",
          });
        }

        mediumPriorityTasks.push({
          task: `Develop {skillName} skills`,
          resources: taskResources,
        });
      }

      milestones.push({
        title: "Build Secondary Skills",
        description: "Develop supporting skills needed for the role",
        timeframe: "3-4 weeks",
        durationWeeks: 4,
        priority: "Medium",
        order: 2,
        progress: 0,
        resources: [
          {
            title: "Supporting Skills Bundle",
            url: "https://www.udemy.com/",
            type: "course_bundle",
          },
        ],
        tasks: mediumPriorityTasks,
      });
    }

    // Milestone 3: Interview preparation
    const interviewTasks = [];

    // Add interview prep resources if available
    if (
      resources["interview_prep"] &&
      Array.isArray(resources["interview_prep"])
    ) {
      interviewTasks.push({
        task: "Prepare for technical interviews",
        resources: resources["interview_prep"].slice(0, 2),
      });
    } else {
      interviewTasks.push({
        task: "Prepare for technical interviews",
        resources: [
          {
            title: "Interview Preparation Guide",
            url: `https://www.google.com/search?q={encodeURIComponent(targetRole)}+interview+questions+guide`,
            type: "guide",
          },
        ],
      });
    }

    // Add networking task
    interviewTasks.push({
      task: "Network with professionals in target role",
      resources: [
        {
          title: "LinkedIn Networking Strategy",
          url: "https://www.linkedin.com",
          type: "networking",
        },
      ],
    });

    // Add company research task
    if (currentCompany !== targetCompany) {
      interviewTasks.push({
        task: `Research {targetCompany} culture and values`,
        resources: [
          {
            title: `{targetCompany} Company Research`,
            url: `https://www.glassdoor.com/Overview/Working-at-{targetCompany.replace(/\s+/g, "-")}`,
            type: "research",
          },
        ],
      });
    }

    milestones.push({
      title: "Interview Preparation & Networking",
      description: "Prepare for interviews and build professional network",
      timeframe: "2-3 weeks",
      durationWeeks: 3,
      priority: "Medium",
      order: 3,
      progress: 0,
      resources: [
        {
          title: "Interview Mastery Guide",
          url: "https://interviewcake.com/",
          type: "guide",
        },
      ],
      tasks: interviewTasks,
    });

    // Create the complete plan
    return {
      overview: `Personalized transition plan from {currentRole} to {targetRole} focusing on skill development, networking, and interview preparation.`,
      estimatedTimeframe: "3-6 months",
      milestones: milestones,
      successMetrics: [
        `Successfully interview for {targetRole} positions`,
        "Demonstrate mastery of required technical skills",
        "Build a professional network in the target role",
        "Complete at least one portfolio project demonstrating key skills",
      ],
      potentialChallenges: [
        "Time management while working full-time",
        "Competitive job market for this role",
        "Rapidly evolving skill requirements",
        `Adjusting to {targetCompany} culture from {currentCompany} background`,
      ],
    };
  }

  /**
   * Store the development plan in the database
   */
  async storeDevelopmentPlan(transitionId: number, plan: any): Promise<void> {
    try {
      // First store the plan
      await storage.storeDevelopmentPlan(transitionId, plan);

      // Then process each milestone
      if (plan.milestones && Array.isArray(plan.milestones)) {
        const planDb = await storage.getPlanByTransitionId(transitionId);

        if (planDb) {
          for (const [index, milestone] of plan.milestones.entries()) {
            try {
              // Store the milestone
              const storedMilestone = await storage.createMilestone({
                planId: planDb.id,
                title: milestone.title || `Phase {index + 1}`,
                description: milestone.description || null,
                priority: milestone.priority || "Medium",
                durationWeeks: milestone.durationWeeks || 4,
                order: index + 1,
                progress: 0,
              });

              // Store milestone resources
              if (milestone.resources && Array.isArray(milestone.resources)) {
                for (const resource of milestone.resources) {
                  await storage.createResource({
                    milestoneId: storedMilestone.id,
                    title: resource.title || "Learning Resource",
                    url: resource.url || "https://www.google.com",
                    type: resource.type || "resource",
                  });
                }
              }

              // Store tasks and their resources
              if (milestone.tasks && Array.isArray(milestone.tasks)) {
                for (const task of milestone.tasks) {
                  try {
                    // Create the task
                    const storedTask = await storage.createTask({
                      milestoneId: storedMilestone.id,
                      content: task.task || "Complete task",
                      isDone: false,
                    });

                    // Store task resources
                    if (task.resources && Array.isArray(task.resources)) {
                      for (const resource of task.resources) {
                        await storage.createResource({
                          milestoneId: storedMilestone.id,
                          taskId: storedTask.id,
                          title: resource.title || "Task Resource",
                          url: resource.url || "https://www.google.com",
                          type: resource.type || "resource",
                        });
                      }
                    }
                  } catch (taskError) {
                    console.error("Error storing task:", taskError);
                  }
                }
              }
            } catch (milestoneError) {
              console.error("Error storing milestone:", milestoneError);
            }
          }

          console.log(
            `Successfully stored development plan for transition ID: {transitionId}`,
          );
        } else {
          console.error("Failed to retrieve stored plan from database");
        }
      }
    } catch (error) {
      console.error("Error storing development plan:", error);
    }
  }

  /**
   * Get fallback skill gaps when analysis fails
   */
  getFallbackSkillGaps(
    currentRole: string,
    targetRole: string,
  ): SkillGapAnalysis[] {
    return [
      {
        skillName: "Technical Skills",
        gapLevel: "Medium",
        confidenceScore: 70,
        mentionCount: 1,
        contextSummary: `Core technical skills needed for the {targetRole} role`,
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
        contextSummary: `Leadership expectations for {targetRole}`,
      },
    ];
  }

  /**
   * Get fallback insights when analysis fails
   */
  getFallbackInsights(currentRole: string, targetRole: string): any {
    return {
      keyObservations: [
        `Most successful transitions from {currentRole} to {targetRole} take 6-12 months`,
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

  /**
   * Guess the resource type based on URL and title
   */
  guessResourceType(url: string, title: string): string {
    const lowerUrl = url.toLowerCase();
    const lowerTitle = (title || "").toLowerCase();

    if (
      lowerUrl.includes("youtube") ||
      lowerUrl.includes("youtu.be") ||
      lowerTitle.includes("video")
    ) {
      return "video";
    } else if (
      lowerUrl.includes("course") ||
      lowerUrl.includes("udemy") ||
      lowerUrl.includes("coursera") ||
      lowerTitle.includes("course")
    ) {
      return "course";
    } else if (
      lowerUrl.includes("github") ||
      lowerUrl.includes("project") ||
      lowerTitle.includes("project")
    ) {
      return "project";
    } else if (
      lowerUrl.includes("docs") ||
      lowerUrl.includes("documentation") ||
      lowerTitle.includes("documentation")
    ) {
      return "documentation";
    } else if (
      lowerUrl.includes("tutorial") ||
      lowerTitle.includes("tutorial") ||
      lowerTitle.includes("guide") ||
      lowerTitle.includes("how to")
    ) {
      return "tutorial";
    } else {
      return "resource";
    }
  }
}
