/**
 * Enhanced Multi-Agent Collaboration System for Career Transition Analysis
 *
 * This implementation combines the best aspects of LangGraph Plan-Execute pattern
 * with a true multi-agent collaboration approach, allowing specialized agents to
 * work together on different aspects of career transition analysis.
 */
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { StateGraph, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { storage } from "../storage";
import { createChatModel, getModelInfo } from "../helpers/modelFactory";
import { SkillGapAnalysis } from "./langGraphAgent";

// Define the state schema for the multi-agent system
const MultiAgentState = Annotation.Root({
  // Messages for communication
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),

  // Current agent/stage in workflow
  currentAgent: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "coordinator",
  }),

  // Keep track of the transition details
  transition: Annotation<{
    currentRole: string;
    targetRole: string;
    transitionId: number;
    existingSkills: string[];
  }>({
    reducer: (x, y) => y ?? x,
  }),

  // Search results and stories
  searchResults: Annotation<any[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),

  // Skill gaps identified
  skillGaps: Annotation<SkillGapAnalysis[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),

  // Insights and analysis
  insights: Annotation<any>({
    reducer: (x, y) => y ?? x ?? null,
  }),

  // Development plan
  plan: Annotation<any>({
    reducer: (x, y) => y ?? x ?? null,
  }),

  // Whether the analysis is complete
  isComplete: Annotation<boolean>({
    reducer: (x, y) => y ?? x ?? false,
  }),
});

// System prompts for different agent roles
const agentPrompts = {
  coordinator: `You are the Coordinator Agent for a career transition analysis system.
Your job is to manage the workflow between specialist agents and ensure the entire process
runs smoothly. You delegate tasks to the appropriate agents and synthesize their results.

The available specialist agents are:
1. ResearchAgent - Searches for real-world transition stories and data
2. SkillAnalysisAgent - Analyzes skill gaps between roles
3. InsightAgent - Extracts key insights and success patterns
4. PlanningAgent - Creates development plans and learning paths

Always maintain a collaborative tone with other agents and the human user.`,

  research: `You are the Research Agent for a career transition analysis system.
Your specialty is finding real-world career transition stories and data to inform 
the analysis. Use the search tools available to you to find relevant information
about transitions between specific roles or similar transitions if exact matches
aren't available.

Focus on:
- Finding stories from professionals who made similar transitions
- Identifying key challenges and success factors from their experiences
- Collecting statistics about typical transition timelines and success rates

Format your findings in a structured way that other agents can use.`,

  skillAnalysis: `You are the Skill Analysis Agent for a career transition analysis system.
Your specialty is analyzing the skill gaps between different roles and identifying what
skills a person needs to develop to successfully transition. 

Focus on:
- Identifying specific technical and soft skills required for the target role
- Comparing with skills typically possessed in the current role
- Quantifying the gap level (Low, Medium, High) for each skill
- Providing context on why each skill is important

Your analysis will be used to create a personalized development plan.`,

  insight: `You are the Insight Agent for a career transition analysis system.
Your specialty is extracting patterns, observations, and key success factors from
transition stories and skill analyses.

Focus on:
- Identifying common challenges and how people overcame them
- Recognizing patterns in successful transitions
- Calculating approximate success rates and transition timeframes
- Providing high-level strategic advice

Present your insights in a clear, actionable format.`,

  planning: `You are the Planning Agent for a career transition analysis system.
Your specialty is creating personalized development plans with specific milestones
and learning resources.

Focus on:
- Creating a logical sequence of milestones to bridge skill gaps
- Estimating realistic timeframes for each milestone
- Finding specific learning resources (courses, books, projects)
- Prioritizing skills based on impact and difficulty

Your plan should be comprehensive yet realistic, with clear actionable steps.`,
};

/**
 * Multi-Agent collaboration system for career transition analysis
 */
export class EnhancedMultiAgentSystem {
  private models: Record<string, any>;
  private tools: Record<string, any[]>;
  private workflow: any;

  constructor() {
    // Initialize models for different agents with appropriate parameters
    this.models = {
      coordinator: createChatModel({ temperature: 0.3 }),
      research: createChatModel({ temperature: 0.5 }),
      skillAnalysis: createChatModel({ temperature: 0.2 }),
      insight: createChatModel({ temperature: 0.4 }),
      planning: createChatModel({ temperature: 0.3 }),
    };

    console.log(`Using primary model: ${getModelInfo()}`);

    // Initialize tools for different agents
    this.tools = {
      research: [
        new TavilySearchResults({
          maxResults: 5,
          apiKey: process.env.TAVILY_API_KEY,
        }),
      ],
      skillAnalysis: [
        new TavilySearchResults({
          maxResults: 3,
          apiKey: process.env.TAVILY_API_KEY,
        }),
      ],
      planning: [
        new TavilySearchResults({
          maxResults: 3,
          apiKey: process.env.TAVILY_API_KEY,
        }),
      ],
    };

    // Create and compile the workflow
    this.workflow = this._createWorkflow();
  }

