/**
 * Cara Plan-Execute Agent
 * 
 * This file implements Cara using LangGraph's Plan-and-Execute pattern.
 * The agent first plans the career transition analysis steps, then executes them one by one.
 */
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
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

// Define the state schema for the Plan-Execute agent
const CaraPlanExecuteState = Annotation.Root({
  input: Annotation<{
    currentRole: string;
    targetRole: string;
    transitionId: number;
    existingSkills: string[];
  }>({
    reducer: (x, y) => y ?? x
  }),
  plan: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? []
  }),
  pastSteps: Annotation<[string, string][]>({
    reducer: (x, y) => x.concat(y)
  }),
  skillGaps: Annotation<SkillGapAnalysis[]>({
    reducer: (x, y) => y ?? x ?? []
  }),
  insights: Annotation<any>({
    reducer: (x, y) => y ?? x ?? {}
  }),
  scrapedCount: Annotation<number>({
    reducer: (x, y) => y ?? x ?? 0
  }),
  response: Annotation<string>({
    reducer: (x, y) => y ?? x ?? ""
  })
});

/**
 * Career transition analysis using a Plan-and-Execute agent pattern
 */
export class CaraPlanExecuteAgent {
  private model: ChatOpenAI;
  private plannerModel: ChatOpenAI;
  private tools: TavilySearchResults[];
  private agentExecutor: any;
  private workflow: any;

  constructor() {
    // Initialize the main model
    this.model = new ChatOpenAI({
      temperature: 0.7,
      modelName: "gpt-4-turbo-preview", // Use a robust model for analysis tasks
      streaming: false,
    });

    // Initialize the planner model
    this.plannerModel = new ChatOpenAI({
      temperature: 0.2, // Lower temperature for more consistent planning
      modelName: "gpt-4-0125-preview", // Use latest model for planning
    });

    // Initialize the search tool
    this.tools = [
      new TavilySearchResults({ 
        maxResults: 5,
        apiKey: process.env.TAVILY_API_KEY 
      })
    ];

    // Create execution agent with tools
    this.agentExecutor = createReactAgent({
      llm: this.model,
      tools: this.tools,
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
    console.log(`Starting Plan-Execute analysis: ${currentRole} → ${targetRole}`);

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
        }
      };

      // Run the workflow with tracing
      const config: RunnableConfig = { 
        recursionLimit: 50,
        tags: ["cara-plan-execute"] 
      };

      // Initialize variables to store results
      let skillGaps: SkillGapAnalysis[] = [];
      let insights: any = {};
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
        } else if (event.replan) {
          if (event.replan.response) {
            console.log("Analysis complete:", event.replan.response.substring(0, 100) + "...");
          } else if (event.replan.plan) {
            console.log("Plan updated:", event.replan.plan);
          }
        }

