/**
 * Improved Cara Plan-Execute Agent
 * 
 * This file implements an improved version of Cara using LangGraph's Plan-and-Execute pattern.
 * The agent first plans the career transition analysis steps, then executes them one by one.
 * 
 * The key improvements in this implementation:
 * 1. Better structured planning phase that breaks down specific tasks
 * 2. Two-agent system with a Planning agent and a specialized Search agent
 * 3. Better story extraction and context preservation between steps
 * 4. Improved skill gap analysis based on real stories and forum content
 */

/**
 * Helper function to safely create scraped data
 * Ensures that no nulls are passed to source field to avoid database errors
 */
async function safeCreateScrapedData(transitionId: number, story: any) {
  try {
    // Ensure we have valid data for the database
    const safeSource = story.source || "Search Result"; // Ensure source is never null
    const safeContent = story.content || "No content available";
    const safeDate = story.date || new Date().toISOString().split('T')[0];
    
    return await storage.createScrapedData({
      transitionId,
      source: safeSource,
      content: safeContent,
      url: story.url || null,
      postDate: safeDate || null,
      skillsExtracted: []
    });
  } catch (error) {
    console.error("Error saving scraped data to database:", error);
    // Return a basic object to avoid further errors
    return {
      id: 0,
      transitionId,
      source: "Error Saving",
      content: "Failed to save content to database",
      url: null,
      postDate: null,
      skillsExtracted: [],
      createdAt: new Date().toISOString()
    };
  }
}
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { StateGraph, END, START } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { RunnableConfig } from "@langchain/core/runnables";
import { storage } from "../storage";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SkillGapAnalysis } from "./langGraphAgent";
import { CaraAnalysisResult } from "./caraAgent";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { CareerTransitionSearch, SkillGapSearch, LearningResourceSearch } from "../tools/tavilySearch";
import { StructuredTool } from "@langchain/core/tools";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createChatModel, getJsonParser } from "../helpers/modelFactory";

// Define the state schema for the improved Plan-Execute agent
const CaraImprovedState = Annotation.Root({
  // Input parameters
  input: Annotation<{
    currentRole: string;
    targetRole: string;
    transitionId: number;
    existingSkills: string[];
  }>({
    reducer: (x, y) => y ?? x
  }),
  // Plan steps
  plan: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? []
  }),
  // Executed steps
  pastSteps: Annotation<[string, string][]>({
    reducer: (x, y) => x.concat(y)
  }),
  // Transition stories collected from web
  transitionStories: Annotation<Array<{
    source: string;
    content: string;
    url: string;
    date: string;
  }>>({
    reducer: (x, y) => y ?? x ?? []
  }),
  // Skill gaps identified in the analysis
  skillGaps: Annotation<SkillGapAnalysis[]>({
    reducer: (x, y) => y ?? x ?? []
  }),
  // Insights about the transition
  insights: Annotation<{
    keyObservations: string[];
    commonChallenges: string[];
    successFactors: string[];
    timelineEstimate: string;
    successRate: number;
  }>({
    reducer: (x, y) => ({
      ...x,
      ...y,
    })
  }),
  // Detailed development plan
  developmentPlan: Annotation<{
    milestones: Array<{
      title: string;
      description: string;
      priority: "Low" | "Medium" | "High";
      durationWeeks: number;
      resources: Array<{
        title: string;
        url: string;
        type: string;
      }>;
    }>;
  }>({
    reducer: (x, y) => y ?? x ?? { milestones: [] }
  }),
  // Count of scraped items
  scrapedCount: Annotation<number>({
    reducer: (x, y) => y ?? x ?? 0
  }),
  // Final response
  response: Annotation<string>({
    reducer: (x, y) => y ?? x ?? ""
  }),
  // Tracking which agent we're in
  agentType: Annotation<"planner" | "searcher" | "analyzer">({
    reducer: (x, y) => y ?? x ?? "planner"
  }),
  // Messages specifically for the search agent
  searchMessages: Annotation<BaseMessage[]>({
    reducer: (x, y) => y ?? x ?? []
  })
});

/**
 * Improved career transition analysis using a multi-agent Plan-and-Execute pattern
 */
export class ImprovedPlanExecuteAgent {
  private mainModel: BaseChatModel;
  private plannerModel: BaseChatModel;
  private searchAgent: any;
  private searchTools: StructuredTool[];
  private workflow: any;

  constructor() {
    // Initialize the main model using the factory
    this.mainModel = createChatModel({
      temperature: 0.2,
      streaming: false,
    });

    // Initialize the planner model using the factory
    this.plannerModel = createChatModel({
      temperature: 0.1, // Lower temperature for more consistent planning
    });

    // Initialize the specialized search tools
    this.searchTools = [
      new CareerTransitionSearch(),
      new SkillGapSearch(),
      new LearningResourceSearch(),
      new TavilySearchResults({ 
        maxResults: 5,
        apiKey: process.env.TAVILY_API_KEY 
      })
    ];

    // Create specialized search agent
    this.searchAgent = createReactAgent({
      llm: this.mainModel,
      tools: this.searchTools,
    });

    // Create and compile the workflow
    this.workflow = this._createWorkflow();
  }