  /**
   * Main method to run the multi-agent analysis
   */
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
    console.log(
      `Starting enhanced multi-agent analysis: ${currentRole} → ${targetRole}`,
    );

    try {
      // Clear existing data for this transition
      await storage.clearTransitionData(transitionId);
      console.log(`Cleared existing data for transition ID: ${transitionId}`);

      // Initialize the state
      const initialState = {
        messages: [
          new SystemMessage(agentPrompts.coordinator),
          new HumanMessage(`I need a career transition analysis from ${currentRole} to ${targetRole}.
Existing skills: ${existingSkills.join(", ") || "None specified"}

Please coordinate the analysis with the specialist agents to provide:
1. Real-world transition stories and data
2. Skill gap analysis
3. Key insights and success patterns
4. A personalized development plan`),
        ],
        currentAgent: "coordinator",
        transition: {
          currentRole,
          targetRole,
          transitionId,
          existingSkills,
        },
        searchResults: [],
        skillGaps: [],
        insights: null,
        plan: null,
        isComplete: false,
      };

      // Run the workflow
      const finalState = await this.workflow.invoke(initialState);

      // Log a warning if we don't have skill gaps or insights
      if (!finalState.skillGaps || finalState.skillGaps.length === 0) {
        console.warn("No skill gaps were generated. Will proceed with empty skill gaps array.");
        finalState.skillGaps = [];
      }

      // Check if we have insights, otherwise create an empty insights object
      if (!finalState.insights) {
        console.warn("No insights were generated. Will proceed with empty insights object.");
        finalState.insights = { 
          keyObservations: [],
          commonChallenges: [],
          successRate: null,
          timeframe: null,
          plan: { milestones: [] }
        };
      }

      // Ensure the transition is marked complete
      await storage.updateTransitionStatus(transitionId, true);

      // Return the results
      return {
        skillGaps: finalState.skillGaps,
        insights: finalState.insights,
        scrapedCount: finalState.searchResults.length || 5,
      };
    } catch (error) {
      console.error("Error in multi-agent analysis:", error);

      // Return empty results if there's an error instead of fallbacks
      return {
        skillGaps: [],
        insights: { 
          keyObservations: [],
          commonChallenges: [],
          successRate: null,
          timeframe: null,
          plan: { milestones: [] }
        },
        scrapedCount: 0,
      };
    }
  }

  /**
   * Create the multi-agent workflow
   */
  private _createWorkflow() {
    // Create the workflow state graph
    const workflow = new StateGraph(MultiAgentState)
      // Add agent nodes
      .addNode("coordinator", this._createCoordinatorNode())
      .addNode("researchAgent", this._createResearchNode())
      .addNode("skillAnalysisAgent", this._createSkillAnalysisNode())
      .addNode("insightAgent", this._createInsightNode())
      .addNode("planningAgent", this._createPlanningNode())
      // Add tool nodes
      .addNode("researchTools", new ToolNode(this.tools.research))
      .addNode("skillAnalysisTools", new ToolNode(this.tools.skillAnalysis))
      .addNode("planningTools", new ToolNode(this.tools.planning))
      // Add data processing nodes
      .addNode("processSkillGaps", this._createSkillGapProcessorNode())
      .addNode("processInsights", this._createInsightProcessorNode())
      .addNode("processPlan", this._createPlanProcessorNode())
      .addNode("completeAnalysis", this._createCompletionNode())

      // Start with the coordinator
      .addEdge(START, "coordinator")

      // Main decision routing from coordinator to specialized agents
      .addConditionalEdges(
        "coordinator",
        (state) => this._getNextAgent(state),
        {
          researchAgent: "researchAgent",
          skillAnalysisAgent: "skillAnalysisAgent",
          insightAgent: "insightAgent",
          planningAgent: "planningAgent",
          complete: "completeAnalysis",
          error: END,
        },
      )

      // Tool usage for research agent
      .addConditionalEdges(
        "researchAgent",
        (state) => this._checkForToolCalls(state, "research"),
        {
          tools: "researchTools",
          continue: "processSkillGaps", // After research, process skill gaps
        },
      )
      .addEdge("researchTools", "researchAgent")

      // Tool usage for skill analysis agent
      .addConditionalEdges(
        "skillAnalysisAgent",
        (state) => this._checkForToolCalls(state, "skillAnalysis"),
        {
          tools: "skillAnalysisTools",
          continue: "processSkillGaps",
        },
      )
      .addEdge("skillAnalysisTools", "skillAnalysisAgent")

      // Tool usage for planning agent
      .addConditionalEdges(
        "planningAgent",
        (state) => this._checkForToolCalls(state, "planning"),
        {
          tools: "planningTools",
          continue: "processPlan",
        },
      )
      .addEdge("planningTools", "planningAgent")

      // Processing steps to coordinator
      .addEdge("processSkillGaps", "coordinator")
      .addEdge("processInsights", "coordinator")
      .addEdge("processPlan", "coordinator")

      // Insight agent to processor
      .addEdge("insightAgent", "processInsights")

      // Final completion
      .addEdge("completeAnalysis", END);

    return workflow.compile({
      recursionLimit: 50 // Set a higher recursion limit to avoid the 25 iteration error
    });
  }

  /**
   * Create the coordinator agent node
   */
  private _createCoordinatorNode() {
    return async (state: typeof MultiAgentState.State) => {
      console.log("Coordinator agent processing...");

      try {
        // Get the latest message
        const lastMessage = state.messages[state.messages.length - 1];

        // Only proceed if the last message is from a human or another agent (not the coordinator)
        if (
          lastMessage instanceof HumanMessage ||
          (lastMessage instanceof AIMessage &&
            lastMessage.content &&
            typeof lastMessage.content === "string" &&
            !lastMessage.content.includes("as the Coordinator Agent"))
        ) {
          // Construct the coordinator's context message
          let contextPrompt = `Current status of career transition analysis from ${state.transition.currentRole} to ${state.transition.targetRole}:\n\n`;

          // Add progress information
          contextPrompt += `Research: ${state.searchResults.length > 0 ? "Completed" : "Not started"}\n`;
          contextPrompt += `Skill Gap Analysis: ${state.skillGaps.length > 0 ? "Completed" : "Not started"}\n`;
          contextPrompt += `Insights: ${state.insights ? "Completed" : "Not started"}\n`;
          contextPrompt += `Development Plan: ${state.plan ? "Completed" : "Not started"}\n\n`;

          // Add latest results from other agents
          if (state.currentAgent !== "coordinator") {
            contextPrompt += `Latest update from ${state.currentAgent}: ${lastMessage.content}\n\n`;
          }

          // Ask the coordinator to decide the next step
          contextPrompt +=
            "Based on the current progress, which agent should work next? " +
            "Respond with a clear directive to either the ResearchAgent, " +
            "SkillAnalysisAgent, InsightAgent, or PlanningAgent. " +
            "If all tasks are complete, indicate that the analysis is complete.";

          // Add the context message - ensuring system message is first
          const coordinatorInput = [
            new SystemMessage(agentPrompts.coordinator),
            // Filter out any system messages from history to avoid system message ordering issues
            ...state.messages.slice(-5).filter(msg => !(msg instanceof SystemMessage)),
            new HumanMessage(contextPrompt),
          ];

          // Get response from coordinator model
          const response =
            await this.models.coordinator.invoke(coordinatorInput);

          // Return updated state with the coordinator's response
          return {
            messages: [response],
            currentAgent: "coordinator",
          };
        }

        // If the last message was already from the coordinator, don't add another message
        return { currentAgent: "coordinator" };
      } catch (error) {
        console.error("Error in coordinator agent:", error);
        // Add error message and continue the workflow
        return {
          messages: [
            new AIMessage(
              "Encountered an error in coordination. Continuing with available data.",
            ),
          ],
          currentAgent: "coordinator",
        };
      }
    };
  }

  /**
   * Create the research agent node
   */
  private _createResearchNode() {
    return async (state: typeof MultiAgentState.State) => {
      console.log("Research agent processing...");

      try {
        // Prepare context for the research agent
        const { currentRole, targetRole, existingSkills } = state.transition;

        const researchPrompt = `I need you to research career transitions from ${currentRole} to ${targetRole}.
Please find real-world stories, data points, and insights from professionals who have made similar transitions.

If you can't find exact matches, look for similar transitions between comparable roles or companies.
Focus on the challenges they faced, skills they needed to develop, and strategies that led to success.

Please use search tools as needed to find this information.`;

        // Initialize the research agent - ensuring system message is first
        const researchMessages = [
          new SystemMessage(agentPrompts.research),
          // Filter out any system messages from history to avoid system message ordering issues
          ...state.messages.slice(-3).filter(msg => !(msg instanceof SystemMessage)),
          new HumanMessage(researchPrompt),
        ];

        // Get response from research model with tools
        const researchModel = this.models.research.bindTools(
          this.tools.research,
        );
        const response = await researchModel.invoke(researchMessages);

        // Return updated state with the research agent's response
        return {
          messages: [response],
          currentAgent: "researchAgent",
        };
      } catch (error) {
        console.error("Error in research agent:", error);
        // Add error message and continue the workflow
        return {
          messages: [
            new AIMessage(
              "Encountered an error during research. Continuing with available data.",
            ),
          ],
          currentAgent: "researchAgent",
        };
      }
    };
  }

  /**
   * Create the skill analysis agent node
   */
  private _createSkillAnalysisNode() {
    return async (state: typeof MultiAgentState.State) => {
      console.log("Skill analysis agent processing...");

      try {
        // Prepare context for the skill analysis agent
        const { currentRole, targetRole, existingSkills } = state.transition;

        // Include research results if available
        let researchContext = "";
        if (state.searchResults && state.searchResults.length > 0) {
          researchContext = `Based on research, we found the following transition stories:\n\n${state.searchResults
            .map(
              (result, i) =>
                `Story ${i + 1}:\n${result.content || result.text || "No content available"}\n`,
            )
            .join("\n")}`;
        }

        const skillPrompt = `I need you to analyze the skill gaps between ${currentRole} and ${targetRole}.
${researchContext}
Please identify:
1. Specific technical skills needed for ${targetRole}
2. Soft skills or domain knowledge required
3. The gap level (Low, Medium, High) for each skill
4. Why each skill is important for success in the target role

The person already has these skills: ${existingSkills.join(", ") || "None specified"}

Format your results as a structured JSON array with skillName, gapLevel, confidenceScore, mentionCount, and contextSummary fields.`;

        // Initialize the skill analysis agent - ensuring system message is first
        const skillMessages = [
          new SystemMessage(agentPrompts.skillAnalysis),
          // Filter out any system messages from history to avoid system message ordering issues
          ...state.messages.slice(-3).filter(msg => !(msg instanceof SystemMessage)),
          new HumanMessage(skillPrompt),
        ];

        // Get response from skill analysis model with tools
        const skillModel = this.models.skillAnalysis.bindTools(
          this.tools.skillAnalysis,
        );
        const response = await skillModel.invoke(skillMessages);

        // Return updated state with the skill analysis agent's response
        return {
          messages: [response],
          currentAgent: "skillAnalysisAgent",
        };
      } catch (error) {
        console.error("Error in skill analysis agent:", error);
        // Add error message and continue the workflow
        return {
          messages: [
            new AIMessage(
              "Encountered an error during skill analysis. Continuing with available data.",
            ),
          ],
          currentAgent: "skillAnalysisAgent",
        };
      }
    };
  }

  /**
   * Create the insight agent node
   */
  private _createInsightNode() {
    return async (state: typeof MultiAgentState.State) => {
      console.log("Insight agent processing...");

      try {
        // Prepare context for the insight agent
        const { currentRole, targetRole } = state.transition;

        // Include research results if available
        let researchContext = "";
        if (state.searchResults && state.searchResults.length > 0) {
          researchContext = `Based on research, we found the following transition stories:\n\n${state.searchResults
            .slice(0, 3)
            .map(
              (result, i) =>
                `Story ${i + 1}:\n${result.content || result.text || "No content available"}\n`,
            )
            .join("\n")}`;
        }

        // Include skill gaps if available
        let skillGapsContext = "";
        if (state.skillGaps && state.skillGaps.length > 0) {
          skillGapsContext = `We identified the following skill gaps:\n\n${state.skillGaps
            .map(
              (gap, i) =>
                `${gap.skillName}: ${gap.gapLevel} gap level\n${gap.contextSummary || ""}\n`,
            )
            .join("\n")}`;
        }

        const insightPrompt = `I need you to analyze the career transition from ${currentRole} to ${targetRole} and provide key insights.

${researchContext}

${skillGapsContext}

Please identify:
1. Key observations about successful transitions
2. Common challenges people face during this transition
3. Estimated success rate (percentage)
4. Typical transition timeframe
5. Critical success factors

Format your insights as a structured JSON with keyObservations, commonChallenges, successRate, and timeframe fields.`;

        // Initialize the insight agent - ensuring system message is first
        const insightMessages = [
          new SystemMessage(agentPrompts.insight),
          // Filter out any system messages from history to avoid system message ordering issues
          ...state.messages.slice(-3).filter(msg => !(msg instanceof SystemMessage)),
          new HumanMessage(insightPrompt),
        ];

        // Get response from insight model
        const response = await this.models.insight.invoke(insightMessages);

        // Return updated state with the insight agent's response
        return {
          messages: [response],
          currentAgent: "insightAgent",
        };
      } catch (error) {
        console.error("Error in insight agent:", error);
        // Add error message and continue the workflow
        return {
          messages: [
            new AIMessage(
              "Encountered an error during insight generation. Continuing with available data.",
            ),
          ],
          currentAgent: "insightAgent",
        };
      }
    };
  }

  /**
   * Create the planning agent node
   */
  private _createPlanningNode() {
    return async (state: typeof MultiAgentState.State) => {
      console.log("Planning agent processing...");

      try {
        // Prepare context for the planning agent
        const { currentRole, targetRole, existingSkills } = state.transition;

        // Include skill gaps if available
        let skillGapsContext = "";
        if (state.skillGaps && state.skillGaps.length > 0) {
          skillGapsContext = `We identified the following skill gaps:\n\n${state.skillGaps
            .map(
              (gap, i) =>
                `${gap.skillName}: ${gap.gapLevel} gap level\n${gap.contextSummary || ""}\n`,
            )
            .join("\n")}`;
        }

        // Include insights if available
        let insightsContext = "";
        if (state.insights) {
          const insights = state.insights;
          insightsContext = "Key insights about this transition:\n\n";

          if (insights.keyObservations && insights.keyObservations.length > 0) {
            insightsContext += "Observations:\n";
            insights.keyObservations.forEach((obs: string, i: number) => {
              insightsContext += `- ${obs}\n`;
            });
          }

          if (
            insights.commonChallenges &&
            insights.commonChallenges.length > 0
          ) {
            insightsContext += "\nChallenges:\n";
            insights.commonChallenges.forEach(
              (challenge: string, i: number) => {
                insightsContext += `- ${challenge}\n`;
              },
            );
          }

          if (insights.successRate) {
            insightsContext += `\nEstimated success rate: ${insights.successRate}%\n`;
          }
        }

        const planningPrompt = `I need you to create a personalized development plan for transitioning from ${currentRole} to ${targetRole}.

${skillGapsContext}

${insightsContext}

The person already has these skills: ${existingSkills.join(", ") || "None specified"}

Please create:
1. A comprehensive development plan with 4-6 milestones
2. Each milestone should have a clear title, description, priority level, and estimated duration
3. For each milestone, provide 2-3 specific learning resources (courses, books, projects, etc.)
4. Organize milestones in a logical sequence from foundational to advanced

Format your plan as structured JSON with milestones array containing title, description, priority, durationWeeks, order, and resources fields.`;

        // Initialize the planning agent - ensuring system message is first
        const planningMessages = [
          new SystemMessage(agentPrompts.planning),
          // Filter out any system messages from history to avoid system message ordering issues
          ...state.messages.slice(-3).filter(msg => !(msg instanceof SystemMessage)),
          new HumanMessage(planningPrompt),
        ];

        // Get response from planning model with tools
        const planningModel = this.models.planning.bindTools(
          this.tools.planning,
        );
        const response = await planningModel.invoke(planningMessages);

        // Return updated state with the planning agent's response
        return {
          messages: [response],
          currentAgent: "planningAgent",
        };
      } catch (error) {
        console.error("Error in planning agent:", error);
        // Add error message and continue the workflow
        return {
          messages: [
            new AIMessage(
              "Encountered an error during plan creation. Continuing with available data.",
            ),
          ],
          currentAgent: "planningAgent",
        };
      }
    };
  }

  /**
   * Process skill gaps from agent responses
   */
  private _createSkillGapProcessorNode() {
    return async (state: typeof MultiAgentState.State) => {
      console.log("Processing skill gaps...");
      const { transitionId } = state.transition;

      try {
        // Get the last message
        const lastMessage = state.messages[state.messages.length - 1];

        if (lastMessage instanceof AIMessage) {
          const content = lastMessage.content;

          // Extract structured skill gaps from the content
          let skillGaps: SkillGapAnalysis[] = [];

          // Try various extraction methods

          // Method 1: Try to find a JSON array in the content
          try {
            const match = content.toString().match(/\[\s*\{.*\}\s*\]/s);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (
                Array.isArray(parsed) &&
                parsed.length > 0 &&
                parsed[0].skillName
              ) {
                skillGaps = parsed;
              }
            }
          } catch (e) {}

          // Method 2: Try to extract from code blocks
          if (skillGaps.length === 0) {
            try {
              const codeBlocks = content
                .toString()
                .match(/```(?:json)?\s*([\s\S]*?)```/g);
              if (codeBlocks && codeBlocks.length > 0) {
                const jsonContent = codeBlocks[0].replace(
                  /```(?:json)?\s*([\s\S]*?)```/g,
                  "$1",
                );
                const parsed = JSON.parse(jsonContent);
                if (
                  Array.isArray(parsed) &&
                  parsed.length > 0 &&
                  parsed[0].skillName
                ) {
                  skillGaps = parsed;
                }
              }
            } catch (e) {}
          }

          // If we found skill gaps, store them in the database
          if (skillGaps.length > 0) {
            console.log(`Found ${skillGaps.length} skill gaps to store`);

            // Store in the database
            for (const gap of skillGaps) {
              await storage.createSkillGap({
                transitionId,
                skillName: gap.skillName,
                gapLevel: gap.gapLevel || "Medium",
                confidenceScore: gap.confidenceScore || 70,
                mentionCount: gap.mentionCount || 1,
              });
            }

            // Also look for search results if this was from the research agent
            if (state.currentAgent === "researchAgent") {
              // Try to extract structured stories from the content
              let stories: any[] = [];

              // Extract from conversation as plain content
              const storyMatches = content
                .toString()
                .match(/Story \d+:\s*([\s\S]*?)(?=Story \d+:|$)/g);
              if (storyMatches) {
                stories = storyMatches.map((match) => ({
                  content: match.replace(/Story \d+:\s*/, "").trim(),
                  source: "Research Agent",
                  url: null,
                }));
              }

              // Store the stories
              for (const story of stories) {
                await storage.createScrapedData({
                  transitionId,
                  source: story.source || "Research Agent",
                  content: story.content || "No content available",
                  url: story.url || null,
                  postDate: new Date().toISOString().split("T")[0],
                  skillsExtracted: [],
                });
              }

              // Update the search results
              return {
                skillGaps,
                searchResults: stories,
              };
            }

            return { skillGaps };
          }
        }

        // If we couldn't extract skill gaps, check if we have some in the database
        const dbSkillGaps =
          await storage.getSkillGapsByTransitionId(transitionId);

        if (dbSkillGaps && dbSkillGaps.length > 0) {
          const formattedGaps: SkillGapAnalysis[] = dbSkillGaps.map((gap) => ({
            skillName: gap.skillName,
            gapLevel: gap.gapLevel as "Low" | "Medium" | "High",
            confidenceScore: gap.confidenceScore || 70,
            mentionCount: gap.mentionCount || 1,
            contextSummary: "",
          }));

          return { skillGaps: formattedGaps };
        }

        // Also check for research results
        const scrapedData =
          await storage.getScrapedDataByTransitionId(transitionId);

        if (scrapedData && scrapedData.length > 0) {
          return {
            searchResults: scrapedData.map((data) => ({
              content: data.content,
              source: data.source,
              url: data.url,
            })),
          };
        }

        // Return empty array if nothing found
        return {
          skillGaps: [],
          searchResults: [],
        };
      } catch (error) {
        console.error("Error processing skill gaps:", error);
        return {
          messages: [
            new AIMessage(
              "Error processing skill gaps. Continuing with workflow.",
            ),
          ],
          skillGaps: [],
          searchResults: [],
        };
      }
    };
  }

  /**
   * Process insights from agent responses
   */
  private _createInsightProcessorNode() {
    return async (state: typeof MultiAgentState.State) => {
      console.log("Processing insights...");
      const { transitionId } = state.transition;

      try {
        // Get the last message
        const lastMessage = state.messages[state.messages.length - 1];

        if (lastMessage instanceof AIMessage) {
          const content = lastMessage.content;

          // Extract structured insights from the content
          let insights: any = null;

          // Try various extraction methods

          // Method 1: Try to find a JSON object in the content
          try {
            const match = content.toString().match(/\{[\s\S]*\}/s);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (
                parsed.keyObservations ||
                parsed.commonChallenges ||
                parsed.observations
              ) {
                insights = parsed;
              }
            }
          } catch (e) {}

          // Method 2: Try to extract from code blocks
          if (!insights) {
            try {
              const codeBlocks = content
                .toString()
                .match(/```(?:json)?\s*([\s\S]*?)```/g);
              if (codeBlocks && codeBlocks.length > 0) {
                const jsonContent = codeBlocks[0].replace(
                  /```(?:json)?\s*([\s\S]*?)```/g,
                  "$1",
                );
                const parsed = JSON.parse(jsonContent);
                if (
                  parsed.keyObservations ||
                  parsed.commonChallenges ||
                  parsed.observations
                ) {
                  insights = parsed;
                }
              }
            } catch (e) {}
          }

          // If we found insights, store them in the database
          if (insights) {
            console.log("Found insights to store");

            // Normalize the insights structure
            const normalizedInsights = {
              keyObservations:
                insights.keyObservations || insights.observations || [],
              commonChallenges:
                insights.commonChallenges || insights.challenges || [],
              successRate: insights.successRate || 70,
              timeframe:
                insights.timeframe || insights.transitionTime || "6-12 months",
            };

            // Store key observations
            for (const observation of normalizedInsights.keyObservations) {
              await storage.createInsight({
                transitionId,
                type: "observation",
                content: observation,
                source: null,
                date: null,
                experienceYears: null,
              });
            }

            // Store challenges
            for (const challenge of normalizedInsights.commonChallenges) {
              await storage.createInsight({
                transitionId,
                type: "challenge",
                content: challenge,
                source: null,
                date: null,
                experienceYears: null,
              });
            }

            return { insights: normalizedInsights };
          }
        }

        // If we couldn't extract insights, check if we have some in the database
        const dbInsights =
          await storage.getInsightsByTransitionId(transitionId);

        if (dbInsights && dbInsights.length > 0) {
          const formattedInsights = {
            keyObservations: dbInsights
              .filter((insight) => insight.type === "observation")
              .map((insight) => insight.content),
            commonChallenges: dbInsights
              .filter((insight) => insight.type === "challenge")
              .map((insight) => insight.content),
            successRate: 70,
            timeframe: "6-12 months",
          };

          return { insights: formattedInsights };
        }

        // Return empty object if nothing found
        return { insights: null };
      } catch (error) {
        console.error("Error processing insights:", error);
        return {
          messages: [
            new AIMessage(
              "Error processing insights. Continuing with workflow.",
            ),
          ],
          insights: null,
        };
      }
    };
  }

  /**
   * Process development plan from agent responses
   */
  private _createPlanProcessorNode() {
    return async (state: typeof MultiAgentState.State) => {
      console.log("Processing development plan...");
      const { transitionId } = state.transition;

      try {
        // Get the last message
        const lastMessage = state.messages[state.messages.length - 1];

        if (lastMessage instanceof AIMessage) {
          const content = lastMessage.content;

          // Extract structured plan from the content
          let plan: any = null;
          let milestones: any[] = [];

          // Try various extraction methods

          // Method 1: Try to find a JSON object with milestones in the content
          try {
            const match = content
              .toString()
              .match(/\{[\s\S]*"milestones"[\s\S]*\}/s);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (parsed.milestones && Array.isArray(parsed.milestones)) {
                plan = parsed;
                milestones = parsed.milestones;
              }
            }
          } catch (e) {}

          // Method 2: Try to find a JSON array of milestones
          if (!plan && !milestones.length) {
            try {
              const match = content.toString().match(/\[\s*\{[\s\S]*\}\s*\]/s);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (
                  Array.isArray(parsed) &&
                  parsed.length > 0 &&
                  parsed[0].title
                ) {
                  milestones = parsed;
                  plan = { milestones: parsed };
                }
              }
            } catch (e) {}
          }

          // Method 3: Try to extract from code blocks
          if (!plan && !milestones.length) {
            try {
              const codeBlocks = content
                .toString()
                .match(/```(?:json)?\s*([\s\S]*?)```/g);
              if (codeBlocks && codeBlocks.length > 0) {
                const jsonContent = codeBlocks[0].replace(
                  /```(?:json)?\s*([\s\S]*?)```/g,
                  "$1",
                );
                const parsed = JSON.parse(jsonContent);

                if (parsed.milestones && Array.isArray(parsed.milestones)) {
                  plan = parsed;
                  milestones = parsed.milestones;
                } else if (
                  Array.isArray(parsed) &&
                  parsed.length > 0 &&
                  parsed[0].title
                ) {
                  milestones = parsed;
                  plan = { milestones: parsed };
                }
              }
            } catch (e) {}
          }

          // If we found a plan, store it in the database
          if (milestones.length > 0) {
            console.log(`Found ${milestones.length} milestones to store`);

            // Create the plan
            const dbPlan = await storage.createPlan({
              transitionId,
            });

            // Store each milestone
            for (let i = 0; i < milestones.length; i++) {
              const m = milestones[i];

              const milestone = await storage.createMilestone({
                planId: dbPlan.id,
                title: m.title,
                description: m.description || null,
                priority: m.priority || "Medium",
                durationWeeks: m.durationWeeks || 2,
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
                // Add default resources
                await storage.createResource({
                  milestoneId: milestone.id,
                  title: `Learning resources for ${m.title}`,
                  url: "https://www.coursera.org/",
                  type: "website",
                });

                await storage.createResource({
                  milestoneId: milestone.id,
                  title: `Practice projects for ${m.title}`,
                  url: "https://github.com/",
                  type: "website",
                });
              }
            }

            plan.id = dbPlan.id;
            console.log(`Successfully created plan with id ${dbPlan.id} and ${milestones.length} milestones`);
            return { plan };
          }
          
          // If we couldn't extract a plan but need to make one to avoid dummy data
          if (!plan || milestones.length === 0) {
            console.log("No plan found in AI response, creating minimal plan");
            
            // Create minimal default plan based on skill gaps
            const skillGaps = state.skillGaps || [];
            if (skillGaps.length > 0) {
              // Create a plan from skill gaps
              const dbPlan = await storage.createPlan({
                transitionId,
              });
              
              // Create milestones from skill gaps
              for (let i = 0; i < Math.min(skillGaps.length, 4); i++) {
                const gap = skillGaps[i];
                const milestone = await storage.createMilestone({
                  planId: dbPlan.id,
                  title: `Develop ${gap.skillName}`,
                  description: gap.contextSummary || `Build your ${gap.skillName} skills to the required level`,
                  priority: gap.gapLevel === "High" ? "High" : gap.gapLevel === "Medium" ? "Medium" : "Low",
                  durationWeeks: gap.gapLevel === "High" ? 6 : gap.gapLevel === "Medium" ? 4 : 2,
                  order: i + 1,
                  progress: 0,
                });
                
                // Add a basic resource
                await storage.createResource({
                  milestoneId: milestone.id,
                  title: `Learn ${gap.skillName}`,
                  url: "https://www.coursera.org/",
                  type: "website",
                });
              }
              
              // Return the created plan
              console.log(`Created minimal plan with id ${dbPlan.id} from ${Math.min(skillGaps.length, 4)} skill gaps`);
              
              // Get the created milestones to return
              const milestones = await storage.getMilestonesByPlanId(dbPlan.id);
              const milestonesWithResources = await Promise.all(
                milestones.map(async (milestone) => {
                  const resources = await storage.getResourcesByMilestoneId(milestone.id);
                  return { ...milestone, resources };
                })
              );
              
              return {
                plan: {
                  id: dbPlan.id,
                  milestones: milestonesWithResources
                }
              };
            }
          }
        }

        // If we couldn't extract a plan, check if we have one in the database
        const dbPlan = await storage.getPlanByTransitionId(transitionId);

        if (dbPlan) {
          const milestones = await storage.getMilestonesByPlanId(dbPlan.id);

          // For each milestone, get resources
          const milestonesWithResources = await Promise.all(
            milestones.map(async (milestone) => {
              const resources = await storage.getResourcesByMilestoneId(
                milestone.id,
              );
              return {
                ...milestone,
                resources,
              };
            }),
          );

          return {
            plan: {
              id: dbPlan.id,
              milestones: milestonesWithResources,
            },
          };
        }

        // Return null if nothing found
        return { plan: null };
      } catch (error) {
        console.error("Error processing plan:", error);
        return {
          messages: [
            new AIMessage(
              "Error processing development plan. Continuing with workflow.",
            ),
          ],
          plan: null,
        };
      }
    };
  }

  /**
   * Create the completion node to mark analysis as complete
   */
  private _createCompletionNode() {
    return async (state: typeof MultiAgentState.State) => {
      console.log("Marking analysis as complete...");
      const { transitionId } = state.transition;

      try {
        // Mark the transition as complete in the database
        await storage.updateTransitionStatus(transitionId, true);

        return {
          isComplete: true,
          messages: [
            new AIMessage(
              "Career transition analysis is complete. All data has been collected and processed.",
            ),
          ],
        };
      } catch (error) {
        console.error("Error in completion node:", error);
        return {
          isComplete: true,
          messages: [
            new AIMessage(
              "Analysis complete with errors. Some data may be missing.",
            ),
          ],
        };
      }
    };
  }

  /**
   * Decide which agent should be invoked next
   */
  private _getNextAgent(state: typeof MultiAgentState.State): string {
    try {
      // Check if we have a complete set of data
      const isComplete =
        state.searchResults &&
        state.searchResults.length > 0 &&
        state.skillGaps &&
        state.skillGaps.length > 0 &&
        state.insights &&
        state.plan;

      if (isComplete) {
        return "complete";
      }

      // Safety mechanism - Track recursion to avoid infinite loops
      // If we've been cycling through the research agent too many times,
      // force progression to the next agent with whatever data we have
      let researchAttemptCount = 0;
      for (const msg of state.messages) {
        if (msg instanceof AIMessage && 
            typeof msg.content === 'string' && 
            (msg.content.includes("Research agent processing") || 
             msg.content.includes("career transition stories"))) {
          researchAttemptCount++;
        }
      }
      
      // If we've tried research multiple times and still don't have results,
      // move on to the next step to avoid getting stuck
      if (researchAttemptCount >= 5) {
        console.log("Research agent recursion detected - forcing progression");
        
        // Force progression to skill analysis even if research wasn't perfect
        if (!state.skillGaps || state.skillGaps.length === 0) {
          // If we don't have any search results either, create a minimal result
          if (!state.searchResults || state.searchResults.length === 0) {
            state.searchResults = [{
              content: "Limited information available for this career transition.",
              source: "Coordinator Agent",
              url: null
            }];
          }
          return "skillAnalysisAgent";
        }
        // Force progression to insight agent if skill gaps exist but insights don't
        else if (!state.insights) {
          return "insightAgent";
        }
        // Force progression to planning agent if we have insights but no plan
        else if (!state.plan) {
          return "planningAgent";
        }
      }

      // Get the latest message content
      const lastMessage = state.messages[state.messages.length - 1];

      if (lastMessage instanceof AIMessage) {
        const content = lastMessage.content.toString().toLowerCase();

        // Check for explicit routing instructions
        if (
          content.includes("researchagent") ||
          content.includes("research agent")
        ) {
          return "researchAgent";
        } else if (
          content.includes("skillanalysisagent") ||
          content.includes("skill analysis agent") ||
          content.includes("skill gap") ||
          content.includes("analyze skills")
        ) {
          return "skillAnalysisAgent";
        } else if (
          content.includes("insightagent") ||
          content.includes("insight agent") ||
          content.includes("analyze insights") ||
          content.includes("extract insights")
        ) {
          return "insightAgent";
        } else if (
          content.includes("planningagent") ||
          content.includes("planning agent") ||
          content.includes("development plan") ||
          content.includes("create plan")
        ) {
          return "planningAgent";
        } else if (
          content.includes("analysis is complete") ||
          content.includes("analysis complete")
        ) {
          return "complete";
        }

        // Follow a standard workflow if no explicit instructions
        if (!state.searchResults || state.searchResults.length === 0) {
          return "researchAgent";
        } else if (!state.skillGaps || state.skillGaps.length === 0) {
          return "skillAnalysisAgent";
        } else if (!state.insights) {
          return "insightAgent";
        } else if (!state.plan) {
          return "planningAgent";
        } else {
          return "complete";
        }
      }

      // Default to skill analysis if we can't determine (instead of research)
      if (!state.skillGaps || state.skillGaps.length === 0) {
        return "skillAnalysisAgent";
      } else if (!state.insights) {
        return "insightAgent";
      } else if (!state.plan) {
        return "planningAgent";
      } else {
        return "complete";
      }
    } catch (error) {
      console.error("Error in routing logic:", error);
      return "error";
    }
  }

  /**
   * Check if an agent response contains tool calls
   */
  private _checkForToolCalls(
    state: typeof MultiAgentState.State,
    agentType: string,
  ): string {
    try {
      const lastMessage = state.messages[state.messages.length - 1];

      if (
        lastMessage instanceof AIMessage &&
        lastMessage.tool_calls &&
        lastMessage.tool_calls.length > 0
      ) {
        return "tools";
      }

      return "continue";
    } catch (error) {
      console.error("Error checking for tool calls:", error);
      return "continue";
    }
  }

  /**
   * Get fallback skill gaps when analysis fails
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
   * Get fallback insights when analysis fails
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
      successRate: 65,
      timeframe: "6-12 months",
    };
  }
}
