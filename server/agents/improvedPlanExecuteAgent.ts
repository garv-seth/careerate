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
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { StateGraph, END, START } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { RunnableConfig } from "@langchain/core/runnables";
import { storage } from "../storage";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SkillGapAnalysis } from "./langGraphAgent";
import { CaraAnalysisResult } from "./caraAgent";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { CareerTransitionSearch, SkillGapSearch, LearningResourceSearch } from "../tools/tavilySearch";
import { StructuredTool } from "@langchain/core/tools";

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
  private mainModel: ChatOpenAI;
  private plannerModel: ChatOpenAI;
  private searchAgent: any;
  private searchTools: StructuredTool[];
  private workflow: any;

  constructor() {
    // Initialize the main model
    this.mainModel = new ChatOpenAI({
      temperature: 0.2,
      modelName: "gpt-4-turbo-preview",
      streaming: false,
    });

    // Initialize the planner model
    this.plannerModel = new ChatOpenAI({
      temperature: 0.1, // Lower temperature for more consistent planning
      modelName: "gpt-4-turbo-preview",
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
          const step = event.agent.pastSteps[event.agent.pastSteps.length - 1];
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
          const lastMessage = state.pastSteps[state.pastSteps.length - 1];
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
        const plannerWithSchema = this.plannerModel.withStructuredOutput(planFunction);
        
        // Format the prompt with variables
        const formattedPrompt = plannerPrompt
          .replace(/{input.currentRole}/g, state.input.currentRole)
          .replace(/{input.targetRole}/g, state.input.targetRole);
        
        const result = await plannerWithSchema.invoke(formattedPrompt);

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
      const task = state.plan[0];
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
        
        // Add context from previous steps
        if (state.pastSteps.length > 0) {
          taskPrompt += `Context from previous steps:\n`;
          state.pastSteps.forEach(([step, result]) => {
            // Include a shortened version of the previous results to save on context
            const shortResult = result.length > 500 
              ? result.substring(0, 500) + '...' 
              : result;
            taskPrompt += `- ${step}:\n${shortResult}\n\n`;
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
        // Extract the task from the current step
        const currentTask = state.plan[0];
        
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
        const currentTask = state.plan[0];
        
        // Return a generic result to avoid breaking the workflow
        return {
          pastSteps: [[currentTask, "Search agent encountered an error. Unable to retrieve search results. Moving to next step."]],
          plan: state.plan.slice(1),
          agentType: "planner"
        };
      }
    };
  }

  /**
   * Process search results to extract stories
   */
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
      // Try to extract structured stories from the search results
      const storyMatch = searchResults.match(/\[.*?\]/s) || searchResults.match(/\{.*?\}/s);
      
      if (storyMatch) {
        // Try to parse as JSON array or object
        try {
          const parsedStories = JSON.parse(storyMatch[0]);
          if (Array.isArray(parsedStories)) {
            // We have an array of stories
            for (const story of parsedStories) {
              if (story.content || story.text) {
                const newStory = {
                  source: story.source || story.title || "Search Result",
                  content: story.content || story.text || "",
                  url: story.url || "",
                  date: story.date || new Date().toISOString().split('T')[0]
                };
                
                stories.push(newStory);
                
                // Also save to the database
                await storage.createScrapedData({
                  transitionId: state.input.transitionId,
                  source: newStory.source,
                  content: newStory.content,
                  url: newStory.url || null,
                  postDate: newStory.date || null,
                  skillsExtracted: []
                });
              }
            }
          } else if (typeof parsedStories === 'object') {
            // We have a single story object
            const story = parsedStories;
            if (story.content || story.text) {
              const newStory = {
                source: story.source || story.title || "Search Result",
                content: story.content || story.text || "",
                url: story.url || "",
                date: story.date || new Date().toISOString().split('T')[0]
              };
              
              stories.push(newStory);
              
              // Also save to the database
              await storage.createScrapedData({
                transitionId: state.input.transitionId,
                source: newStory.source,
                content: newStory.content,
                url: newStory.url || null,
                postDate: newStory.date || null,
                skillsExtracted: []
              });
            }
          }
        } catch (e) {
          console.error("Error parsing JSON stories:", e);
        }
      }
      
      // If we couldn't parse structured data, try to extract stories using pattern matching
      if (stories.length === 0) {
        // Look for story patterns in the text
        const storyPattern = /(?:Story|Example)\s*\d+:\s*([^]*?)(?=(?:Story|Example)\s*\d+:|$)/gi;
        const forumPostPattern = /(?:Forum Post|Post|Thread).*?:\s*([^]*?)(?=(?:Forum Post|Post|Thread).*?:|$)/gi;
        
        // Try to extract using the story pattern
        let match;
        while ((match = storyPattern.exec(searchResults)) !== null) {
          if (match[1] && match[1].trim().length > 100) { // Ensure it's substantial content
            const story = {
              source: "Extracted Story",
              content: match[1].trim(),
              url: "",
              date: new Date().toISOString().split('T')[0]
            };
            
            stories.push(story);
            
            // Also save to the database
            await storage.createScrapedData({
              transitionId: state.input.transitionId,
              source: story.source,
              content: story.content,
              url: null,
              postDate: story.date,
              skillsExtracted: []
            });
          }
        }
        
        // Try to extract using the forum post pattern
        while ((match = forumPostPattern.exec(searchResults)) !== null) {
          if (match[1] && match[1].trim().length > 100) { // Ensure it's substantial content
            const story = {
              source: "Forum Post",
              content: match[1].trim(),
              url: "",
              date: new Date().toISOString().split('T')[0]
            };
            
            stories.push(story);
            
            // Also save to the database
            await storage.createScrapedData({
              transitionId: state.input.transitionId,
              source: story.source,
              content: story.content,
              url: null,
              postDate: story.date,
              skillsExtracted: []
            });
          }
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
        
        // Also save to the database
        await storage.createScrapedData({
          transitionId: state.input.transitionId,
          source: story.source,
          content: story.content,
          url: null,
          postDate: story.date,
          skillsExtracted: []
        });
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

Update your plan accordingly. If all necessary steps have been completed and you have gathered sufficient information for a comprehensive analysis, respond with the word "COMPLETE" and use the 'response' function.
Otherwise, provide the remaining steps that need to be done to complete the analysis.  
Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.`;

    // Create the parser
    const parser = new JsonOutputToolsParser();

    return async (state: typeof CaraImprovedState.State): Promise<Partial<typeof CaraImprovedState.State>> => {
      console.log("Replanning next steps");
      
      try {
        // Format variables for the prompt
        const currentRole = state.input.currentRole;
        const targetRole = state.input.targetRole;
        const originalPlan = state.plan.concat(state.pastSteps.map(([step]) => step)).join("\n");
        const completedSteps = state.pastSteps
          .map(([step, result]) => `${step}: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`)
          .join("\n\n");
        
        // Format the prompt
        const formattedPrompt = replannerPrompt
          .replace("{currentRole}", currentRole)
          .replace("{targetRole}", targetRole)
          .replace("{originalPlan}", originalPlan)
          .replace("{completedSteps}", completedSteps);
        
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
                return { plan: steps };
              }
            } catch (error) {
              console.error("Error parsing steps:", error);
            }
          }
        }
        
        // If we couldn't parse the output properly, check if the response contained "COMPLETE"
        // This is a fallback mechanism
        const rawResult = await replannerWithTools.invoke(formattedPrompt);
        const resultText = rawResult.content.toString();
        
        if (resultText.includes("COMPLETE")) {
          return { 
            response: "Analysis complete. All necessary information has been gathered.",
          };
        }
        
        // Default: return the existing plan
        return { plan: state.plan };
      } catch (error) {
        console.error("Error in replan node:", error);
        // If an error occurs, return the existing plan to avoid breaking the workflow
        return { plan: state.plan };
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

Format as JSON array with these fields for each skill:
[
  {
    "skillName": "Skill name",
    "gapLevel": "Medium",
    "confidenceScore": 85,
    "mentionCount": 3,
    "contextSummary": "Brief explanation"
  },
  ...
]`;
        
        // Call the model to analyze skill gaps
        const response = await this.mainModel.invoke([
          new SystemMessage("You are an expert skill gap analyzer. Extract skill gaps accurately and format them as JSON."),
          new HumanMessage(skillGapPrompt)
        ]);
        
        // Extract JSON from the response
        const responseText = response.content.toString();
        let skillGaps: SkillGapAnalysis[] = [];
        
        try {
          // Find JSON array in the response
          const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
          if (jsonMatch) {
            const parsedSkills = JSON.parse(jsonMatch[0]);
            
            if (Array.isArray(parsedSkills)) {
              skillGaps = parsedSkills.map(skill => {
                // Store in the database
                storage.createSkillGap({
                  transitionId: state.input.transitionId,
                  skillName: skill.skillName,
                  gapLevel: skill.gapLevel as "Low" | "Medium" | "High",
                  confidenceScore: skill.confidenceScore,
                  mentionCount: skill.mentionCount
                });
                
                return {
                  skillName: skill.skillName,
                  gapLevel: skill.gapLevel as 'Low' | 'Medium' | 'High',
                  confidenceScore: skill.confidenceScore,
                  mentionCount: skill.mentionCount,
                  contextSummary: skill.contextSummary
                };
              });
            }
          }
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

Format as JSON with these fields:
{
  "keyObservations": ["Observation 1", "Observation 2", ...],
  "commonChallenges": ["Challenge 1", "Challenge 2", ...],
  "successFactors": ["Factor 1", "Factor 2", ...],
  "timelineEstimate": "X months/years",
  "successRate": number (0-100)
}`;
        
        // Call the model to extract insights
        const response = await this.mainModel.invoke([
          new SystemMessage("You are an expert at extracting insights from career transition stories. Format your response as JSON."),
          new HumanMessage(insightPrompt)
        ]);
        
        // Extract JSON from the response
        const responseText = response.content.toString();
        let insights = {
          keyObservations: [],
          commonChallenges: [],
          successFactors: [],
          timelineEstimate: "",
          successRate: 0
        };
        
        try {
          // Find JSON object in the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedInsights = JSON.parse(jsonMatch[0]);
            
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

Format as JSON with this structure:
{
  "milestones": [
    {
      "title": "Milestone title",
      "description": "Description",
      "priority": "Medium",
      "durationWeeks": 4,
      "resources": [
        {
          "title": "Resource title",
          "url": "https://example.com",
          "type": "course/book/tutorial"
        }
      ]
    }
  ]
}`;
        
        // Call the model to generate a plan
        const response = await this.mainModel.invoke([
          new SystemMessage("You are an expert career development planner. Create a comprehensive plan and format it as JSON."),
          new HumanMessage(planPrompt)
        ]);
        
        // Extract JSON from the response
        const responseText = response.content.toString();
        let developmentPlan = { milestones: [] };
        
        try {
          // Find JSON object in the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedPlan = JSON.parse(jsonMatch[0]);
            
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