  /**
   * Main method to analyze a career transition
   */
  async analyzeCareerTransition(
    currentRole: string,
    targetRole: string,
    transitionId: number,
    existingSkills: string[] = []
  ): Promise<CaraAnalysisResult> {
    console.log(`Starting Improved Plan-Execute analysis: ${currentRole} → ${targetRole}`);

    // Clear existing data for this transition to ensure fresh analysis
    await storage.clearTransitionData(transitionId);
    console.log(`Cleared existing data for transition ID: ${transitionId} to ensure fresh analysis`);

    try {
      // Create the input state
      const inputs = {
        input: {
          currentRole,
          targetRole,
          transitionId,
          existingSkills
        },
        insights: {
          keyObservations: [],
          commonChallenges: [],
          successFactors: [],
          timelineEstimate: "",
          successRate: 0
        }
      };

      // Run the workflow with tracing
      const config: RunnableConfig = { 
        recursionLimit: 50,
        tags: ["improved-cara-agent"] 
      };

      // Initialize variables to store results
      let skillGaps: SkillGapAnalysis[] = [];
      let insights: any = {
        keyObservations: [],
        commonChallenges: [],
        successFactors: [],
        timelineEstimate: "",
        successRate: 0
      };
      let scrapedCount = 0;

      // Stream through the events to get progress updates
      for await (const event of await this.workflow.stream(inputs, config)) {
        // Log key events
        if (event.planner) {
          console.log("Plan created:", event.planner.plan);
        } else if (event.agent) {
          const step = event.agent.pastSteps && Array.isArray(event.agent.pastSteps) && event.agent.pastSteps.length > 0 
            ? event.agent.pastSteps[event.agent.pastSteps.length - 1] 
            : null;
          if (step) {
            console.log(`Executed step: ${step[0]}`);
          }
        } else if (event.searchAgent) {
          console.log("Search agent activated");
        } else if (event.storyCollector) {
          console.log(`Collected ${event.storyCollector.transitionStories.length} transition stories`);
          scrapedCount = event.storyCollector.transitionStories.length;
        } else if (event.skillGapCollector) {
          skillGaps = event.skillGapCollector.skillGaps;
          console.log(`Collected ${skillGaps.length} skill gaps`);
        } else if (event.insightCollector) {
          insights = event.insightCollector.insights;
          console.log("Insights collected");
        }
      }

      return {
        skillGaps,
        insights,
        scrapedCount
      };
    } catch (error) {
      console.error("Error in Improved Plan-Execute analysis:", error);
      throw error;
    }
  }

  /**
   * Create the Plan-Execute workflow with multiple specialized agents
   */
  private _createWorkflow() {
    const workflow = new StateGraph(CaraImprovedState)
      // Add planning and execution nodes
      .addNode("planner", this._createPlannerNode())
      .addNode("agent", this._createAgentNode())
      .addNode("searchAgent", this._createSearchAgentNode())
      .addNode("replan", this._createReplanNode())
      // Add processing/collectors
      .addNode("storyCollector", this._createStoryCollectorNode())
      .addNode("skillGapCollector", this._createSkillGapCollectorNode())
      .addNode("insightCollector", this._createInsightCollectorNode())
      .addNode("planCreator", this._createPlanCreatorNode())
      
      // Define the workflow
      .addEdge(START, "planner")
      .addEdge("planner", "agent")
      
      // Route based on agent type
      .addConditionalEdges(
        "agent",
        (state) => {
          const lastMessage = state.pastSteps && Array.isArray(state.pastSteps) && state.pastSteps.length > 0 
            ? state.pastSteps[state.pastSteps.length - 1] 
            : null;
          // If message suggests search is needed, go to search agent
          if (lastMessage && (
              lastMessage[0].toLowerCase().includes("search") || 
              lastMessage[0].toLowerCase().includes("find stories") ||
              lastMessage[0].toLowerCase().includes("gather data")
          )) {
            return "searchAgent";
          }
          return "replan";
        },
        {
          "searchAgent": "searchAgent",
          "replan": "replan"
        }
      )
      
      // From search agent back to replan
      .addEdge("searchAgent", "replan")
      
      // Handle replanning
      .addConditionalEdges("replan", this._shouldEnd, {
        "true": "storyCollector",
        "false": "agent",
      })
      
      // Set up the end sequence
      .addEdge("storyCollector", "skillGapCollector")
      .addEdge("skillGapCollector", "insightCollector")
      .addEdge("insightCollector", "planCreator")
      .addEdge("planCreator", END);

    return workflow.compile();
  }

  /**
   * Create the planner node that creates the career transition analysis plan
   */
  private _createPlannerNode() {
    // Define the plan function
    const planSchema = zodToJsonSchema(
      z.object({
        steps: z
          .array(z.string())
          .describe("different steps to follow, should be in sorted order"),
      }),
    );
    const planFunction = {
      name: "plan",
      description: "This tool is used to plan the steps for career transition analysis",
      parameters: planSchema,
    };

    // Create plan prompt
    const plannerPrompt = `You are an expert career transition planner. For the given career transition from {input.currentRole} to {input.targetRole}, 
create a detailed step-by-step plan for analysis.

This plan should systematically analyze the transition by following this structure:
1. FIRST, gather real stories and experiences (using search) from people who made the transition from {input.currentRole} to {input.targetRole}
2. THEN, analyze skill requirements for both roles to identify gaps
3. THEN, extract key observations, challenges, and success factors from the transition stories
4. THEN, create a personalized development plan with milestones and timelines
5. FINALLY, recommend specific learning resources for each required skill

Break these core steps into more specific, actionable tasks. Each task should be focused, searchable, and lead to concrete insights.
Plan for 4-8 total steps that comprehensively analyze this career transition.`;

    // Use a structured output to ensure the plan is properly formatted
    return async (state: typeof CaraImprovedState.State): Promise<Partial<typeof CaraImprovedState.State>> => {
      console.log("Creating detailed career transition analysis plan");
      
      try {
        // Create the plan schema using zod
        const planSchema = z.object({
          steps: z.array(z.string())
            .describe("different steps to follow, should be in sorted order")
        });
        
        // Get the appropriate parser based on the current provider
        const parser = getJsonParser(planSchema);
        
        // Format the prompt with variables
        const formattedPrompt = plannerPrompt
          .replace(/{input.currentRole}/g, state.input.currentRole)
          .replace(/{input.targetRole}/g, state.input.targetRole);
        
        // Add format instructions for the parser
        const promptWithInstructions = `${formattedPrompt}\n\n${parser.getFormatInstructions()}`;
        
        // Run the model and parse the output
        const response = await this.plannerModel.invoke(promptWithInstructions);
        const result = await parser.parse(response.content.toString());

        return { 
          plan: result.steps,
          agentType: "planner"
        };
      } catch (error) {
        console.error("Error in planner node:", error);
        // Fallback plan if there's an error
        return { 
          plan: [
            `Search for detailed stories and experiences from professionals who transitioned from ${state.input.currentRole} to ${state.input.targetRole}`,
            `Gather forum posts and discussions about the challenges faced during this transition`,
            `Analyze skill requirements for ${state.input.targetRole} compared to ${state.input.currentRole}`,
            `Identify key skill gaps that need to be addressed`,
            `Extract common obstacles and success factors from transition stories`,
            `Create a detailed development plan with milestones`,
            `Find specific learning resources for each required skill`
          ],
          agentType: "planner"
        };
      }
    };
  }

