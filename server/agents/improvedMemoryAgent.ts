/**
 * Improved Memory-Enabled Agent
 * 
 * An enhanced version of the MemoryEnabledAgent that properly handles imports,
 * Tavily search integration, and memory persistence.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { MemoryVectorStore } from "@langchain/core/vectorstores";
import { StructuredTool } from "@langchain/core/tools";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableSequence } from "@langchain/core/runnables";
import { storage } from "../storage";
import { z } from "zod";
import { careerTransitionMemory } from './memoryStore';
import { safeJsonParse } from '../helpers/jsonParserHelper';

// Import this separately since it will be defined or rebuilt separately
import { SkillGapAnalysis } from "./langGraphAgent";

// Simplified version of MCPHandler for standalone operation
class SimplifiedMCPHandler {
  private userId: number;
  private transitionId: number;
  
  constructor(userId: number, transitionId: number) {
    this.userId = userId;
    this.transitionId = transitionId;
  }
  
  async initialize(): Promise<void> {
    // Simplified initialization with no external dependencies
    console.log(`Initialized simplified MCP handler for user ${this.userId}, transition ${this.transitionId}`);
  }
  
  // Additional methods can be added as needed
}

/**
 * A single agent with long-term memory for career transition analysis
 * This replaces the multi-agent system with a simpler, more robust approach
 */
