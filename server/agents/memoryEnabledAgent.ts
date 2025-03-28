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
import { OpenAIEmbeddings } from "@langchain/openai";
import { careerTransitionMemory } from './memoryStore';
import { safeParseJSON } from '../helpers/jsonParserHelper';

/**
 * A single agent with long-term memory for career transition analysis
 * This replaces the multi-agent system with a simpler, more robust approach
 */
export class MemoryEnabledAgent {
  private model: any;
  private tools: StructuredTool[];
  private memoryStore: MemoryVectorStore;
  private userId: number;
  private transitionId: number;
  private mcpHandler: any;
  private modelWithTools: any; //Added to store the bound model

  constructor(userId: number, transitionId: number) {
    this.transitionId = transitionId;

    // Initialize the model with Gemini 2.0 Flash Lite
    // We use the normal initialization without tools to avoid schema conversion errors
    this.model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY || "",
      modelName: "gemini-2.0-flash-lite", // Ensure we're using 2.0 Flash Lite
      temperature: 0.3,
      maxOutputTokens: 2048,
    });

    // Initialize memory store with OpenAI embeddings or fallback
    try {
      this.memoryStore = new MemoryVectorStore(
        new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY || "",
        }),
      );
    } catch (error) {
      console.warn("Failed to initialize memory store with embeddings:", error);
      // Use a simple in-memory store as fallback with basic embeddings
      const embeddings = {
        embedDocuments: async (texts: string[]) => texts.map(() => Array(1536).fill(0)),
        embedQuery: async (text: string) => Array(1536).fill(0),
      };
      this.memoryStore = new MemoryVectorStore(embeddings);
    }

    // Store the user ID for memory access
    this.userId = userId;

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
        // Custom tools with Zod schemas disabled due to compatibility issues with Gemini
        // Memory tools will be simulated through direct function calls instead
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
   * Create a tool for saving memories
   */
  private createSaveMemoryTool(): StructuredTool {
    // Define the schema statically to avoid errors with zod serialization
    const schema = z.object({
      memory: z.string().describe("The text content to save to memory"),
      type: z.string().describe("The type of memory (skill_gap, insight, story, plan, general)"),
    });

    const tool = new StructuredTool({
      name: "save_memory",
      description: "Save information about the career transition to memory",
      schema: schema,
      func: async ({ memory, type }: { memory: string, type: string }) => {
        const validTypes = ["skill_gap", "insight", "story", "plan", "general"];
        const memoryType = validTypes.includes(type) ? type : "general";

        const document = new Document({
          pageContent: memory,
          metadata: {
            userId: this.userId,
            type: memoryType,
            timestamp: new Date().toISOString(),
          },
        });

        await this.memoryStore.addDocuments([document]);
        return `Successfully saved memory of type ${memoryType}`;
      },
    });
    return tool;
  }

  /**
   * Create a tool for retrieving memories
   */
  private createRetrieveMemoryTool(): StructuredTool {
    // Define the schema statically to avoid errors with zod serialization
    const schema = z.object({
      query: z.string().describe("The query to search for relevant memories"),
      type: z.string().describe("The type of memory to retrieve (skill_gap, insight, story, plan, general, all)").optional(),
    });

    const tool = new StructuredTool({
      name: "retrieve_memories",
      description: "Retrieve relevant memories for this career transition",
      schema: schema,
      func: async ({ query, type }: { query: string, type?: string }) => {
        // Filter function to get memories for this user
        const filterFn = (doc: Document) => {
          if (doc.metadata.userId !== this.userId) {
            return false;
          }

          if (type && type !== "all" && doc.metadata.type !== type) {
            return false;
          }

          return true;
        };

        try {
          const documents = await this.memoryStore.similaritySearch(
            query,
            5,
            filterFn,
          );

          return documents.map((doc) => doc.pageContent).join("\n\n");
        } catch (error) {
          console.error("Error retrieving memories:", error);
          return "No relevant memories found.";
        }
      },
    });
    return tool;
  }

  /**
   * Analyze a career transition from current to target role
   */
  // Keep track of in-progress transitions to prevent recursive calls
  private static inProgressTransitions = new Set<number>();

  async analyzeCareerTransition(
    currentRole: string,
    targetRole: string,
    transitionId: number,
    existingSkills: string[] = [],
  ): Promise<{
    skillGaps: SkillGapAnalysis[];
    insights: any;
    scrapedCount: number;
  }> {
    // Check if this transition is already being processed using the memory store
    if (careerTransitionMemory.isTransitionInProgress(transitionId)) {
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
      if (this.tools && this.tools.length > 0) {
        try {
          // Bind tools to the model with error handling
          this.modelWithTools = this.model.bindTools(this.tools);
        } catch (bindError) {
          console.error("Error binding tools to model:", bindError);
          // Fall back to using the model without tools
          this.modelWithTools = this.model;
        }
      } else {
        // If no tools are available, just use the base model
        this.modelWithTools = this.model;
      }

      // Step 1: Research transition stories - with error isolation
      let stories = [];
      try {
        stories = await this.researchTransitionStories(
          this.modelWithTools,
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
          this.modelWithTools,
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
          this.modelWithTools,
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

      const researchPrompt = `
      Research career transition stories from ${currentRole} to ${targetRole}.

      Follow these steps:
      1. Use Tavily search to find real transition stories from credible sources
      2. Focus on Reddit, Blind, Medium, LinkedIn or professional blog posts
      3. Extract specific details about challenges, skills needed, and timeframes
      4. Save important findings to memory using the save_memory tool

      Store at least 3-5 concrete examples of this transition.
      `;

      // Use a maximum of 3 attempts to avoid getting stuck
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await modelWithTools.invoke([
            new SystemMessage(
              "You are a career research specialist who finds real-world transition stories. Use tools to search the web and save findings to memory.",
            ),
            new HumanMessage(researchPrompt),
          ]);

          // Process the response to extract stories
          let stories = [];

          try {
            // Use our enhanced JSON parser with robust error handling
            const parsedStories = safeParseJSON(response.content.toString(), "stories");

            if (Array.isArray(parsedStories) && parsedStories.length > 0) {
              stories = parsedStories;
            } else {
              // Fallback: Try extracting semi-structured content
              const contentMatches = response.content
                .toString()
                .match(/Story \d+:([\s\S]*?)(?=Story \d+:|$)/g);

              if (contentMatches) {
                stories = contentMatches.map((match: string, index: number) => ({
                  source: `Story ${index + 1}`,
                  content: match.replace(/Story \d+:/, "").trim(),
                  url: null,
                }));
              }
            }
          } catch (parseError) {
            console.error("Error parsing stories:", parseError);
          }

          // Save stories to database
          for (const story of stories) {
            await storage.createScrapedData({
              transitionId,
              source: story.source || "Research",
              content: story.content || "No content",
              url: story.url || null,
              postDate: new Date().toISOString().split("T")[0],
              skillsExtracted: [],
            });
          }

          return stories;
        } catch (attemptError) {
          console.error(
            `Research attempt ${attempt + 1} failed:`,
            attemptError,
          );
          if (attempt === 2) throw attemptError;
        }
      }

      return [];
    } catch (error) {
      console.error("Error researching transition stories:", error);
      return [];
    }
  }

  /**
   * Analyze skill gaps between roles
   */
  private async analyzeSkillGaps(
    currentRole: string,
    targetRole: string,
    transitionId: number,
    existingSkills: string[],
    stories: any[],
  ): Promise<SkillGapAnalysis[]> {
    try {
      console.log(`Analyzing skill gaps for ${currentRole} → ${targetRole}`);

      const storiesText = stories.map((story) => story.content).join("\n\n");

      const skillGapPrompt = `
      Analyze skill gaps for transition from ${currentRole} to ${targetRole}.

      User's existing skills: ${existingSkills.join(", ") || "None specified"}

      Transition stories:
      ${storiesText}

      For each skill gap, identify:
      1. Skill name
      2. Gap level (Low, Medium, High)
      3. Confidence score (0-100)
      4. Number of mentions in stories
      5. Context summary explaining importance

      Return JSON array with these fields.
      `;

      const response = await this.modelWithTools.invoke([
        new SystemMessage(
          "You are a career skills analyst who identifies skill gaps between roles.",
        ),
        new HumanMessage(skillGapPrompt),
      ]);

      // Process the response to extract skill gaps
      let skillGaps: SkillGapAnalysis[] = [];

      try {
        const rawSkillGaps = safeParseJSON(response.content.toString(), "skillGaps");

        skillGaps = rawSkillGaps.map(gap => {
          const skillName = gap.skillName || gap.skill_name;
          const gapLevel = gap.gapLevel || gap.gap_level || "Medium";
          const confidenceScore = gap.confidenceScore || gap.confidence_score || 70;
          const mentionCount = gap.mentionCount || gap.number_of_mentions || gap.mentions || 1;

          return {
            skillName,
            gapLevel,
            confidenceScore,
            mentionCount,
            contextSummary: gap.contextSummary || gap.context_summary
          };
        }).filter(gap => gap.skillName);
      } catch (parseError) {
        console.error("Error parsing skill gaps:", parseError);
      }

      // Save skill gaps to database with validation to prevent null values
      for (const gap of skillGaps) {
        // Only insert skill gaps with valid data
        if (gap && gap.skillName) {
          await storage.createSkillGap({
            transitionId,
            skillName: gap.skillName, // Ensure this is not null or undefined
            gapLevel: (gap.gapLevel as "Low" | "Medium" | "High") || "Medium", // Default to Medium
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

      const skillGapsText = skillGaps
        .map(
          (gap) =>
            `${gap.skillName} (${gap.gapLevel} gap): ${gap.contextSummary || ""}`,
        )
        .join("\n");

      const planPrompt = `
      Create a development plan for transition from ${currentRole} to ${targetRole}.

      Skill Gaps:
      ${skillGapsText}

      Create a plan with:
      1. 4-6 milestone phases organized by priority
      2. For each milestone:
         - Clear title
         - Description
         - Priority (High, Medium, Low)
         - Duration in weeks
         - Order (sequence number)
         - 2-3 specific learning resources (title, URL, type)

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
      } catch (parseError) {
        console.error("Error parsing plan:", parseError);
      }

      // Save plan and milestones to database
      if (plan.milestones && plan.milestones.length > 0) {
        const dbPlan = await storage.createPlan({
          transitionId,
        });

        for (let i = 0; i < plan.milestones.length; i++) {
          const m = plan.milestones[i];

          const milestone = await storage.createMilestone({
            planId: dbPlan.id,
            title: m.title || `Milestone ${i + 1}`,
            description: m.description || null,
            priority: m.priority || "Medium",
            durationWeeks: m.durationWeeks || 4,
            order: i + 1,
            progress: 0,
          });

          // Add resources if available
          if (m.resources && Array.isArray(m.resources)) {
            for (const r of m.resources) {
              await storage.createResource({
                milestoneId: milestone.id,
                title: r.title || `Resource for ${m.title}`,
                url: r.url || "https://www.coursera.org/",
                type: r.type || "website",
              });
            }
          } else {
            // Add default resource
            await storage.createResource({
              milestoneId: milestone.id,
              title: `Learning resources for ${m.title}`,
              url: "https://www.coursera.org/",
              type: "website",
            });
          }
        }

        plan.id = dbPlan.id;
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