  /**
   * Create the agent execution node that processes each step of the plan
   */
  private _createAgentNode() {
    return async (
      state: typeof CaraImprovedState.State,
      config?: RunnableConfig,
    ): Promise<Partial<typeof CaraImprovedState.State>> => {
      // Safely get the first task or use a default one if plan is undefined or empty
      const task = state.plan && Array.isArray(state.plan) && state.plan.length > 0 
        ? state.plan[0] 
        : "Analyze career transition requirements";
      console.log(`Executing plan step: ${task}`);

      try {
        // Customize input based on the current state
        let taskPrompt = `Task: ${task}\n\n`;
        
        // Add transition details
        taskPrompt += `Career Transition: ${state.input.currentRole} → ${state.input.targetRole}\n\n`;
        
        // Add existing skills if available
        if (state.input.existingSkills && state.input.existingSkills.length > 0) {
          taskPrompt += `Existing Skills: ${state.input.existingSkills.join(", ")}\n\n`;
        }
        
        // Add context from previous steps - with null checks
        if (state.pastSteps && Array.isArray(state.pastSteps) && state.pastSteps.length > 0) {
          taskPrompt += `Context from previous steps:\n`;
          state.pastSteps.forEach(entry => {
            if (Array.isArray(entry) && entry.length === 2) {
              const [step, result] = entry;
              // Include a shortened version of the previous results to save on context
              const shortResult = result && typeof result === 'string' && result.length > 500 
                ? result.substring(0, 500) + '...' 
                : (result || 'No result');
              taskPrompt += `- ${step || 'Step'}:\n${shortResult}\n\n`;
            }
          });
        }
        
        // Add stories if we have them and it's relevant to the task
        if (state.transitionStories && state.transitionStories.length > 0 && 
           (task.toLowerCase().includes("skill") || 
            task.toLowerCase().includes("extract") || 
            task.toLowerCase().includes("analyz"))) {
          
          taskPrompt += `Relevant transition stories (${state.transitionStories.length} stories found):\n`;
          
          // Add a sample of stories to avoid context limit issues
          const samplesToInclude = Math.min(state.transitionStories.length, 3);
          for (let i = 0; i < samplesToInclude; i++) {
            const story = state.transitionStories[i];
            taskPrompt += `[Story ${i+1} from ${story.source}]:\n`;
            // Truncate long stories
            taskPrompt += `${story.content.substring(0, 400)}...\n\n`;
          }
          
          taskPrompt += `(${state.transitionStories.length - samplesToInclude} more stories available but not shown here)\n\n`;
        }
        
        // Determine if we're likely to need search
        const needsSearch = 
          task.toLowerCase().includes("search") || 
          task.toLowerCase().includes("find") || 
          task.toLowerCase().includes("gather") ||
          task.toLowerCase().includes("stories");
        
        // Add special instructions if search is needed
        if (needsSearch) {
          taskPrompt += `IMPORTANT: This task requires finding information from the web. Focus on gathering real experiences from forums, career sites, and professional networks. Be specific about what to search for.`;
          
          // Update agent type to indicate we'll need search
          return {
            pastSteps: [[task, `This step requires search. Directing to search agent to find real transition stories and experiences for ${state.input.currentRole} to ${state.input.targetRole}.`]],
            agentType: "searcher",
            // Prepare search messages
            searchMessages: [
              new SystemMessage(`You are a specialized search agent focused on finding career transition information.
Your goal is to find real stories, experiences, and data about transitioning from ${state.input.currentRole} to ${state.input.targetRole}.
Use the search tools available to you to gather comprehensive information from forums, professional networks, and career sites.
Focus on finding detailed, authentic experiences - not general advice.`),
              new HumanMessage(taskPrompt)
            ]
          };
        }
        
        // For non-search tasks, execute with the main model
        const systemMessage = new SystemMessage(`You are Cara, an expert career transition advisor.
Your task is to analyze career transitions in detail. 
For this specific step, focus on: ${task}

Be thorough, data-driven, and precise. Format your responses clearly with organized sections.
When analyzing skills or creating plans, use numbered or bulleted lists.
If you extract data, format as JSON when possible.

You are analyzing a transition from ${state.input.currentRole} to ${state.input.targetRole}.`);
        
        const response = await this.mainModel.invoke([
          systemMessage, 
          new HumanMessage(taskPrompt)
        ]);
        
        const result = response.content.toString();
        
        // Store results in the database if appropriate
        await this._storeResultsIfNeeded(task, result, state);
        
        return {
          pastSteps: [[task, result]],
          plan: state.plan.slice(1),
          agentType: "planner"
        };
      } catch (error) {
        console.error("Error executing step:", error);
        // Return a generic result to avoid breaking the workflow
        return {
          pastSteps: [[task, "Error occurred during execution. Moving to next step."]],
          plan: state.plan.slice(1),
          agentType: "planner"
        };
      }
    };
  }

