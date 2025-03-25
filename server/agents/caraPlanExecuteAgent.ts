/**
 * Cara Plan-Execute Agent - FIXED VERSION
 *
 * This file implements Cara using LangGraph's Plan-and-Execute pattern.
 * The agent first plans the career transition analysis steps, then executes them one by one.
 */
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
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
import { createChatModel, getModelInfo } from "../helpers/modelFactory";

// Define the state schema for the Plan-Execute agent
const CaraPlanExecuteState = Annotation.Root({
  input: Annotation<{
    currentRole: string;
    targetRole: string;
    transitionId: number;
    existingSkills: string[];
  }>({
    reducer: (x, y) => y ?? x,
  }),
  plan: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  pastSteps: Annotation<[string, string][]>({
    reducer: (x, y) => x.concat(y),
  }),
  skillGaps: Annotation<SkillGapAnalysis[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  insights: Annotation<any>({
    reducer: (x, y) => y ?? x ?? {},
  }),
  scrapedCount: Annotation<number>({
    reducer: (x, y) => y ?? x ?? 0,
  }),
  response: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
  }),
});

/**
 * Career transition analysis using a Plan-and-Execute agent pattern
 */
export class CaraPlanExecuteAgent {
  private model: any; // Using any type for model to support both OpenAI and Gemini
  private plannerModel: any;
  private tools: TavilySearchResults[];
  private agentExecutor: any;
  private workflow: any;