        // Capture the results
        if (event.skillGapCollector) {
          skillGaps = event.skillGapCollector.skillGaps;
          console.log(`Collected ${skillGaps.length} skill gaps`);
        }
        if (event.insightCollector) {
          insights = event.insightCollector.insights;
          console.log("Insights collected");
        }
        if (event.dataCollector) {
          scrapedCount = event.dataCollector.scrapedCount;
          console.log(`Scraped count updated to ${scrapedCount}`);
        }
      }

      return {
        skillGaps,
        insights,
        scrapedCount
      };
    } catch (error) {
      console.error("Error in Plan-Execute analysis:", error);
      throw error;
    }
  }

  /**
   * Create the Plan-Execute workflow
   */
  private _createWorkflow() {
    const workflow = new StateGraph(CaraPlanExecuteState)
      .addNode("planner", this._createPlannerNode())
      .addNode("agent", this._createAgentNode())
      .addNode("replan", this._createReplanNode())
      .addNode("skillGapCollector", this._createSkillGapCollectorNode())
      .addNode("insightCollector", this._createInsightCollectorNode())
      .addNode("dataCollector", this._createDataCollectorNode())
      .addEdge(START, "planner")
      .addEdge("planner", "agent")
      .addEdge("agent", "replan")
      .addConditionalEdges("replan", this._shouldEnd, {
        true: "skillGapCollector",
        false: "agent",
      })
      .addEdge("skillGapCollector", "insightCollector")
      .addEdge("insightCollector", "dataCollector")
      .addEdge("dataCollector", END);

    return workflow.compile();
  }

  /**
   * Create the planner node
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
    const plannerPrompt = `For the given career transition, come up with a detailed step-by-step plan for analysis.
This plan should involve individual tasks that, if executed correctly, will yield a comprehensive career transition analysis.
Focus on analyzing skill gaps, finding insights, and creating an actionable development plan.

The career transition is from {input.currentRole} to {input.targetRole}.
The person has these existing skills: {input.existingSkills}.

Create a plan with 4-6 steps that comprehensively analyzes this career transition.`;

    // Use a structured output to ensure the plan is properly formatted
    return async (state: typeof CaraPlanExecuteState.State): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Creating career transition analysis plan");
      
      try {
        const plannerWithSchema = this.plannerModel.withStructuredOutput(planFunction);
        
        // Format the prompt with variables
        const formattedPrompt = plannerPrompt
          .replace('{input.currentRole}', state.input.currentRole)
          .replace('{input.targetRole}', state.input.targetRole)
          .replace('{input.existingSkills}', state.input.existingSkills.join(", ") || "None");
        
        const result = await plannerWithSchema.invoke(formattedPrompt);

        return { plan: result.steps };
      } catch (error) {
        console.error("Error in planner node:", error);
        // Fallback plan if there's an error
        return { 
          plan: [
            "Search for career transition stories from professionals who transitioned from similar roles",
            "Analyze skill requirements for both roles to identify gaps",
            "Extract key observations and challenges from transition stories",
            "Create a personalized development plan based on skill gaps",
            "Identify learning resources for each required skill"
          ]
        };
      }
    };
  }

  /**
   * Create the agent execution node
   */
  private _createAgentNode() {
    return async (
      state: typeof CaraPlanExecuteState.State,
      config?: RunnableConfig,
    ): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      const task = state.plan[0];
      console.log(`Executing step: ${task}`);

      try {
        // Customize input based on the current state
        let taskPrompt = task;
        if (state.pastSteps.length > 0) {
          // Add context from previous steps
          taskPrompt += `\n\nContext from previous steps:`;
          state.pastSteps.forEach(([step, result]) => {
            taskPrompt += `\n- ${step}: ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`;
          });
        }

        // Add transition details
        taskPrompt += `\n\nCareer Transition: ${state.input.currentRole} → ${state.input.targetRole}`;
        
        // Add existing skills if available
        if (state.input.existingSkills && state.input.existingSkills.length > 0) {
          taskPrompt += `\nExisting Skills: ${state.input.existingSkills.join(", ")}`;
        }
        
        const input = {
          messages: [new HumanMessage(taskPrompt)],
        };
        
        const { messages } = await this.agentExecutor.invoke(input, config);
        const result = messages[messages.length - 1].content.toString();
        
        // Store results in the database if appropriate
        await this._storeResultsIfNeeded(task, result, state);
        
        return {
          pastSteps: [[task, result]],
          plan: state.plan.slice(1),
        };
      } catch (error) {
        console.error("Error executing step:", error);
        // Return a generic result to avoid breaking the workflow
        return {
          pastSteps: [[task, "Error occurred during execution. Moving to next step."]],
          plan: state.plan.slice(1),
        };
      }
    };
  }

  /**
   * Store results in the database as needed
   */
  private async _storeResultsIfNeeded(task: string, result: string, state: typeof CaraPlanExecuteState.State) {
    const { transitionId } = state.input;
    
    try {
      // Handle scraped data
      if (task.toLowerCase().includes("stories") || task.toLowerCase().includes("search")) {
        try {
          // Try to extract stories from the result
          const storiesMatch = result.match(/\[\s*\{.*\}\s*\]/s);
          if (storiesMatch) {
            const stories = JSON.parse(storiesMatch[0]);
            if (Array.isArray(stories)) {
              for (const story of stories) {
                await storage.createScrapedData({
                  transitionId,
                  source: story.source || "Tavily Search",
                  content: story.content || story.text || "",
                  url: story.url || null,
                  postDate: story.date || null,
                  skillsExtracted: []
                });
              }
            }
          }
        } catch (e) {
          console.error("Error storing scraped data:", e);
        }
      }
      
      // Handle insights
      if (task.toLowerCase().includes("observat") || task.toLowerCase().includes("insight") || task.toLowerCase().includes("challeng")) {
        try {
          const insightTypes = {
            observation: ["observation", "key point", "insight"],
            challenge: ["challenge", "difficulty", "obstacle"],
            story: ["story", "narrative", "experience"]
          };
          
          // Simple regex-based extraction
          for (const [type, keywords] of Object.entries(insightTypes)) {
            for (const keyword of keywords) {
              const pattern = new RegExp(`(${keyword}[^:.]*[:.]\\s*)([^\\n\\r.]+)`, 'gi');
              let match;
              while ((match = pattern.exec(result)) !== null) {
                const content = match[2].trim();
                if (content.length > 10) { // Avoid short/empty matches
                  await storage.createInsight({
                    transitionId,
                    type: type as "observation" | "challenge" | "story",
                    content,
                    source: null,
                    date: null,
                    experienceYears: null
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error("Error storing insights:", e);
        }
      }
      
      // Handle skill gaps
      if (task.toLowerCase().includes("skill") && (task.toLowerCase().includes("gap") || task.toLowerCase().includes("requir"))) {
        try {
          // Try to extract skill gaps from the result
          const skillsMatch = result.match(/\[\s*\{.*\}\s*\]/s);
          if (skillsMatch) {
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
          }
        } catch (e) {
          console.error("Error storing skill gaps:", e);
        }
      }
      
      // Handle development plan
      if (task.toLowerCase().includes("plan") || task.toLowerCase().includes("milestone")) {
        try {
          // First create a plan
          const plan = await storage.createPlan({
            transitionId
          });
          
          // Try to extract milestones from the result
          const milestonesMatch = result.match(/\[\s*\{.*\}\s*\]/s);
          if (milestonesMatch) {
            const milestones = JSON.parse(milestonesMatch[0]);
            if (Array.isArray(milestones)) {
              for (let i = 0; i < milestones.length; i++) {
                const m = milestones[i];
                if (m.title) {
                  const milestone = await storage.createMilestone({
                    planId: plan.id,
                    title: m.title,
                    description: m.description || null,
                    priority: m.priority || "Medium",
                    durationWeeks: m.durationWeeks || 2,
                    order: i + 1,
                    progress: 0
                  });
                  
                  // Add resources if available
                  if (m.resources && Array.isArray(m.resources)) {
                    for (const r of m.resources) {
                      if (r.title && r.url) {
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
            }
          }
        } catch (e) {
          console.error("Error storing plan:", e);
        }
      }
    } catch (e) {
      console.error("Error in _storeResultsIfNeeded:", e);
    }
  }

  /**
   * Create the replanner node
   */
  private _createReplanNode() {
    // Define the response function
    const responseSchema = zodToJsonSchema(
      z.object({
        response: z.string().describe("Final analysis response"),
      }),
    );
    const responseTool = {
      type: "function",
      function: {
        name: "response",
        description: "Final analysis response",
        parameters: responseSchema,
      },
    };
    
    // Define the plan function
    const planSchema = zodToJsonSchema(
      z.object({
        steps: z
          .array(z.string())
          .describe("remaining steps to follow"),
      }),
    );
    const planTool = {
      type: "function",
      function: {
        name: "plan",
        description: "Updated plan for remaining steps",
        parameters: planSchema,
      },
    };
    
    // Create the replan prompt
    const replanPrompt = `Evaluate the career transition analysis progress so far and decide on next steps.

Initial transition: {input.currentRole} to {input.targetRole}

Original plan:
{originalPlan}

Steps completed so far:
{completedSteps}

If all necessary analysis steps have been completed, summarize the findings using the 'response' function.
If more steps are needed, provide an updated plan of the REMAINING steps using the 'plan' function.`;

    const parser = new JsonOutputToolsParser();
    
    return async (state: typeof CaraPlanExecuteState.State): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Evaluating progress and replanning");
      
      try {
        // Format the input for the replan prompt
        const originalPlan = state.plan.join("\n");
        const completedSteps = state.pastSteps
          .map(([step, result]) => `${step}:\n${result.substring(0, 200)}${result.length > 200 ? '...' : ''}`)
          .join("\n\n");
        
        // Invoke the replan tool
        const llmWithTools = this.model.bindTools([planTool, responseTool]);
        
        // Format the prompt with variables
        const formattedPrompt = replanPrompt
          .replace('{input.currentRole}', state.input.currentRole)
          .replace('{input.targetRole}', state.input.targetRole)
          .replace('{originalPlan}', originalPlan)
          .replace('{completedSteps}', completedSteps);
        
        const llmResponse = await llmWithTools.invoke(formattedPrompt);
        const replannedOutput = parser.parse(llmResponse);
        
        const toolCall = replannedOutput[0];
        
        // Either provide a final response or update the plan
        if (toolCall.type === "response") {
          return { response: toolCall.args?.response };
        } else if (toolCall.type === "plan") {
          return { plan: toolCall.args?.steps };
        } else {
          console.error("Unexpected tool call type:", toolCall.type);
          return {}; // No change to state
        }
      } catch (error) {
        console.error("Error in replan node:", error);
        // If there are no more steps, assume we're done
        if (state.plan.length === 0) {
          return { 
            response: "Career transition analysis complete. Review the collected data for insights."
          };
        }
        // Otherwise continue with existing plan
        return {};
      }
    };
  }

  /**
   * Determine if the workflow should end
   */
  private _shouldEnd(state: typeof CaraPlanExecuteState.State) {
    return state.response ? "true" : "false";
  }

  /**
   * Create a node to extract and collect skill gaps
   */
  private _createSkillGapCollectorNode() {
    return async (state: typeof CaraPlanExecuteState.State): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Collecting skill gaps from database");
      
      try {
        // Retrieve skill gaps from the database
        const skillGaps = await storage.getSkillGapsByTransitionId(state.input.transitionId);
        
        // If no skill gaps in DB, extract from steps
        if (!skillGaps || skillGaps.length === 0) {
          console.log("No skill gaps in database, extracting from analysis results");
          
          // Look for skill gap information in the past steps
          const skillStep = state.pastSteps.find(([step]) => 
            step.toLowerCase().includes("skill") && 
            (step.toLowerCase().includes("gap") || step.toLowerCase().includes("requir"))
          );
          
          if (skillStep) {
            try {
              // Try to extract skill data
              const [_, result] = skillStep;
              const skillsMatch = result.match(/\[\s*\{.*\}\s*\]/s);
              
              if (skillsMatch) {
                const extractedSkills = JSON.parse(skillsMatch[0]);
                
                if (Array.isArray(extractedSkills) && extractedSkills.length > 0) {
                  // Format skills to match SkillGapAnalysis
                  const formattedSkills: SkillGapAnalysis[] = extractedSkills.map(skill => ({
                    skillName: skill.skillName || skill.skill || "",
                    gapLevel: skill.gapLevel || "Medium",
                    confidenceScore: skill.confidenceScore || 80,
                    mentionCount: skill.mentionCount || 1,
                    contextSummary: skill.contextSummary || skill.description || ""
                  }));
                  
                  return { skillGaps: formattedSkills };
                }
              }
            } catch (e) {
              console.error("Error extracting skills from results:", e);
            }
          }
          
          // If we couldn't extract skills, return empty array
          return { skillGaps: [] };
        }
        
        // Format the retrieved skill gaps
        const formattedSkillGaps: SkillGapAnalysis[] = skillGaps.map(gap => ({
          skillName: gap.skillName,
          gapLevel: gap.gapLevel as "Low" | "Medium" | "High",
          confidenceScore: gap.confidenceScore || 80,
          mentionCount: gap.mentionCount || 1,
          contextSummary: ""
        }));
        
        return { skillGaps: formattedSkillGaps };
      } catch (error) {
        console.error("Error in skill gap collector:", error);
        return { skillGaps: [] };
      }
    };
  }

  /**
   * Create a node to extract and collect insights
   */
  private _createInsightCollectorNode() {
    return async (state: typeof CaraPlanExecuteState.State): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Collecting insights from database");
      
      try {
        // Retrieve insights from the database
        const dbInsights = await storage.getInsightsByTransitionId(state.input.transitionId);
        
        // Format the insights
        const formattedInsights = {
          keyObservations: dbInsights
            .filter(insight => insight.type === "observation")
            .map(insight => insight.content),
          commonChallenges: dbInsights
            .filter(insight => insight.type === "challenge")
            .map(insight => insight.content),
          successStories: dbInsights
            .filter(insight => insight.type === "story")
            .map(insight => insight.content)
        };
        
        // If no insights in DB, try to extract from steps
        if (formattedInsights.keyObservations.length === 0 && 
            formattedInsights.commonChallenges.length === 0) {
          console.log("No insights in database, extracting from analysis results");
          
          // Look for insight information in the past steps
          const insightStep = state.pastSteps.find(([step]) => 
            step.toLowerCase().includes("insight") || 
            step.toLowerCase().includes("observation") ||
            step.toLowerCase().includes("challenge")
          );
          
          if (insightStep) {
            try {
              const insightText = insightStep[1];
              
              // Extract observations using regex
              const observations: string[] = [];
              const obsRegex = /(?:observation|key point|insight)[^:.]*[:.]?\s*([^.!?]+[.!?])/gi;
              let obsMatch;
              while ((obsMatch = obsRegex.exec(insightText)) !== null) {
                if (obsMatch[1] && obsMatch[1].trim().length > 5) {
                  observations.push(obsMatch[1].trim());
                }
              }
              
              // Extract challenges using regex
              const challenges: string[] = [];
              const chalRegex = /(?:challenge|difficulty|hurdle|obstacle)[^:.]*[:.]?\s*([^.!?]+[.!?])/gi;
              let chalMatch;
              while ((chalMatch = chalRegex.exec(insightText)) !== null) {
                if (chalMatch[1] && chalMatch[1].trim().length > 5) {
                  challenges.push(chalMatch[1].trim());
                }
              }
              
              // Add any extracted insights
              if (observations.length > 0) {
                formattedInsights.keyObservations = observations;
              }
              if (challenges.length > 0) {
                formattedInsights.commonChallenges = challenges;
              }
            } catch (e) {
              console.error("Error extracting insights from results:", e);
            }
          }
        }
        
        return { insights: formattedInsights };
      } catch (error) {
        console.error("Error in insight collector:", error);
        return { 
          insights: { 
            keyObservations: [], 
            commonChallenges: [],
            successStories: []
          } 
        };
      }
    };
  }

  /**
   * Create a node to update the scraped count
   */
  private _createDataCollectorNode() {
    return async (state: typeof CaraPlanExecuteState.State): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Collecting data counts");
      
      try {
        // Retrieve scraped data count from the database
        const scrapedData = await storage.getScrapedDataByTransitionId(state.input.transitionId);
        const count = scrapedData.length;
        
        // Mark the transition as complete
        await storage.updateTransitionStatus(state.input.transitionId, true);
        
        return { scrapedCount: count };
      } catch (error) {
        console.error("Error in data collector:", error);
        return { scrapedCount: 0 };
      }
    };
  }
}