  /**
   * Create a specialized search agent node
   */
  private _createSearchAgentNode() {
    return async (
      state: typeof CaraImprovedState.State,
      config?: RunnableConfig,
    ): Promise<Partial<typeof CaraImprovedState.State>> => {
      console.log(`Executing search using specialized search agent`);
      
      try {
        // Extract the task from the current step with null check
        const currentTask = state.plan && Array.isArray(state.plan) && state.plan.length > 0
          ? state.plan[0]
          : "Search for transition stories and experiences";
        
        // Initialize empty array if searchMessages is undefined
        const currentSearchMessages = Array.isArray(state.searchMessages) ? state.searchMessages : [];
        
        // If we don't have search messages prepared, create them
        const searchMessages = currentSearchMessages.length > 0 
          ? currentSearchMessages 
          : [
              new SystemMessage(`You are a specialized search agent focused on finding career transition information.
Your goal is to find real stories, experiences, and data about transitioning from ${state.input.currentRole} to ${state.input.targetRole}.
Use the search tools available to you to gather comprehensive information from forums, professional networks, and career sites.
Focus on finding detailed, authentic experiences - not general advice.`),
              new HumanMessage(`Search for detailed stories and experiences from professionals who transitioned from ${state.input.currentRole} to ${state.input.targetRole}. 
Focus on gathering real-world examples from forums like Reddit, Quora, Blind, and other professional communities.
Collect at least 3-5 detailed transition stories.`)
            ];
        
        // Invoke the search agent
        const { messages } = await this.searchAgent.invoke({
          messages: searchMessages
        }, config);
        
        // Extract the last message as the result
        const result = messages[messages.length - 1].content.toString();
        
        // Store any stories found
        const stories = await this._extractStoriesFromSearchResults(result, state);
        
        return {
          pastSteps: [[currentTask, result]],
          plan: state.plan.slice(1),
          agentType: "planner",
          // Only update transition stories if we found new ones
          ...(stories.length > 0 ? { transitionStories: stories } : {})
        };
      } catch (error) {
        console.error("Error in search agent:", error);
        
        // Get current task with null check
        const currentTask = state.plan && Array.isArray(state.plan) && state.plan.length > 0
          ? state.plan[0]
          : "Search for transition stories and experiences";
        
        // Get next plan steps with null check
        const nextSteps = state.plan && Array.isArray(state.plan) && state.plan.length > 1
          ? state.plan.slice(1)
          : [];
        
        // Return a generic result to avoid breaking the workflow
        return {
          pastSteps: [[currentTask, "Search agent encountered an error. Unable to retrieve search results. Moving to next step."]],
          plan: nextSteps,
          agentType: "planner"
        };
      }
    };
  }

  /**
   * Process search results to extract stories
   */
  /**
   * Helper method to extract stories from text when JSON parsing fails
   * This fallback method uses various regex patterns to find stories
   */
  private _extractStoriesFromText(text: string): Array<{
    source: string;
    content: string;
    url: string;
    date: string;
  }> {
    const stories: Array<{
      source: string;
      content: string;
      url: string;
      date: string;
    }> = [];
    
    try {
      // Pattern for stories that might be labeled as "Story 1", "Example 2", etc.
      const storyPattern = /(?:Story|Example)\s*\d+[:\-]\s*([^]*?)(?=(?:Story|Example)\s*\d+[:\-]|$)/gi;
      
      // Pattern for forum posts or threads
      const forumPostPattern = /(?:Forum Post|Post|Thread|From)[^:]*?:\s*([^]*?)(?=(?:Forum Post|Post|Thread|From)[^:]*?:|$)/gi;
      
      // Pattern for Reddit/Quora/Blind posts
      const platformPostPattern = /(?:Reddit|Quora|Blind|LinkedIn)[^:]*?:\s*([^]*?)(?=(?:Reddit|Quora|Blind|LinkedIn)[^:]*?:|$)/gi;
      
      // Pattern for source: content format
      const sourceContentPattern = /([A-Za-z0-9\s]+(?:Reddit|Quora|Blind|Forum|Post|Thread)):\s*([^]*?)(?=[A-Za-z0-9\s]+(?:Reddit|Quora|Blind|Forum|Post|Thread):|$)/gi;
      
      // Function to add extracted content as a story
      const addStory = (content: string, source = "Extracted Story") => {
        if (content && content.trim().length > 50) { // Ensure it's substantial content
          stories.push({
            source: source,
            content: content.trim(),
            url: "",
            date: new Date().toISOString().split('T')[0]
          });
        }
      };
      
      // Try all patterns
      let match;
      
      // Try story pattern
      while ((match = storyPattern.exec(text)) !== null) {
        addStory(match[1], "Transition Story");
      }
      
      // Try forum post pattern
      while ((match = forumPostPattern.exec(text)) !== null) {
        addStory(match[1], "Forum Post");
      }
      
      // Try platform post pattern
      while ((match = platformPostPattern.exec(text)) !== null) {
        addStory(match[1], match[0].split(':')[0].trim());
      }
      
      // Try source: content pattern
      while ((match = sourceContentPattern.exec(text)) !== null) {
        addStory(match[2], match[1].trim());
      }
      
      // If no stories found with patterns, split by paragraphs and use substantial ones
      if (stories.length === 0) {
        const paragraphs = text.split(/\n\s*\n/);
        for (const paragraph of paragraphs) {
          if (paragraph.trim().length > 150) {
            addStory(paragraph);
          }
        }
      }
      
      return stories;
    } catch (error) {
      console.error("Error extracting stories from text:", error);
      return [];
    }
  }
  