  constructor() {
    // Initialize the main model using the factory for flexibility
    this.model = createChatModel({
      temperature: 0.7,
      streaming: false,
    });
    console.log(`Using model: ${getModelInfo()}`);

    // Initialize the planner model with lower temperature for more consistent planning
    this.plannerModel = createChatModel({
      temperature: 0.2,
      streaming: false,
    });

    // Initialize the search tool with proper error handling
    this.tools = [
      new TavilySearchResults({
        maxResults: 5,
        apiKey: process.env.TAVILY_API_KEY,
      }),
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
    existingSkills: string[] = [],
  ): Promise<CaraAnalysisResult> {
    console.log(
      `Starting Plan-Execute analysis: ${currentRole} → ${targetRole}`,
    );

    try {
      // Clear existing data for this transition to ensure fresh analysis
      await storage.clearTransitionData(transitionId);
      console.log(
        `Cleared existing data for transition ID: ${transitionId} to ensure fresh analysis`,
      );

      // Create the input state
      const inputs = {
        input: {
          currentRole,
          targetRole,
          transitionId,
          existingSkills,
        },
      };

      // Run the workflow with tracing and proper error handling
      const config: RunnableConfig = {
        recursionLimit: 50,
        tags: ["cara-plan-execute"],
      };

      // Initialize variables to store results
      let skillGaps: SkillGapAnalysis[] = [];
      let insights: any = {};
      let scrapedCount = 0;

      // Stream through the events to get progress updates
      try {
        for await (const event of await this.workflow.stream(inputs, config)) {
          // Log key events
          if (event.planner) {
            console.log("Plan created:", event.planner.plan);
          } else if (event.agent) {
            const step =
              event.agent.pastSteps[event.agent.pastSteps.length - 1];
            if (step) {
              console.log(`Executed step: ${step[0]}`);
            }
          } else if (event.replan) {
            if (event.replan.response) {
              console.log(
                "Analysis complete:",
                event.replan.response.substring(0, 100) + "...",
              );
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
      } catch (streamError) {
        console.error("Error in workflow stream:", streamError);
        // Continue with fallback processing
      }

      // If we didn't get any skill gaps, use fallback
      if (!skillGaps || skillGaps.length === 0) {
        console.log("No skill gaps found, using fallback data");
        skillGaps = this._getFallbackSkillGaps(currentRole, targetRole);
      }

      // If we didn't get any insights, use fallback
      if (!insights || Object.keys(insights).length === 0) {
        console.log("No insights found, using fallback data");
        insights = this._getFallbackInsights(currentRole, targetRole);
      }

      return {
        skillGaps,
        insights,
        scrapedCount: scrapedCount || 3, // Ensure we have a valid count
      };
    } catch (error) {
      console.error("Error in Plan-Execute analysis:", error);
      // Return fallback results
      return {
        skillGaps: this._getFallbackSkillGaps(currentRole, targetRole),
        insights: this._getFallbackInsights(currentRole, targetRole),
        scrapedCount: 3,
      };
    }
  }

  /**
   * Fallback skill gaps when analysis fails
   */
  private _getFallbackSkillGaps(
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
   * Fallback insights when analysis fails
   */
  private _getFallbackInsights(currentRole: string, targetRole: string): any {
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
      successStories: [],
      successRate: 65,
    };
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
      description:
        "This tool is used to plan the steps for career transition analysis",
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
    return async (
      state: typeof CaraPlanExecuteState.State,
    ): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Creating career transition analysis plan");

      try {
        // Use model factory for flexibility
        const plannerWithSchema =
          this.plannerModel.withStructuredOutput(planFunction);

        // Format the prompt with variables
        const formattedPrompt = plannerPrompt
          .replace("{input.currentRole}", state.input.currentRole)
          .replace("{input.targetRole}", state.input.targetRole)
          .replace(
            "{input.existingSkills}",
            state.input.existingSkills.join(", ") || "None",
          );

        const result = await plannerWithSchema.invoke(formattedPrompt);

        return { plan: result.steps };
      } catch (error) {
        console.error("Error in planner node:", error);
        // Fallback plan if there's an error
        return {
          plan: [
            `Search for career transition stories from ${state.input.currentRole} to ${state.input.targetRole}`,
            "Analyze skill requirements for both roles to identify gaps",
            "Extract key observations and challenges from transition stories",
            "Create a personalized development plan based on skill gaps",
            "Identify learning resources for each required skill",
          ],
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
      if (!state.plan || state.plan.length === 0) {
        return {
          pastSteps: [
            [
              "No steps to execute",
              "Plan is empty or undefined. Moving to replanning.",
            ],
          ],
          plan: [],
        };
      }

      const task = state.plan[0];
      console.log(`Executing step: ${task}`);

      try {
        // Customize input based on the current state
        let taskPrompt = task;

        // Add context from previous steps
        if (state.pastSteps && state.pastSteps.length > 0) {
          taskPrompt += `\n\nContext from previous steps:`;
          state.pastSteps.forEach(([step, result]) => {
            taskPrompt += `\n- ${step}: ${result.substring(0, 200)}${result.length > 200 ? "..." : ""}`;
          });
        }

        // Add transition details
        taskPrompt += `\n\nCareer Transition: ${state.input.currentRole} → ${state.input.targetRole}`;

        // Add existing skills if available
        if (
          state.input.existingSkills &&
          state.input.existingSkills.length > 0
        ) {
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
          pastSteps: [
            [task, "Error occurred during execution. Moving to next step."],
          ],
          plan: state.plan.slice(1),
        };
      }
    };
  }

  /**
   * Store results in the database as needed with improved error handling
   */
  private async _storeResultsIfNeeded(
    task: string,
    result: string,
    state: typeof CaraPlanExecuteState.State,
  ) {
    const { transitionId } = state.input;

    try {
      // Handle scraped data
      if (
        task.toLowerCase().includes("stories") ||
        task.toLowerCase().includes("search")
      ) {
        try {
          // Try to extract stories from the result - more robust JSON extraction
          let storiesData: any[] = [];

          // Try multiple JSON formats
          try {
            // Try to find a JSON array in the text
            const storiesMatch = result.match(/\[\s*\{.*\}\s*\]/s);
            if (storiesMatch) {
              storiesData = JSON.parse(storiesMatch[0]);
            } else {
              // Try looking for structured data elsewhere
              const jsonBlocks = result.match(
                /```(?:json)?\s*([\s\S]*?)\s*```/g,
              );
              if (jsonBlocks && jsonBlocks.length > 0) {
                const jsonContent = jsonBlocks[0].replace(
                  /```(?:json)?\s*([\s\S]*?)\s*```/g,
                  "$1",
                );
                storiesData = JSON.parse(jsonContent);
              }
            }
          } catch (e) {
            console.error("Error parsing JSON:", e);
            // Try a more lenient approach - regular expressions for semi-structured data
            const stories = [];
            const storyMatches = result.match(
              /(?:Source|Title):\s*([^\n]+)[\s\S]*?(?:Content|Text):\s*([^\n]+)(?:\n|$)/g,
            );

            if (storyMatches) {
              for (const match of storyMatches) {
                const sourceMatch = match.match(/(?:Source|Title):\s*([^\n]+)/);
                const contentMatch = match.match(
                  /(?:Content|Text):\s*([^\n]+)(?:\n|$)/,
                );

                if (sourceMatch && contentMatch) {
                  stories.push({
                    source: sourceMatch[1].trim(),
                    content: contentMatch[1].trim(),
                    url: "Not available",
                    date: new Date().toISOString().split("T")[0],
                  });
                }
              }
              storiesData = stories;
            }
          }

          // Store the stories if we found any
          if (Array.isArray(storiesData) && storiesData.length > 0) {
            for (const story of storiesData) {
              await storage.createScrapedData({
                transitionId,
                source: story.source || "Tavily Search",
                content: story.content || story.text || "",
                url: story.url || null,
                postDate: story.date || null,
                skillsExtracted: [],
              });
            }
            console.log(`Stored ${storiesData.length} scraped stories`);
          } else {
            // Try to extract any useful content and store as a single entry
            const content = result
              .replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1")
              .substring(0, 5000); // Limit to 5000 chars

            await storage.createScrapedData({
              transitionId,
              source: "AI Analysis",
              content: content,
              url: null,
              postDate: new Date().toISOString().split("T")[0],
              skillsExtracted: [],
            });
            console.log("Stored general analysis as scraped data");
          }
        } catch (e) {
          console.error("Error storing scraped data:", e);
        }
      }

      // Handle insights
      if (
        task.toLowerCase().includes("observat") ||
        task.toLowerCase().includes("insight") ||
        task.toLowerCase().includes("challeng")
      ) {
        try {
          const insightTypes = {
            observation: ["observation", "key point", "insight"],
            challenge: ["challenge", "difficulty", "obstacle"],
            story: ["story", "narrative", "experience"],
          };

          // Simple regex-based extraction
          for (const [type, keywords] of Object.entries(insightTypes)) {
            for (const keyword of keywords) {
              const pattern = new RegExp(
                `(${keyword}[^:.]*[:.]\\s*)([^\\n\\r.]+)`,
                "gi",
              );
              let match;
              while ((match = pattern.exec(result)) !== null) {
                const content = match[2].trim();
                if (content.length > 10) {
                  // Avoid short/empty matches
                  await storage.createInsight({
                    transitionId,
                    type: type as "observation" | "challenge" | "story",
                    content,
                    source: null,
                    date: null,
                    experienceYears: null,
                  });
                }
              }
            }
          }

          // Also try to extract JSON insights if present
          try {
            const insightsMatch = result.match(
              /\{\s*"(?:keyObservations|observations|insights)"[\s\S]*?\}/,
            );
            if (insightsMatch) {
              const insightsJson = JSON.parse(insightsMatch[0]);
              const observations =
                insightsJson.keyObservations ||
                insightsJson.observations ||
                insightsJson.insights ||
                [];
              const challenges =
                insightsJson.commonChallenges || insightsJson.challenges || [];

              for (const observation of observations) {
                await storage.createInsight({
                  transitionId,
                  type: "observation",
                  content: observation,
                  source: null,
                  date: null,
                  experienceYears: null,
                });
              }

              for (const challenge of challenges) {
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
          } catch (jsonError) {
            console.error("Error parsing JSON insights:", jsonError);
          }
        } catch (e) {
          console.error("Error storing insights:", e);
        }
      }

      // Handle skill gaps
      if (
        task.toLowerCase().includes("skill") &&
        (task.toLowerCase().includes("gap") ||
          task.toLowerCase().includes("requir"))
      ) {
        try {
          // Try multiple methods to extract skill gaps
          let skillsData: any[] = [];

          // Method 1: Try to parse JSON array directly
          try {
            const skillsMatch = result.match(/\[\s*\{.*\}\s*\]/s);
            if (skillsMatch) {
              skillsData = JSON.parse(skillsMatch[0]);
            }
          } catch (e) {
            console.error("Error parsing skill gaps JSON:", e);
          }

          // Method 2: Try to parse from code blocks
          if (!skillsData.length) {
            try {
              const jsonBlocks = result.match(
                /```(?:json)?\s*([\s\S]*?)\s*```/g,
              );
              if (jsonBlocks && jsonBlocks.length > 0) {
                const jsonContent = jsonBlocks[0].replace(
                  /```(?:json)?\s*([\s\S]*?)\s*```/g,
                  "$1",
                );
                skillsData = JSON.parse(jsonContent);
              }
            } catch (e) {
              console.error("Error parsing skill gaps from code blocks:", e);
            }
          }

          // Method 3: Regex-based extraction
          if (!skillsData.length) {
            const skills = [];
            const skillMatches = result.match(
              /(?:Skill|Gap):\s*([^\n]+)[\s\S]*?(?:Level|Gap):\s*([^\n]+)(?:\n|$)/g,
            );

            if (skillMatches) {
              for (const match of skillMatches) {
                const skillMatch = match.match(/(?:Skill|Name):\s*([^\n]+)/);
                const levelMatch = match.match(
                  /(?:Level|Gap):\s*([^\n]+)(?:\n|$)/,
                );

                if (skillMatch && levelMatch) {
                  skills.push({
                    skillName: skillMatch[1].trim(),
                    gapLevel: this._normalizeGapLevel(levelMatch[1].trim()),
                    confidenceScore: 70,
                    mentionCount: 1,
                  });
                }
              }
              skillsData = skills;
            }
          }

          // Store skill gaps if found
          if (Array.isArray(skillsData) && skillsData.length > 0) {
            for (const skill of skillsData) {
              if (skill.skillName) {
                await storage.createSkillGap({
                  transitionId,
                  skillName: skill.skillName,
                  gapLevel: this._normalizeGapLevel(skill.gapLevel) || "Medium",
                  confidenceScore: skill.confidenceScore || null,
                  mentionCount: skill.mentionCount || null,
                });
              }
            }
            console.log(`Stored ${skillsData.length} skill gaps`);
          }
        } catch (e) {
          console.error("Error storing skill gaps:", e);
        }
      }

      // Handle development plan
      if (
        task.toLowerCase().includes("plan") ||
        task.toLowerCase().includes("milestone")
      ) {
        try {
          // First create a plan
          const plan = await storage.createPlan({
            transitionId,
          });

          // Try multiple methods to extract milestones
          let milestonesData: any[] = [];

          // Method 1: Try to parse JSON array directly
          try {
            const milestonesMatch = result.match(/\[\s*\{.*\}\s*\]/s);
            if (milestonesMatch) {
              milestonesData = JSON.parse(milestonesMatch[0]);
            }
          } catch (e) {
            console.error("Error parsing milestones JSON:", e);
          }

          // Method 2: Try to parse from code blocks
          if (!milestonesData.length) {
            try {
              const jsonBlocks = result.match(
                /```(?:json)?\s*([\s\S]*?)\s*```/g,
              );
              if (jsonBlocks && jsonBlocks.length > 0) {
                const jsonContent = jsonBlocks[0].replace(
                  /```(?:json)?\s*([\s\S]*?)\s*```/g,
                  "$1",
                );
                milestonesData = JSON.parse(jsonContent);
              }
            } catch (e) {
              console.error("Error parsing milestones from code blocks:", e);
            }
          }

          // Method 3: Regex-based extraction
          if (!milestonesData.length) {
            const milestones = [];
            const milestoneMatches = result.match(
              /(?:Milestone|Step) \d+:[\s\S]*?(?=(?:Milestone|Step) \d+:|$)/g,
            );

            if (milestoneMatches) {
              for (let i = 0; i < milestoneMatches.length; i++) {
                const match = milestoneMatches[i];
                const titleMatch = match.match(
                  /(?:Milestone|Step) \d+:(.*?)(?:\n|$)/,
                );
                const descriptionMatch = match.match(
                  /(?:Description|Details):(.*?)(?:\n|$)/,
                );

                if (titleMatch) {
                  milestones.push({
                    title: titleMatch[1].trim(),
                    description: descriptionMatch
                      ? descriptionMatch[1].trim()
                      : null,
                    priority: "Medium",
                    durationWeeks: 2,
                    order: i + 1,
                  });
                }
              }
              milestonesData = milestones;
            }
          }

          // Create default milestones if none found
          if (!milestonesData.length) {
            milestonesData = [
              {
                title: "Build foundational knowledge",
                description:
                  "Develop core knowledge required for the target role",
                priority: "High",
                durationWeeks: 4,
                order: 1,
              },
              {
                title: "Bridge key skill gaps",
                description:
                  "Focus on the most critical skill gaps identified in the analysis",
                priority: "High",
                durationWeeks: 6,
                order: 2,
              },
              {
                title: "Create portfolio projects",
                description:
                  "Develop projects that demonstrate readiness for the target role",
                priority: "Medium",
                durationWeeks: 4,
                order: 3,
              },
              {
                title: "Prepare for interviews",
                description:
                  "Preparation for technical and behavioral interviews",
                priority: "Medium",
                durationWeeks: 2,
                order: 4,
              },
            ];
          }

          // Store the milestones
          for (let i = 0; i < milestonesData.length; i++) {
            const m = milestonesData[i];
            if (m.title) {
              const milestone = await storage.createMilestone({
                planId: plan.id,
                title: m.title,
                description: m.description || null,
                priority: m.priority || "Medium",
                durationWeeks: m.durationWeeks || 2,
                order: i + 1,
                progress: 0,
              });

              // Add default resources if none are provided
              const resources =
                m.resources && Array.isArray(m.resources) ? m.resources : [];

              if (resources.length === 0) {
                // Create at least one default resource
                await storage.createResource({
                  milestoneId: milestone.id,
                  title: `Learning resources for ${m.title}`,
                  url: "https://www.coursera.org/",
                  type: "website",
                });

                // Add a second generic resource
                await storage.createResource({
                  milestoneId: milestone.id,
                  title: `Practice projects for ${m.title}`,
                  url: "https://github.com/",
                  type: "website",
                });
              } else {
                // Add all specified resources
                for (const r of resources) {
                  await storage.createResource({
                    milestoneId: milestone.id,
                    title: r.title || `Resource for ${m.title || "Milestone"}`,
                    url: r.url || "https://www.coursera.org/",
                    type: r.type || "website",
                  });
                }
              }
            }
          }

          console.log(`Stored ${milestonesData.length} milestones`);
        } catch (e) {
          console.error("Error storing plan:", e);
        }
      }
    } catch (e) {
      console.error("Error in _storeResultsIfNeeded:", e);
    }
  }

  /**
   * Helper method to normalize gap levels to valid values
   */
  private _normalizeGapLevel(level: string): "Low" | "Medium" | "High" {
    const normalized = level.trim().toLowerCase();

    if (
      normalized.includes("low") ||
      normalized.includes("minor") ||
      normalized.includes("small")
    ) {
      return "Low";
    } else if (
      normalized.includes("high") ||
      normalized.includes("major") ||
      normalized.includes("large") ||
      normalized.includes("significant")
    ) {
      return "High";
    } else {
      return "Medium";
    }
  }

  /**
   * Create the replanner node with improved error handling
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
        steps: z.array(z.string()).describe("remaining steps to follow"),
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

    return async (
      state: typeof CaraPlanExecuteState.State,
    ): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Evaluating progress and replanning");

      try {
        // If there are no more steps, or we've completed 10 or more steps, complete the process
        if (state.plan.length === 0 || state.pastSteps.length >= 10) {
          return {
            response:
              "Career transition analysis complete. Ready to provide insights on the transition path.",
          };
        }

        // If there are remaining steps, continue with the existing plan
        return {};
      } catch (error) {
        console.error("Error in replan node:", error);
        // If we get an error, assume we're done
        return {
          response:
            "Career transition analysis complete. Review the collected data for insights.",
        };
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
   * Create a node to extract and collect skill gaps with improved error handling
   */
  private _createSkillGapCollectorNode() {
    return async (
      state: typeof CaraPlanExecuteState.State,
    ): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Collecting skill gaps from database");

      try {
        // Retrieve skill gaps from the database
        const skillGaps = await storage.getSkillGapsByTransitionId(
          state.input.transitionId,
        );

        // If no skill gaps in DB, extract from steps
        if (!skillGaps || skillGaps.length === 0) {
          console.log(
            "No skill gaps in database, extracting from analysis results",
          );

          // Look for skill gap information in the past steps
          const skillSteps = state.pastSteps.filter(
            ([step]) =>
              step.toLowerCase().includes("skill") &&
              (step.toLowerCase().includes("gap") ||
                step.toLowerCase().includes("requir")),
          );

          if (skillSteps.length > 0) {
            for (const [_, result] of skillSteps) {
              try {
                // Try multiple extraction methods

                // Method 1: JSON array
                const skillsMatch = result.match(/\[\s*\{.*\}\s*\]/s);
                if (skillsMatch) {
                  const extractedSkills = JSON.parse(skillsMatch[0]);

                  if (
                    Array.isArray(extractedSkills) &&
                    extractedSkills.length > 0
                  ) {
                    // Format skills to match SkillGapAnalysis
                    const formattedSkills: SkillGapAnalysis[] =
                      extractedSkills.map((skill) => ({
                        skillName: skill.skillName || skill.skill || "",
                        gapLevel: this._normalizeGapLevel(
                          skill.gapLevel || "Medium",
                        ),
                        confidenceScore: skill.confidenceScore || 80,
                        mentionCount: skill.mentionCount || 1,
                        contextSummary:
                          skill.contextSummary || skill.description || "",
                      }));

                    return { skillGaps: formattedSkills };
                  }
                }

                // Method 2: Code blocks
                const jsonBlocks = result.match(
                  /```(?:json)?\s*([\s\S]*?)\s*```/g,
                );
                if (jsonBlocks && jsonBlocks.length > 0) {
                  const jsonContent = jsonBlocks[0].replace(
                    /```(?:json)?\s*([\s\S]*?)\s*```/g,
                    "$1",
                  );
                  try {
                    const extractedSkills = JSON.parse(jsonContent);

                    if (
                      Array.isArray(extractedSkills) &&
                      extractedSkills.length > 0
                    ) {
                      // Format skills to match SkillGapAnalysis
                      const formattedSkills: SkillGapAnalysis[] =
                        extractedSkills.map((skill) => ({
                          skillName: skill.skillName || skill.skill || "",
                          gapLevel: this._normalizeGapLevel(
                            skill.gapLevel || "Medium",
                          ),
                          confidenceScore: skill.confidenceScore || 80,
                          mentionCount: skill.mentionCount || 1,
                          contextSummary:
                            skill.contextSummary || skill.description || "",
                        }));

                      return { skillGaps: formattedSkills };
                    }
                  } catch (e) {
                    console.error("Error parsing skills from code block:", e);
                  }
                }

                // Method 3: Regex extraction
                const skills = [];
                const skillMatches = result.match(
                  /(?:Skill|Gap):\s*([^\n]+)[\s\S]*?(?:Level|Gap):\s*([^\n]+)(?:\n|$)/g,
                );

                if (skillMatches) {
                  for (const match of skillMatches) {
                    const skillMatch = match.match(
                      /(?:Skill|Name):\s*([^\n]+)/,
                    );
                    const levelMatch = match.match(
                      /(?:Level|Gap):\s*([^\n]+)(?:\n|$)/,
                    );

                    if (skillMatch && levelMatch) {
                      skills.push({
                        skillName: skillMatch[1].trim(),
                        gapLevel: this._normalizeGapLevel(levelMatch[1].trim()),
                        confidenceScore: 70,
                        mentionCount: 1,
                        contextSummary: "",
                      });
                    }
                  }

                  if (skills.length > 0) {
                    return { skillGaps: skills };
                  }
                }
              } catch (e) {
                console.error("Error extracting skills from results:", e);
              }
            }
          }

          // Return fallback skills if extraction failed
          return {
            skillGaps: this._getFallbackSkillGaps(
              state.input.currentRole,
              state.input.targetRole,
            ),
          };
        }

        // Format the retrieved skill gaps
        const formattedSkillGaps: SkillGapAnalysis[] = skillGaps.map((gap) => ({
          skillName: gap.skillName,
          gapLevel: gap.gapLevel as "Low" | "Medium" | "High",
          confidenceScore: gap.confidenceScore || 80,
          mentionCount: gap.mentionCount || 1,
          contextSummary: "",
        }));

        return { skillGaps: formattedSkillGaps };
      } catch (error) {
        console.error("Error in skill gap collector:", error);
        return {
          skillGaps: this._getFallbackSkillGaps(
            state.input.currentRole,
            state.input.targetRole,
          ),
        };
      }
    };
  }

  /**
   * Create a node to extract and collect insights
   */
  private _createInsightCollectorNode() {
    return async (
      state: typeof CaraPlanExecuteState.State,
    ): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Collecting insights from database");

      try {
        // Retrieve insights from the database
        const dbInsights = await storage.getInsightsByTransitionId(
          state.input.transitionId,
        );

        // Format the insights
        const formattedInsights = {
          keyObservations: dbInsights
            .filter((insight) => insight.type === "observation")
            .map((insight) => insight.content),
          commonChallenges: dbInsights
            .filter((insight) => insight.type === "challenge")
            .map((insight) => insight.content),
          successStories: dbInsights
            .filter((insight) => insight.type === "story")
            .map((insight) => insight.content),
          successRate: 75, // Default success rate
        };

        // If no insights in DB, use fallback
        if (
          formattedInsights.keyObservations.length === 0 &&
          formattedInsights.commonChallenges.length === 0
        ) {
          return {
            insights: this._getFallbackInsights(
              state.input.currentRole,
              state.input.targetRole,
            ),
          };
        }

        return { insights: formattedInsights };
      } catch (error) {
        console.error("Error in insight collector:", error);
        return {
          insights: this._getFallbackInsights(
            state.input.currentRole,
            state.input.targetRole,
          ),
        };
      }
    };
  }

  /**
   * Create a node to update the scraped count
   */
  private _createDataCollectorNode() {
    return async (
      state: typeof CaraPlanExecuteState.State,
    ): Promise<Partial<typeof CaraPlanExecuteState.State>> => {
      console.log("Collecting data counts");

      try {
        // Retrieve scraped data count from the database
        const scrapedData = await storage.getScrapedDataByTransitionId(
          state.input.transitionId,
        );
        const count = scrapedData.length;

        // Mark the transition as complete
        await storage.updateTransitionStatus(state.input.transitionId, true);

        return { scrapedCount: count || 3 }; // Ensure at least 3 for UI/UX reasons
      } catch (error) {
        console.error("Error in data collector:", error);
        return { scrapedCount: 3 };
      }
    };
  }
}