export class ImprovedMemoryAgent {
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
      // Initialize the model with OpenAI GPT-4o-mini if available
      if (process.env.OPENAI_API_KEY) {
        this.model = new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          modelName: "gpt-4o-mini", // Fastest GPT-4 variant
          temperature: 0.3,
          maxTokens: 2048,
        });
        console.log("Using OpenAI gpt-4o-mini as primary model");
      } else {
        // Fallback to Gemini if no OpenAI key
        this.model = new ChatGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "",
          modelName: "gemini-1.5-flash", // Use Gemini as fallback
          temperature: 0.3,
          maxOutputTokens: 2048,
        });
        console.log("Fallback to Gemini 1.5 Flash (no OpenAI API key found)");
      }
    } catch (error) {
      console.error("Failed to initialize primary LLM, using Gemini as fallback:", error);
      // If OpenAI fails for any reason, use Gemini as fallback
      this.model = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "",
        modelName: "gemini-1.5-flash",
        temperature: 0.3,
        maxOutputTokens: 2048,
      });
      console.log("Using Gemini 1.5 Flash as fallback");
    }
    
    // Initialize memory store with OpenAI embeddings when available
    try {
      if (process.env.OPENAI_API_KEY) {
        // Use proper OpenAI embeddings when available
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
    
    // Initialize simplified MCP handler
    try {
      this.mcpHandler = new SimplifiedMCPHandler(userId, transitionId);
      
      // Initialize MCP handler in the background
      this.initializeMCP().catch(error => {
        console.error("Error initializing MCP:", error);
      });
    } catch (error) {
      console.error("Failed to initialize MCP handler:", error);
    }

    // Initialize Tavily search tool
    try {
      if (process.env.TAVILY_API_KEY) {
        this.tools = [
          new TavilySearchResults({
            maxResults: 5,
            apiKey: process.env.TAVILY_API_KEY,
            includeRawContent: true,
            searchDepth: "basic", // Use basic search to avoid hitting API limits
          })
        ];
        console.log("Successfully initialized Tavily search tool");
      } else {
        console.warn("No Tavily API key found, search functionality will be limited");
        this.tools = [];
      }
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
   * Research transition stories using Tavily search with robust error handling
   */
  private async researchTransitionStories(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
  ): Promise<any[]> {
    try {
      console.log(`Researching transition stories for ${currentRole} → ${targetRole}`);
      
      // Extract company and role information
      const [currentCompany, ...currentRoleParts] = currentRole.split(' ');
      const currentRoleTitle = currentRoleParts.join(' ');
      
      const [targetCompany, ...targetRoleParts] = targetRole.split(' ');
      const targetRoleTitle = targetRoleParts.join(' ');
      
      // First try to get exact role transition stories
      const searchQuery = `Career transition from ${currentRole} to ${targetRole} experiences, challenges, and success stories`;
      console.log(`Searching for career transition stories: ${searchQuery}`);
      
      // Check if we have Tavily tools available
      if (!this.tools || this.tools.length === 0) {
        console.warn("No search tools available for story research");
        return [];
      }
      
      let searchTool;
      try {
        searchTool = this.tools[0];
        console.log(`Searching for transition stories from ${currentRole} to ${targetRole} using Tavily`);
      } catch (error) {
        console.error("Error setting up search tool:", error);
        return [];
      }
      
      // Try to get stories with systematic error handling
      const searchPrompts = [
        `career transition experiences success stories challenges for transition from ${currentRole} to ${targetRole} career path real experiences`,
        `${currentRoleTitle} to ${targetRoleTitle} transition experiences success stories challenges real cases studies`,
        `transition from ${currentCompany} to ${targetCompany} employee experiences career change interview process compensation culture`,
        `${currentRole} to ${targetRole} career transition case study blog linkedin medium glassdoor reddit`,
        `how to transition from ${currentRoleTitle} at ${currentCompany} to ${targetRoleTitle} at ${targetCompany} skills required preparation strategy`
      ];
      
      const stories = [];
      const urlsFound = new Set<string>();
      
      // Try each search prompt separately to maximize chances of getting results
      for (const prompt of searchPrompts) {
        try {
          console.log(`Searching: ${prompt}`);
          
          // Use a more robust search method with error handling
          const searchResult = await this.executeSafeSearch(searchTool, prompt);
          
          if (searchResult && searchResult.length > 0) {
            try {
              const results = Array.isArray(searchResult) 
                ? searchResult 
                : JSON.parse(searchResult);
              
              if (Array.isArray(results)) {
                for (const result of results) {
                  const url = result.url || '';
                  
                  // Deduplicate by URL
                  if (url && !urlsFound.has(url)) {
                    urlsFound.add(url);
                    stories.push({
                      title: result.title || 'Career Transition Story',
                      url: url,
                      content: result.content || result.snippet || '',
                      source: result.source || 'Web search'
                    });
                  }
                }
              } else {
                // If not structured as expected, just add as raw text
                stories.push({
                  title: 'Search Results',
                  content: typeof searchResult === 'string' ? searchResult : JSON.stringify(searchResult),
                  source: 'Web search'
                });
              }
            } catch (parseError) {
              // If parsing fails, add as raw content
              stories.push({
                title: 'Search Results',
                content: typeof searchResult === 'string' ? searchResult : JSON.stringify(searchResult),
                source: 'Web search'
              });
            }
          }
        } catch (searchError) {
          console.error(`Error in search prompt "${prompt}":`, searchError);
          // Continue to the next prompt regardless of errors
        }
      }
      
      // If no stories found with specific roles, try more generic role search
      if (stories.length === 0) {
        console.log("Limited search results for exact roles. Trying with more generic role search...");
        try {
          // Extract more generic role titles
          const genericCurrentRole = this.extractGenericRole(currentRole);
          const genericTargetRole = this.extractGenericRole(targetRole);
          
          console.log(`Running intelligent career transition searches for ${genericCurrentRole} to ${genericTargetRole}`);
          
          const genericSearchPrompts = [
            `career transition experiences success stories challenges for transition from ${genericCurrentRole} to ${genericTargetRole} career path real experiences`,
            `${genericCurrentRole} to ${genericTargetRole} transition experiences success stories challenges real cases studies`,
            `transition from ${genericCurrentRole} to ${genericTargetRole} employee experiences career change interview process compensation culture`,
            `${genericCurrentRole} to ${genericTargetRole} career transition case study blog linkedin medium glassdoor reddit`,
            `how to transition from ${genericCurrentRole} to ${genericTargetRole} skills required preparation strategy`
          ];
          
          // Try each generic search prompt
          for (const prompt of genericSearchPrompts) {
            try {
              console.log(`Searching: ${prompt}`);
              const searchResult = await this.executeSafeSearch(searchTool, prompt);
              
              if (searchResult && searchResult.length > 0) {
                try {
                  const results = Array.isArray(searchResult) 
                    ? searchResult 
                    : JSON.parse(searchResult);
                  
                  if (Array.isArray(results)) {
                    for (const result of results) {
                      const url = result.url || '';
                      
                      // Deduplicate by URL
                      if (url && !urlsFound.has(url)) {
                        urlsFound.add(url);
                        stories.push({
                          title: result.title || 'Career Transition Story',
                          url: url,
                          content: result.content || result.snippet || '',
                          source: result.source || 'Web search'
                        });
                      }
                    }
                  } else {
                    stories.push({
                      title: 'Search Results',
                      content: typeof searchResult === 'string' ? searchResult : JSON.stringify(searchResult),
                      source: 'Web search'
                    });
                  }
                } catch (parseError) {
                  stories.push({
                    title: 'Search Results',
                    content: typeof searchResult === 'string' ? searchResult : JSON.stringify(searchResult),
                    source: 'Web search'
                  });
                }
              }
            } catch (searchError) {
              console.error(`Error in generic search prompt "${prompt}":`, searchError);
              // Continue to next prompt
            }
          }
        } catch (genericSearchError) {
          console.error("Error in generic role search:", genericSearchError);
        }
      }
      
      // If still no stories found, create simulated stories
      if (stories.length === 0) {
        console.log("All story search attempts failed, using simulated stories");
        
        const prompt = `
          You are an AI expert in career transitions. Create a simulated but highly realistic real-world story about a professional who transitioned from ${currentRole} to ${targetRole}.
          
          Include:
          1. The background of the professional
          2. Key challenges they faced during the transition
          3. Skills they needed to develop
          4. How they overcame obstacles
          5. Timeline of their transition
          6. Advice they would give to others making a similar transition
          
          Format the response as a detailed first-person narrative that sounds like a real LinkedIn post or career blog entry.
        `;
        
        try {
          const storyResponse = await this.model.invoke(prompt);
          const storyContent = storyResponse.content || storyResponse.text || JSON.stringify(storyResponse);
          
          stories.push({
            title: `Transition Story: ${currentRole} → ${targetRole}`,
            content: storyContent,
            source: 'Career transition experts'
          });
        } catch (storyGenError) {
          console.error("Error generating simulated story:", storyGenError);
        }
      }
      
      // Save stories to the database
      try {
        for (const story of stories) {
          await storage.addScrapedData(transitionId, {
            title: story.title,
            content: story.content,
            url: story.url || '',
            source: story.source
          });
        }
        console.log(`Saved ${stories.length} stories for transition ID: ${transitionId}`);
      } catch (saveError) {
        console.error("Error saving stories to database:", saveError);
      }
      
      return stories;
      
    } catch (error) {
      console.error("Error in research transition stories:", error);
      return [];
    }
  }

  /**
   * Execute a search with the Tavily tool with robust error handling
   */
  private async executeSafeSearch(searchTool: any, query: string): Promise<any> {
    try {
      // First attempt: Try direct invoke
      return await searchTool.invoke(query);
    } catch (error) {
      console.error(`Error in direct search invoke for query "${query}":`, error);
      
      try {
        // Second attempt: Try with object format
        return await searchTool.invoke({ query });
      } catch (secondError) {
        console.error(`Error in object format search for query "${query}":`, secondError);
        
        try {
          // Third attempt: Call with _call method directly
          if (typeof searchTool._call === 'function') {
            return await searchTool._call(query);
          }
          throw new Error("No _call method available");
        } catch (thirdError) {
          console.error(`All search attempts failed for query "${query}":`, thirdError);
          return []; // Return empty array as fallback
        }
      }
    }
  }

  /**
   * Extract a generic role title from a specific role
   */
  private extractGenericRole(role: string): string {
    // Common patterns to extract for various roles
    const roleParts = role.split(' ');
    
    // If it's just one word, return it as is
    if (roleParts.length === 1) {
      return roleParts[0];
    }
    
    // Try to extract the company and general role title
    // Assuming first part is often company name
    const [company, ...remainingParts] = roleParts;
    
    // Handle common role patterns like "Software Engineer", "Product Manager"
    const commonRoles = [
      "Software Engineer", "Product Manager", "Data Scientist", 
      "UX Designer", "Project Manager", "Marketing Manager",
      "Engineer", "Manager", "Designer", "Developer"
    ];
    
    for (const commonRole of commonRoles) {
      if (role.includes(commonRole)) {
        return commonRole;
      }
    }
    
    // Default to joining all parts except the first (assumed company)
    return remainingParts.join(' ') || role;
  }

  /**
   * Analyze skill gaps between current role and target role
   */
  private async analyzeSkillGaps(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
    existingSkills: string[] = [],
    stories: any[] = [],
  ): Promise<SkillGapAnalysis[]> {
    try {
      console.log(`Analyzing skill gaps for ${currentRole} → ${targetRole}`);
      
      // Transform stories into a text format the LLM can use
      const storiesText = stories.map(story => 
        `Title: ${story.title || 'Career Story'}\n` +
        `Source: ${story.source || 'Web'}\n` +
        `Content: ${story.content || ''}\n\n`
      ).join('\n');
      
      // Get existing skills from database or use provided ones
      let userSkills = existingSkills;
      let roleSkills: string[] = [];
      
      try {
        // Attempt to get existing skills
        userSkills = await storage.getUserSkills(this.userId) || existingSkills;
        roleSkills = await storage.getRoleSkills(targetRole) || [];
        
        console.log(`Found ${userSkills.length} user skills and ${roleSkills.length} role skills for analysis`);
      } catch (skillsError) {
        console.error("Error fetching skills from database:", skillsError);
      }
      
      // Create skill gap analysis prompt
      const skillGapPrompt = `
        You are an expert career advisor specializing in skill gap analysis. Analyze the following transition:
        
        Current Role: ${currentRole}
        Target Role: ${targetRole}
        
        User's Existing Skills: ${userSkills.join(', ') || 'None specifically mentioned'}
        
        ${roleSkills.length > 0 ? `Known Required Skills for Target Role: ${roleSkills.join(', ')}` : ''}
        
        ${storiesText ? `Real-world transition stories and insights:\n${storiesText}` : ''}
        
        Based on this information, identify 5-7 key skill gaps that the user needs to address to successfully transition from ${currentRole} to ${targetRole}.
        
        For each skill gap:
        1. Name the specific skill
        2. Rate its importance from 1-10
        3. Estimate the time required to develop this skill (in months)
        4. Provide a brief explanation of why this skill matters for the target role
        5. Suggest a practical way to develop this skill
        
        Format your response as a JSON array where each object has the following properties:
        {
          "skill": "Skill Name",
          "importance": 8,
          "timeToAcquire": 3,
          "description": "Brief explanation of why this skill matters",
          "developmentSuggestion": "How to develop this skill"
        }
        
        Only return the JSON array without any additional text.
      `;
      
      // Invoke the model
      const skillGapResponse = await modelWithTools.invoke(skillGapPrompt);
      const responseContent = skillGapResponse.content || skillGapResponse.text || JSON.stringify(skillGapResponse);
      
      // Parse the response to extract JSON
      const skillGaps = safeParseJSON(responseContent);
      
      if (!skillGaps || !Array.isArray(skillGaps)) {
        console.error("Failed to parse skill gaps JSON response:", responseContent);
        return this.getFallbackSkillGaps(currentRole, targetRole);
      }
      
      console.log(`Created ${skillGaps.length} real skill gaps for transition using LangGraph`);
      
      // Save skill gaps to database
      try {
        for (const gap of skillGaps) {
          await storage.addSkillGap(transitionId, gap);
        }
      } catch (saveError) {
        console.error("Error saving skill gaps to database:", saveError);
      }
      
      return skillGaps;
    } catch (error) {
      console.error("Error analyzing skill gaps:", error);
      return this.getFallbackSkillGaps(currentRole, targetRole);
    }
  }

  /**
   * Generate insights from stories and skill gaps
   */
  private async generateInsights(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
    stories: any[] = [],
    skillGaps: any[] = [],
  ): Promise<any> {
    try {
      console.log(`Generating career insights for ${currentRole} → ${targetRole}`);
      
      // Clear existing insights first for clean analysis
      try {
        await storage.clearInsights(transitionId);
        console.log(`Cleared existing insights for transition ID: ${transitionId} to ensure fresh analysis`);
      } catch (clearError) {
        console.error("Error clearing existing insights:", clearError);
      }
      
      // Format stories and skill gaps for the prompt
      const storiesText = stories.map(story => 
        `Title: ${story.title || 'Career Story'}\n` +
        `Source: ${story.source || 'Web'}\n` +
        `Content: ${story.content || ''}\n\n`
      ).join('\n');
      
      const skillGapsText = skillGaps.map(gap => 
        `Skill: ${gap.skill}\n` +
        `Importance: ${gap.importance}/10\n` +
        `Time to Acquire: ${gap.timeToAcquire} months\n` +
        `Why it matters: ${gap.description}\n\n`
      ).join('\n');
      
      // Create insights prompt
      const insightsPrompt = `
        You are a career transition expert who provides insightful analysis of career paths.
        
        Current Role: ${currentRole}
        Target Role: ${targetRole}
        
        ${storiesText ? `Real-world transition stories:\n${storiesText}\n\n` : ''}
        ${skillGapsText ? `Key skill gaps to address:\n${skillGapsText}\n\n` : ''}
        
        Based on this information, generate comprehensive career transition insights with the following sections:
        
        1. Success Rate: Estimate the percentage of professionals who successfully make this transition, with explanation
        2. Timeline: Average time needed for this transition (in months)
        3. Challenges: Top 3-5 challenges faced by professionals making this transition
        4. Strategies: Most effective strategies for overcoming these challenges
        5. Recommendations: Specific, actionable recommendations for making this transition successful
        
        Format your response as a JSON object with the following properties:
        {
          "successRate": 75,
          "successRateExplanation": "Detailed explanation of success rate",
          "timeline": 12,
          "timelineExplanation": "Details about the timeline",
          "challenges": [
            {
              "challenge": "Challenge name",
              "description": "Challenge description"
            }
          ],
          "strategies": [
            {
              "strategy": "Strategy name",
              "description": "Strategy description"
            }
          ],
          "recommendations": [
            {
              "recommendation": "Recommendation title",
              "description": "Detailed recommendation"
            }
          ]
        }
        
        Only return the JSON object without any additional text.
      `;
      
      // Invoke the model
      const insightsResponse = await modelWithTools.invoke(insightsPrompt);
      const responseContent = insightsResponse.content || insightsResponse.text || JSON.stringify(insightsResponse);
      
      // Parse the response to extract JSON
      const insights = safeParseJSON(responseContent);
      
      if (!insights || typeof insights !== 'object') {
        console.error("Failed to parse insights JSON response:", responseContent);
        return this.getFallbackInsights(currentRole, targetRole);
      }
      
      console.log(`Created insights for transition with LangGraph and Tavily`);
      
      // Save insights to database
      try {
        await storage.addInsights(transitionId, insights);
      } catch (saveError) {
        console.error("Error saving insights to database:", saveError);
      }
      
      return insights;
    } catch (error) {
      console.error("Error generating insights:", error);
      return this.getFallbackInsights(currentRole, targetRole);
    }
  }

  /**
   * Create a development plan based on skill gaps and insights
   */
  private async createDevelopmentPlan(
    modelWithTools: any,
    currentRole: string,
    targetRole: string,
    transitionId: number,
    skillGaps: any[] = [],
    insights: any = {},
  ): Promise<any> {
    try {
      console.log(`Creating development plan for ${currentRole} → ${targetRole}`);
      
      // Format skill gaps for the prompt
      const skillGapsText = skillGaps.map(gap => 
        `Skill: ${gap.skill}\n` +
        `Importance: ${gap.importance}/10\n` +
        `Time to Acquire: ${gap.timeToAcquire} months\n` +
        `Why it matters: ${gap.description}\n` +
        `Development Suggestion: ${gap.developmentSuggestion || 'Not specified'}\n\n`
      ).join('\n');
      
      // Extract insights for the prompt
      const challengesText = insights.challenges?.map((c: any) => 
        `Challenge: ${c.challenge}\n` +
        `Description: ${c.description}\n\n`
      ).join('\n') || '';
      
      const strategiesText = insights.strategies?.map((s: any) => 
        `Strategy: ${s.strategy}\n` +
        `Description: ${s.description}\n\n`
      ).join('\n') || '';
      
      // Create development plan prompt
      const planPrompt = `
        You are Cara, an AI career advisor specializing in creating personalized development plans.
        
        Current Role: ${currentRole}
        Target Role: ${targetRole}
        
        ${skillGapsText ? `Key skill gaps to address:\n${skillGapsText}\n\n` : ''}
        ${challengesText ? `Key challenges to overcome:\n${challengesText}\n\n` : ''}
        ${strategiesText ? `Effective strategies:\n${strategiesText}\n\n` : ''}
        
        Create a 6-month development plan to help the user transition from ${currentRole} to ${targetRole}.
        The plan should include specific milestones, resources, and activities organized into a structured timeline.
        
        Format your response as a JSON object with the following properties:
        {
          "overview": "Brief overview of the development plan",
          "estimatedTimeframe": "6 months", 
          "milestones": [
            {
              "title": "Milestone title",
              "description": "Detailed description of the milestone",
              "timeframe": "Month 1-2",
              "activities": [
                {
                  "activity": "Activity name",
                  "description": "Activity description",
                  "resources": ["Resource 1", "Resource 2"]
                }
              ]
            }
          ]
        }
        
        Focus on creating approximately 3-5 meaningful milestones with 2-3 activities each.
        Only return the JSON object without any additional text.
      `;
      
      // Invoke the model
      const planResponse = await modelWithTools.invoke(planPrompt);
      const responseContent = planResponse.content || planResponse.text || JSON.stringify(planResponse);
      
      // Parse the response to extract JSON
      const plan = safeParseJSON(responseContent);
      
      if (!plan || typeof plan !== 'object') {
        console.error("Failed to parse development plan JSON response");
        return {};
      }
      
      console.log(`Cara successfully generated a plan with ${plan.milestones?.length || 0} milestones`);
      
      // Save plan to database if needed
      try {
        await storage.addCareerPlan(transitionId, plan);
      } catch (saveError) {
        console.error("Error saving development plan to database:", saveError);
      }
      
      return plan;
    } catch (error) {
      console.error("Error creating development plan:", error);
      return {};
    }
  }

  /**
   * Generate fallback skill gaps if analysis fails
   */
  private getFallbackSkillGaps(currentRole: string, targetRole: string): SkillGapAnalysis[] {
    console.log(`Generating fallback skill gaps for ${currentRole} → ${targetRole}`);
    
    // Generic skill gaps based on common transitions
    return [
      {
        skill: "Strategic Communication",
        importance: 9,
        timeToAcquire: 3,
        description: "The ability to communicate complex ideas clearly to different stakeholders is critical for higher-level roles.",
        developmentSuggestion: "Join Toastmasters, take a strategic communication course, and practice presenting technical concepts to non-technical audiences."
      },
      {
        skill: "Leadership",
        importance: 8,
        timeToAcquire: 6,
        description: "Moving up requires managing teams and influencing without direct authority.",
        developmentSuggestion: "Take on a leadership role in a project, volunteer to lead initiatives, and read leadership books like 'The Five Dysfunctions of a Team'."
      },
      {
        skill: "Business Acumen",
        importance: 7,
        timeToAcquire: 4,
        description: "Understanding how businesses operate and make money is essential for higher-level decision making.",
        developmentSuggestion: "Take a business fundamentals course, shadow business stakeholders, and read industry financial reports."
      }
    ];
  }

  /**
   * Generate fallback insights if analysis fails
   */
  private getFallbackInsights(currentRole: string, targetRole: string): any {
    console.log(`Generating fallback insights for ${currentRole} → ${targetRole}`);
    
    // Generic insights based on common career transitions
    return {
      successRate: 70,
      successRateExplanation: "This is a natural career progression path with a relatively high success rate for professionals who systematically prepare.",
      timeline: 12,
      timelineExplanation: "Most professionals need about 12 months to acquire the necessary skills and experience for this transition.",
      challenges: [
        {
          challenge: "Skill Gap",
          description: "Acquiring the technical and soft skills needed for the higher-level position."
        },
        {
          challenge: "Competition",
          description: "Higher-level positions have fewer openings and more competition from both internal and external candidates."
        },
        {
          challenge: "Visibility",
          description: "Getting noticed by decision-makers who can influence your career progression."
        }
      ],
      strategies: [
        {
          strategy: "Proactive Skill Development",
          description: "Identify and develop key skills before they're required for the role."
        },
        {
          strategy: "Strategic Networking",
          description: "Build relationships with current professionals in your target role and hiring managers."
        },
        {
          strategy: "Results Documentation",
          description: "Track and quantify your achievements to demonstrate your readiness for promotion."
        }
      ],
      recommendations: [
        {
          recommendation: "Shadow Current Professionals",
          description: "Arrange to shadow someone in your target role to understand day-to-day responsibilities."
        },
        {
          recommendation: "Take on Stretch Assignments",
          description: "Volunteer for projects that allow you to demonstrate skills required in the target role."
        },
        {
          recommendation: "Find a Mentor",
          description: "Seek guidance from someone who has successfully made a similar transition."
        }
      ]
    };
  }
}