  private async _extractStoriesFromSearchResults(
    searchResults: string, 
    state: typeof CaraImprovedState.State
  ): Promise<Array<{
    source: string;
    content: string;
    url: string;
    date: string;
  }>> {
    const stories: Array<{
      source: string;
      content: string;
      url: string;
      date: string;
    }> = [];
    
    try {
      // First try to extract stories using a more robust JSON extraction
      let parsedStories = null;
      
      // Try different patterns to find JSON objects or arrays
      const jsonPatterns = [
        /\[\s*\{[\s\S]*?\}\s*\]/g,  // Array of objects [{ ... }, { ... }]
        /\{\s*"stories"\s*:\s*\[[\s\S]*?\]\s*\}/g,  // Object with stories array { "stories": [...] }
        /\{\s*"results"\s*:\s*\[[\s\S]*?\]\s*\}/g,  // Object with results array { "results": [...] }
        /\{\s*"posts"\s*:\s*\[[\s\S]*?\]\s*\}/g,    // Object with posts array { "posts": [...] }
        /\[\s*"[^"]*"\s*,\s*"[^"]*"/g,              // Array of strings ["...", "..."]
        /\{[\s\S]*?content[\s\S]*?\}/g,             // Object with content field
        /\{[\s\S]*?text[\s\S]*?\}/g                 // Object with text field
      ];
      
      // Try each pattern to find JSON
      for (const pattern of jsonPatterns) {
        const matches = searchResults.match(pattern);
        if (matches && matches.length > 0) {
          try {
            // Clean the match to handle common issues
            const cleanedMatch = matches[0]
              .replace(/\\n/g, '\n')           // Replace escaped newlines
              .replace(/\\"/g, '"')            // Replace escaped quotes
              .replace(/([{,])\s*(\w+):/g, '$1"$2":')  // Quote unquoted keys
              .replace(/:\s*'([^']*)'/g, ':"$1"')     // Replace single quotes with double quotes
              .replace(/"\s*\n\s*"/g, '" "');         // Fix broken strings across lines
            
            parsedStories = JSON.parse(cleanedMatch);
            console.log("Successfully parsed JSON with pattern:", pattern);
            break;
          } catch (e) {
            console.log("Failed to parse JSON with pattern:", pattern);
          }
        }
      }
      
      // Process the parsedStories if we successfully extracted them
      if (parsedStories) {
        // Handle different formats of parsed stories
        if (Array.isArray(parsedStories)) {
          // We have an array of stories
          for (const story of parsedStories) {
            if (story && (story.content || story.text)) {
              const newStory = {
                source: story.source || story.title || "Search Result",
                content: story.content || story.text || "",
                url: story.url || "",
                date: story.date || new Date().toISOString().split('T')[0]
              };
              
              stories.push(newStory);
              
              // Also save to the database
              await safeCreateScrapedData(state.input.transitionId, newStory);
            }
          }
        } else if (typeof parsedStories === 'object') {
          // Check if it's an object with a stories/results/posts array
          const storyArray = parsedStories.stories || parsedStories.results || parsedStories.posts;
          
          if (Array.isArray(storyArray)) {
            // Process each story in the array
            for (const story of storyArray) {
              if (story && (story.content || story.text)) {
                const newStory = {
                  source: story.source || story.title || "Search Result",
                  content: story.content || story.text || "",
                  url: story.url || "",
                  date: story.date || new Date().toISOString().split('T')[0]
                };
                
                stories.push(newStory);
                
                // Also save to the database
                await safeCreateScrapedData(state.input.transitionId, newStory);
              }
            }
          } else if (parsedStories.content || parsedStories.text) {
            // It's a single story object
            const newStory = {
              source: parsedStories.source || parsedStories.title || "Search Result",
              content: parsedStories.content || parsedStories.text || "",
              url: parsedStories.url || "",
              date: parsedStories.date || new Date().toISOString().split('T')[0]
            };
            
            stories.push(newStory);
            
            // Also save to the database
            await safeCreateScrapedData(state.input.transitionId, newStory);
          }
        }
      }
      
      // If we couldn't parse structured data, try to extract stories using our improved pattern matching
      if (stories.length === 0) {
        // Use our improved text extraction method
        const extractedStories = this._extractStoriesFromText(searchResults);
        
        console.log(`Extracted ${extractedStories.length} stories using text patterns`);
        
        // Process and save each extracted story
        for (const story of extractedStories) {
          stories.push(story);
          
          // Save to the database using our safe method
          await safeCreateScrapedData(state.input.transitionId, story);
        }
      }
      
      // If we still couldn't extract stories, treat the whole result as a single "story"
      if (stories.length === 0 && searchResults.length > 200) {
        const story = {
          source: "Search Summary",
          content: searchResults,
          url: "",
          date: new Date().toISOString().split('T')[0]
        };
        
        stories.push(story);
        
        // Also save to the database using our safe method
        await safeCreateScrapedData(state.input.transitionId, story);
      }
    } catch (error) {
      console.error("Error extracting stories from search results:", error);
    }
    
    return stories;
  }

  /**
   * Create the replan node
   */
  private _createReplanNode() {
    // Define the plan function
    const planSchema = zodToJsonSchema(
      z.object({
        steps: z
          .array(z.string())
          .describe("different steps to follow, should be in sorted order"),
      }),
    );
    const planFunction = {
      name: "plan",
      description: "This tool is used to plan the steps to follow",
      parameters: planSchema,
    };

    // Define the response function for when the plan is complete
    const responseSchema = zodToJsonSchema(
      z.object({
        response: z.string().describe("Response to user."),
      }),
    );
    const responseFunction = {
      name: "response",
      description: "Response to user.",
      parameters: responseSchema,
    };

    // Create the replanner prompt
    const replannerPrompt = `You are an expert career transition advisor.
    
Your objective is to analyze a career transition from {currentRole} to {targetRole}.

Your original plan was:
{originalPlan}

You have already completed these steps:
{completedSteps}

You've spent {iterationCount} iterations on analyzing the transition.

IMPORTANT: Follow these guidelines strictly:
1. Do not repeat steps that have already been completed.
2. Do not repeat the same analysis in different words.
3. If you have already generated observations or analyzed skill gaps, move to the next stage.
4. The workflow should be: gathering transition stories -> analyzing stories for observations -> identifying skill gaps -> creating a detailed trajectory plan with resources
5. After 3 or more iterations on the same type of task, consider that task complete and move on.
6. If you've spent 5 or more iterations total, complete the analysis to avoid getting stuck.

Update your plan accordingly. If all necessary steps have been completed and you have gathered sufficient information for a comprehensive analysis, respond with the word "COMPLETE" and use the 'response' function.
Otherwise, provide the remaining steps that need to be done to complete the analysis.  
Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.`;

    return async (state: typeof CaraImprovedState.State): Promise<Partial<typeof CaraImprovedState.State>> => {
      console.log("Replanning next steps");
      
      try {
        // Count iterations to prevent infinite loops
        const iterationCount = state.pastSteps && Array.isArray(state.pastSteps) ? state.pastSteps.length : 0;
        
        // If we've gone through too many iterations, force completion
        if (iterationCount > 10) {
          console.log("Forcing completion after too many iterations");
          return { 
            response: "Analysis complete. All necessary information has been gathered."
          };
        }
        
        // Check for repeated steps/patterns that indicate a loop
        // Ensure pastSteps exists and is an array before using it
        if (state.pastSteps && Array.isArray(state.pastSteps) && state.pastSteps.length >= 4) {
          const lastSteps = state.pastSteps.slice(-4).map(step => step[0]);
          const uniqueStepTypes = new Set(lastSteps);
          
          // If we're repeating the same 1-2 steps over and over, this is a loop
          if (uniqueStepTypes.size <= 2) {
            console.log("Detected a loop in the execution. Moving to completion.");
            return { 
              response: "Analysis complete. Moving to the final development plan creation."
            };
          }
        }
        
        // Format variables for the prompt
        const currentRole = state.input.currentRole;
        const targetRole = state.input.targetRole;
        
        // Safely handle pastSteps in case it's undefined
        const pastSteps = state.pastSteps && Array.isArray(state.pastSteps) ? state.pastSteps : [];
        
        // Safely handle plan in case it's undefined
        const plan = state.plan && Array.isArray(state.plan) ? state.plan : [];
        
        // Safely create originalPlan and completedSteps
        const originalPlan = plan.concat(pastSteps.map(([step]) => step)).join("\n");
        const completedSteps = pastSteps
          .map(([step, result]) => `${step}: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`)
          .join("\n\n");
        
        // Format the prompt
        const formattedPrompt = replannerPrompt
          .replace("{currentRole}", currentRole)
          .replace("{targetRole}", targetRole)
          .replace("{originalPlan}", originalPlan)
          .replace("{completedSteps}", completedSteps)
          .replace("{iterationCount}", iterationCount.toString());
        
        // Call the model with the tools
        const replannerWithTools = this.plannerModel.bindTools([
          { type: "function", function: planFunction },
          { type: "function", function: responseFunction },
        ]);
        
        // Instead of using the JsonOutputToolsParser which has an issue,
        // we'll parse the result directly from the response
        const result = await replannerWithTools.invoke(formattedPrompt);
        const content = result.content.toString();
        
        // Check for response function call
        if (content.includes("response") && content.includes("function_call")) {
          // Extract the response text
          const responseMatch = content.match(/"response"\s*:\s*"([^"]+)"/);
          if (responseMatch && responseMatch[1]) {
            return { response: responseMatch[1] };
          }
        }
        
        // Check for plan function call
        if (content.includes("plan") && content.includes("function_call")) {
          // Try to extract the steps array
          const stepsMatch = content.match(/"steps"\s*:\s*(\[(?:\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*)\])/);
          if (stepsMatch && stepsMatch[1]) {
            try {
              const steps = JSON.parse(stepsMatch[1]);
              if (Array.isArray(steps) && steps.length > 0) {
                // Limit to only the next step to prevent loops
                return { plan: steps.slice(0, Math.min(steps.length, 2)) };
              }
            } catch (error) {
              console.error("Error parsing steps:", error);
            }
          }
        }
        
        // If we couldn't parse the output properly, check if the response contained "COMPLETE"
        // This is a fallback mechanism
        if (content.includes("COMPLETE")) {
          return { 
            response: "Analysis complete. All necessary information has been gathered.",
          };
        }
        
        // If we've done several iterations already and still haven't parsed a valid plan,
        // move to completion to avoid getting stuck
        if (iterationCount > 5) {
          return { 
            response: "Analysis complete. Moving to the final development plan creation."
          };
        }
        
        // Default: return a simplified plan with just the next logical step based on the workflow
        // This provides a fallback when parsing fails
        if (state.transitionStories.length === 0) {
          return { plan: ["Search for transition stories and experiences"] };
        } else if (state.skillGaps.length === 0) {
          return { plan: ["Analyze skill gaps based on transition stories"] };
        } else {
          return { plan: ["Create a comprehensive development plan with resources"] };
        }
      } catch (error) {
        console.error("Error in replan node:", error);
        // If an error occurs, move to completion if we've done several iterations
        // otherwise return a basic next step
        if (state.pastSteps && Array.isArray(state.pastSteps) && state.pastSteps.length > 5) {
          return { 
            response: "Analysis complete. All necessary information has been gathered."
          };
        }
        return { plan: ["Proceed to the next step of the career transition analysis"] };
      }
    };
  }

  /**
   * Determine if the workflow should end
   */
  private _shouldEnd(state: typeof CaraImprovedState.State) {
    // If we have a response, the plan is complete
    return state.response ? "true" : "false";
  }

  /**
   * Create a node to collect and process transition stories
   */
  private _createStoryCollectorNode() {
    return async (state: typeof CaraImprovedState.State): Promise<Partial<typeof CaraImprovedState.State>> => {
      console.log("Collecting transition stories");
      
      // Get scraped data from the database as well
      const scrapedData = await storage.getScrapedDataByTransitionId(state.input.transitionId);
      
      // Combine with any transition stories already in the state
      const allStories = [
        ...state.transitionStories,
        ...scrapedData.map(item => ({
          source: item.source,
          content: item.content,
          url: item.url || "",
          date: item.postDate || new Date().toISOString().split('T')[0]
        }))
      ];
      
      // Remove duplicates (based on content)
      const uniqueStories = Array.from(
        new Map(allStories.map(item => [item.content, item])).values()
      );
      
      console.log(`Collected ${uniqueStories.length} unique transition stories`);
      
      return {
        transitionStories: uniqueStories,
        scrapedCount: uniqueStories.length
      };
    };
  }

  /**
   * Create a node to extract and collect skill gaps
   */
  private _createSkillGapCollectorNode() {
    return async (state: typeof CaraImprovedState.State): Promise<Partial<typeof CaraImprovedState.State>> => {
      console.log("Extracting skill gaps");
      
      try {
        // Format the transition stories for the model
        const storiesText = state.transitionStories
          .map((story, index) => `Story ${index + 1} from ${story.source}:\n${story.content.substring(0, 300)}...`)
          .join("\n\n");
        
        // Define the schema for skill gaps
        const skillGapSchema = z.array(
          z.object({
            skillName: z.string().describe("Name of the skill"),
            gapLevel: z.enum(["Low", "Medium", "High"]).describe("Level of the skill gap"),
            confidenceScore: z.number().min(0).max(100).describe("Confidence score between 0-100"),
            mentionCount: z.number().min(0).describe("Number of times this skill was mentioned"),
            contextSummary: z.string().describe("Brief explanation of why this skill is important")
          })
        );
        
        // Get the appropriate parser
        const parser = getJsonParser(skillGapSchema);
        
        // Create a prompt to analyze skill gaps
        const skillGapPrompt = `Based on these transition stories and your knowledge, identify key skill gaps for transitioning from ${state.input.currentRole} to ${state.input.targetRole}:
        
Transition Stories:
${storiesText}

Existing Skills:
${state.input.existingSkills.join(", ") || "None provided"}

Please identify the key skills needed for ${state.input.targetRole} role that might be missing or underdeveloped in someone coming from ${state.input.currentRole}.
        
For each skill, provide:
1. Skill name
2. Gap level (Low, Medium, High)
3. Confidence score (0-100)
4. Number of mentions in stories
5. Brief context summary explaining why this skill is important

${parser.getFormatInstructions()}`;
        
        // Call the model to analyze skill gaps
        const response = await this.mainModel.invoke([
          new SystemMessage("You are an expert skill gap analyzer. Extract skill gaps accurately and format them as JSON."),
          new HumanMessage(skillGapPrompt)
        ]);
        
        // Parse the response using our structured parser
        const responseText = response.content.toString();
        let skillGaps: SkillGapAnalysis[] = [];
        
        try {
          const parsedSkills = await parser.parse(responseText);
          
          skillGaps = parsedSkills.map(skill => {
            // Store in the database
            storage.createSkillGap({
              transitionId: state.input.transitionId,
              skillName: skill.skillName,
              gapLevel: skill.gapLevel,
              confidenceScore: skill.confidenceScore,
              mentionCount: skill.mentionCount
            });
            
            return {
              skillName: skill.skillName,
              gapLevel: skill.gapLevel,
              confidenceScore: skill.confidenceScore,
              mentionCount: skill.mentionCount,
              contextSummary: skill.contextSummary
            };
          });
        } catch (error) {
          console.error("Error parsing skill gaps:", error);
        }
        
        return { skillGaps };
      } catch (error) {
        console.error("Error collecting skill gaps:", error);
        return { skillGaps: [] };
      }
    };
  }

  /**
   * Create a node to extract and collect insights
   */
  private _createInsightCollectorNode() {
    return async (state: typeof CaraImprovedState.State): Promise<Partial<typeof CaraImprovedState.State>> => {
      console.log("Extracting insights");
      
      try {
        // Format the transition stories for the model (use a subset to avoid token limits)
        const storiesToUse = state.transitionStories.slice(0, 5);
        const storiesText = storiesToUse
          .map((story, index) => `Story ${index + 1} from ${story.source}:\n${story.content.substring(0, 300)}...`)
          .join("\n\n");
        
        // Format the skill gaps for the model
        const skillGapsText = state.skillGaps
          .map(gap => `${gap.skillName} - ${gap.gapLevel} gap (${gap.mentionCount} mentions): ${gap.contextSummary || ''}`)
          .join("\n");
        
        // Define the schema for insights
        const insightSchema = z.object({
          keyObservations: z.array(z.string())
            .describe("Key observations about the transition process"),
          commonChallenges: z.array(z.string())
            .describe("Common challenges faced during the transition"),
          successFactors: z.array(z.string())
            .describe("Success factors that contributed to successful transitions"),
          timelineEstimate: z.string()
            .describe("Estimated timeline for completing the transition"),
          successRate: z.number().min(0).max(100)
            .describe("Approximate success rate percentage for this specific transition")
        });
        
        // Get the appropriate parser
        const parser = getJsonParser(insightSchema);
        
        // Create a prompt to extract insights
        const insightPrompt = `Based on these transition stories and identified skill gaps, extract key insights about transitioning from ${state.input.currentRole} to ${state.input.targetRole}:
        
Transition Stories:
${storiesText}

Skill Gaps:
${skillGapsText}

Please extract the following insights:
1. Key observations about the transition process
2. Common challenges faced during the transition
3. Success factors that contributed to successful transitions
4. Estimated timeline for completing the transition
5. Approximate success rate percentage for this specific transition

${parser.getFormatInstructions()}`;
        
        // Call the model to extract insights
        const response = await this.mainModel.invoke([
          new SystemMessage("You are an expert at extracting insights from career transition stories. Format your response as JSON."),
          new HumanMessage(insightPrompt)
        ]);
        
        // Parse the response using our structured parser
        const responseText = response.content.toString();
        let insights = {
          keyObservations: [],
          commonChallenges: [],
          successFactors: [],
          timelineEstimate: "",
          successRate: 0
        };
        
        try {
          const parsedInsights = await parser.parse(responseText);
          
          insights = {
            keyObservations: parsedInsights.keyObservations || [],
            commonChallenges: parsedInsights.commonChallenges || [],
            successFactors: parsedInsights.successFactors || [],
            timelineEstimate: parsedInsights.timelineEstimate || "",
            successRate: parsedInsights.successRate || 0
          };
          
          // Store insights in the database
          for (const observation of insights.keyObservations) {
            await storage.createInsight({
              transitionId: state.input.transitionId,
              type: "observation",
              content: observation,
              source: null,
              date: null,
              experienceYears: null
            });
          }
          
          for (const challenge of insights.commonChallenges) {
            await storage.createInsight({
              transitionId: state.input.transitionId,
              type: "challenge",
              content: challenge,
              source: null,
              date: null,
              experienceYears: null
            });
          }
        } catch (error) {
          console.error("Error parsing insights:", error);
        }
        
        return { insights };
      } catch (error) {
        console.error("Error collecting insights:", error);
        return { 
          insights: {
            keyObservations: [],
            commonChallenges: [],
            successFactors: [],
            timelineEstimate: "",
            successRate: 0
          }
        };
      }
    };
  }

  /**
   * Create a node to generate a development plan
   */
  private _createPlanCreatorNode() {
    return async (state: typeof CaraImprovedState.State): Promise<Partial<typeof CaraImprovedState.State>> => {
      console.log("Creating development plan");
      
      try {
        // Format the skill gaps for the model
        const skillGapsText = state.skillGaps
          .map(gap => `${gap.skillName} - ${gap.gapLevel} gap (${gap.mentionCount} mentions): ${gap.contextSummary || ''}`)
          .join("\n");
        
        // Define the resource schema
        const resourceSchema = z.object({
          title: z.string().describe("Title of the resource"),
          url: z.string().url().describe("URL of the resource"),
          type: z.string().describe("Type of resource (course, book, tutorial, etc.)")
        });
        
        // Define the milestone schema
        const milestoneSchema = z.object({
          title: z.string().describe("Title of the milestone"),
          description: z.string().describe("Description of the milestone"),
          priority: z.enum(["Low", "Medium", "High"]).describe("Priority level of the milestone"),
          durationWeeks: z.number().min(1).describe("Duration in weeks"),
          resources: z.array(resourceSchema).describe("Learning resources for this milestone")
        });
        
        // Define the plan schema
        const planSchema = z.object({
          milestones: z.array(milestoneSchema).describe("List of milestones in the development plan")
        });
        
        // Get the appropriate parser
        const parser = getJsonParser(planSchema);
        
        // Create a prompt to generate a development plan
        const planPrompt = `Based on the identified skill gaps for transitioning from ${state.input.currentRole} to ${state.input.targetRole}, create a comprehensive development plan:
        
Skill Gaps:
${skillGapsText}

Existing Skills:
${state.input.existingSkills.join(", ") || "None provided"}

Common Challenges:
${state.insights.commonChallenges.join("\n")}

Please create a structured development plan with:
1. 4-6 milestone phases in logical order
2. For each milestone:
   - Clear title
   - Brief description
   - Priority (Low, Medium, High)
   - Duration in weeks
   - 2-3 specific learning resources (title, URL, type)

${parser.getFormatInstructions()}`;
        
        // Call the model to generate a plan
        const response = await this.mainModel.invoke([
          new SystemMessage("You are an expert career development planner. Create a comprehensive plan and format it as JSON."),
          new HumanMessage(planPrompt)
        ]);
        
        // Parse the response using our structured parser
        const responseText = response.content.toString();
        let developmentPlan = { milestones: [] };
        
        try {
          const parsedPlan = await parser.parse(responseText);
          
          if (parsedPlan.milestones && Array.isArray(parsedPlan.milestones)) {
            developmentPlan = parsedPlan;
            
            // Store the plan in the database
            const plan = await storage.createPlan({
              transitionId: state.input.transitionId
            });
            
            // Store milestones and resources
            for (let i = 0; i < developmentPlan.milestones.length; i++) {
              const m = developmentPlan.milestones[i];
              
              const milestone = await storage.createMilestone({
                planId: plan.id,
                title: m.title,
                description: m.description || null,
                priority: m.priority as "Low" | "Medium" | "High",
                durationWeeks: m.durationWeeks || 4,
                order: i + 1,
                progress: 0
              });
              
              // Add resources
              if (m.resources && Array.isArray(m.resources)) {
                for (const r of m.resources) {
                  await storage.createResource({
                    milestoneId: milestone.id,
                    title: r.title,
                    url: r.url,
                    type: r.type || "website"
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error("Error parsing development plan:", error);
        }
        
        // Update transition to mark it as complete
        try {
          await storage.updateTransitionStatus(state.input.transitionId, true);
        } catch (error) {
          console.error("Error updating transition status:", error);
        }
        
        return { developmentPlan };
      } catch (error) {
        console.error("Error creating development plan:", error);
        return { developmentPlan: { milestones: [] } };
      }
    };
  }

  /**
   * Store results in the database as needed
   */
  private async _storeResultsIfNeeded(task: string, result: string, state: typeof CaraImprovedState.State) {
    const { transitionId } = state.input;
    
    try {
      // Store insights if the task is related to insights
      if (
        task.toLowerCase().includes("observation") || 
        task.toLowerCase().includes("insight") || 
        task.toLowerCase().includes("challenge")
      ) {
        try {
          // Try to extract observations or challenges
          const observationMatches = result.match(/(?:Observation|Key point|Insight)[^:.]*[:.]?\s*([^.\n\r]+)/gi);
          const challengeMatches = result.match(/(?:Challenge|Difficulty|Obstacle)[^:.]*[:.]?\s*([^.\n\r]+)/gi);
          
          if (observationMatches) {
            for (const match of observationMatches) {
              const content = match.replace(/(?:Observation|Key point|Insight)[^:.]*[:.]?\s*/i, "").trim();
              if (content.length > 10) {
                await storage.createInsight({
                  transitionId,
                  type: "observation",
                  content,
                  source: null,
                  date: null,
                  experienceYears: null
                });
              }
            }
          }
          
          if (challengeMatches) {
            for (const match of challengeMatches) {
              const content = match.replace(/(?:Challenge|Difficulty|Obstacle)[^:.]*[:.]?\s*/i, "").trim();
              if (content.length > 10) {
                await storage.createInsight({
                  transitionId,
                  type: "challenge",
                  content,
                  source: null,
                  date: null,
                  experienceYears: null
                });
              }
            }
          }
        } catch (error) {
          console.error("Error storing insights:", error);
        }
      }
      
      // Store skill gaps if the task is related to skills
      if (
        task.toLowerCase().includes("skill") && 
        (task.toLowerCase().includes("gap") || task.toLowerCase().includes("requir"))
      ) {
        try {
          // Try to extract skill gaps JSON
          const skillsMatch = result.match(/\[\s*\{.*\}\s*\]/s);
          if (skillsMatch) {
            try {
              const skills = JSON.parse(skillsMatch[0]);
              if (Array.isArray(skills)) {
                for (const skill of skills) {
                  if (skill.skillName) {
                    await storage.createSkillGap({
                      transitionId,
                      skillName: skill.skillName,
                      gapLevel: skill.gapLevel || "Medium",
                      confidenceScore: skill.confidenceScore || null,
                      mentionCount: skill.mentionCount || null
                    });
                  }
                }
              }
            } catch (error) {
              console.error("Error parsing skill JSON:", error);
            }
          } else {
            // Try to extract skills with regex
            const skillMatches = result.match(/[^-.\n\r]*\s*-\s*(?:High|Medium|Low)\s*gap/gi);
            if (skillMatches) {
              for (const match of skillMatches) {
                const [skillName, gapLevel] = match.split('-').map(s => s.trim());
                if (skillName && gapLevel) {
                  const level = gapLevel.toLowerCase().includes("high") ? "High" :
                                gapLevel.toLowerCase().includes("medium") ? "Medium" : "Low";
                  
                  await storage.createSkillGap({
                    transitionId,
                    skillName,
                    gapLevel: level as "Low" | "Medium" | "High",
                    confidenceScore: null,
                    mentionCount: null
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error("Error storing skill gaps:", error);
        }
      }
    } catch (error) {
      console.error("Error in _storeResultsIfNeeded:", error);
    }
  }
}