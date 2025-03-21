/**
 * Simplified LangGraph Career Transition Agent
 * 
 * This implementation uses the simpler LangGraph.js approach from the quickstart docs
 * while preserving all the functionality needed for career transition analysis.
 */
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { storage } from "../storage";
import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";

// Interface for skill gap analysis results
export interface SkillGapAnalysis {
  skillName: string;
  gapLevel: 'Low' | 'Medium' | 'High';
  confidenceScore: number;
  mentionCount: number;
  contextSummary: string;
}

// Define our state using Annotation.Root
const CaraState = Annotation.Root({
  // Messages annotation
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  // Transition info
  transition: Annotation<{
    currentRole: string;
    targetRole: string;
    transitionId: number;
    existingSkills: string[];
  }>({
    reducer: (x, y) => y ?? x,
  }),
  // Search results
  searchResults: Annotation<{
    stories: Array<{
      source: string;
      content: string;
      url: string;
      date: string;
    }>;
    scrapedCount: number;
  }>({
    reducer: (x, y) => y ?? x ?? { stories: [], scrapedCount: 0 },
  }),
  // Skill gaps
  skillGaps: Annotation<SkillGapAnalysis[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  // Insights
  insights: Annotation<any>({
    reducer: (x, y) => y ?? x ?? null,
  }),
  // Plan
  plan: Annotation<any>({
    reducer: (x, y) => y ?? x ?? null,
  }),
  // Current stage
  currentStage: Annotation<'init' | 'scraping' | 'analyzing' | 'planning' | 'complete'>({
    reducer: (x, y) => y ?? x ?? 'init',
  }),
});

// System prompts for different stages
const systemPrompts = {
  general: `You are Cara, an AI career transition advisor. You help people transition from their current role to their target role.
Your expertise includes:
- Finding stories from people who made similar transitions
- Analyzing skill gaps between roles
- Creating personalized development plans
- Recommending learning resources

Be thorough, specific, and action-oriented in your advice.`,

  analyzing: `You are analyzing skill gaps for a career transition. Extract specific skills that are needed for the target role
but might be missing or need development based on the current role and the information provided.
Structure the information clearly and be specific about the gap level.`,

  planning: `You are creating a development plan for a career transition. Focus on actionable steps, with realistic timelines,
prioritized based on skill gap levels. Each milestone should be specific, measurable, and have associated resources.`,

  insights: `You are extracting key insights about a career transition. Look for patterns, common challenges, success factors,
and realistic timelines. Organize the information into clear categories that will be valuable for someone making this transition.`
};

/**
 * Simplified LangGraph Career Transition Agent
 */
export class SimplifiedLangGraphAgent {
  private currentRole: string;
  private targetRole: string;
  private transitionId: number;
  private existingSkills: string[] = [];
  private model: ChatOpenAI;
  private tools: TavilySearchResults[];
  private workflow: any;

  constructor(currentRole: string, targetRole: string, transitionId: number) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
    this.transitionId = transitionId;

    // Initialize the model
    this.model = new ChatOpenAI({
      temperature: 0.7,
      modelName: "gpt-4-turbo-preview",
      streaming: false,
    });

    // Initialize the search tool
    this.tools = [
      new TavilySearchResults({ 
        maxResults: 5,
        apiKey: process.env.TAVILY_API_KEY 
      })
    ];

    // Create the workflow
    this.workflow = this._createWorkflow();
  }

  /**
   * Main method to analyze a career transition
   */
  async analyzeCareerTransition(existingSkills: string[] = []): Promise<{
    skillGaps: SkillGapAnalysis[];
    insights: any;
    scrapedCount: number;
  }> {
    this.existingSkills = existingSkills;
    console.log(`Starting career transition analysis from ${this.currentRole} to ${this.targetRole}`);

    // Clear existing data for this transition to ensure fresh analysis
    await storage.clearTransitionData(this.transitionId);

    try {
      // Initialize the state
      const initialState = {
        messages: [
          new SystemMessage(systemPrompts.general),
          new HumanMessage(`I want to transition from ${this.currentRole} to ${this.targetRole}. Can you help me understand what skills I need and create a development plan?`)
        ],
        transition: {
          currentRole: this.currentRole,
          targetRole: this.targetRole,
          transitionId: this.transitionId,
          existingSkills: this.existingSkills
        },
        searchResults: {
          stories: [],
          scrapedCount: 0
        },
        skillGaps: [],
        insights: null,
        plan: null,
        currentStage: 'init' as 'init' | 'scraping' | 'analyzing' | 'planning' | 'complete'
      };

      // Run the workflow
      const config: RunnableConfig = { 
        recursionLimit: 50,
        tags: ["simplified-langraph-agent"] 
      };

      const finalState = await this.workflow.invoke(initialState, config);

      // Extract and return the results
      return {
        skillGaps: finalState.skillGaps || [],
        insights: finalState.insights || {},
        scrapedCount: finalState.searchResults?.stories?.length || 0
      };
    } catch (error) {
      console.error("Error running career transition analysis:", error);
      // Return a basic result to prevent complete failure
      return {
        skillGaps: [],
        insights: {
          keyObservations: ["Error occurred during analysis"],
          commonChallenges: [],
          successStories: []
        },
        scrapedCount: 0
      };
    }
  }

  /**
   * Create the workflow graph
   */
  private _createWorkflow() {
    // Create tool node for internet search
    const toolNode = new ToolNode(this.tools);

    // Create the LLM node that both uses tools and processes inputs
    const llmWithTools = this.model.bindTools(this.tools);

    // Define the function that determines routing for each node
    const shouldContinue = (state: typeof CaraState.State): "scraping" | "analyzing" | "planning" | "complete" | "tools" | "__end__" => {
      const messages = state.messages;
      const currentStage = state.currentStage;
      const lastMessage = messages[messages.length - 1] as AIMessage;
      
      // If there are tool calls, route to the tools node
      if (lastMessage.tool_calls?.length) {
        return "tools";
      }

      // Check what stage we're in and route accordingly
      if (currentStage === 'init') {
        return "scraping";
      } else if (currentStage === 'scraping') {
        return "analyzing";
      } else if (currentStage === 'analyzing') {
        return "planning";
      } else if (currentStage === 'planning') {
        return "complete";
      }
      
      // If we've completed all stages or can't determine, we end
      return "__end__";
    };

    // Define the model calling function
    const callModel = async (state: typeof CaraState.State) => {
      // Get the current stage
      const currentStage = state.currentStage;
      let systemMessage: SystemMessage;
      
      // Use appropriate system message based on the stage
      if (currentStage === 'analyzing') {
        systemMessage = new SystemMessage(systemPrompts.analyzing);
      } else if (currentStage === 'planning') {
        systemMessage = new SystemMessage(systemPrompts.planning);
      } else if (currentStage === 'scraping') {
        systemMessage = new SystemMessage(systemPrompts.general);
      } else {
        systemMessage = new SystemMessage(systemPrompts.general);
      }

      // Replace the first message if it's a system message
      const messages = [...state.messages];
      if (messages[0] instanceof SystemMessage) {
        messages[0] = systemMessage;
      } else {
        messages.unshift(systemMessage);
      }

      // Call the model
      const response = await llmWithTools.invoke(messages);
      
      return { 
        messages: [response]
      };
    };

    // Define the function for scraping transition stories
    const scrapeStories = async (state: typeof CaraState.State) => {
      console.log("Starting scraping stage");
      
      // Create a search query
      const searchQuery = `career transition stories from ${state.transition.currentRole} to ${state.transition.targetRole} personal experiences real examples`;
      
      // Use the Tavily tool directly to search for stories
      const searchResults = await this.tools[0].invoke(searchQuery);
      
      // Process and store the search results
      let scrapedStories: Array<{
        source: string;
        content: string;
        url: string;
        date: string;
      }> = [];
      
      try {
        // Process each search result
        const results = JSON.parse(searchResults);
        if (Array.isArray(results)) {
          scrapedStories = results.map((result: { title?: string; content?: string; url?: string }) => {
            // Store in the database
            storage.createScrapedData({
              transitionId: state.transition.transitionId,
              source: result.title || "Search Result",
              content: result.content || "",
              url: result.url || null,
              postDate: null,
              skillsExtracted: []
            });
            
            return {
              source: result.title || "Search Result",
              content: result.content || "",
              url: result.url || "",
              date: ""
            };
          });
        }
      } catch (error) {
        console.error("Error processing scraped stories:", error);
      }
      
      // Update the AI message to reflect the results
      const aiMessage = new AIMessage(
        `I've found ${scrapedStories.length} stories about transitioning from ${state.transition.currentRole} to ${state.transition.targetRole}. I'll use these to analyze skill gaps and create a development plan.`
      );
      
      return {
        messages: [...state.messages, aiMessage],
        searchResults: {
          stories: scrapedStories,
          scrapedCount: scrapedStories.length
        },
        currentStage: 'analyzing' as 'analyzing'
      };
    };

    // Define the function for analyzing skill gaps
    const analyzeSkillGaps = async (state: typeof CaraState.State) => {
      console.log("Starting skill gap analysis stage");
      
      // Format the scraped data for the model
      const storiesText = state.searchResults.stories
        .map(story => `Source: ${story.source}\nContent: ${story.content.substring(0, 500)}...\n`)
        .join("\n\n");
      
      // Create a prompt to analyze skill gaps
      const skillGapPrompt = `Based on these transition stories and your knowledge, identify skill gaps for transitioning from ${state.transition.currentRole} to ${state.transition.targetRole}:
      
Stories:
${storiesText}

Please identify the key skills needed for ${state.transition.targetRole} role that might be missing or underdeveloped in someone coming from ${state.transition.currentRole}.
      
For each skill, provide:
1. Skill name
2. Gap level (Low, Medium, High)
3. Confidence score (0-100)
4. Number of mentions in stories
5. Brief context summary

Format as JSON with these fields for each skill. All fields are required.`;
      
      // Add the skill gap prompt to the messages
      const messages = [...state.messages, new HumanMessage(skillGapPrompt)];
      
      // Call the model
      const response = await llmWithTools.invoke(messages);
      
      // Process skill gaps from the response
      let skillGaps: SkillGapAnalysis[] = [];
      
      try {
        // Extract JSON from the response
        const jsonMatch = String(response.content).match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          const parsedSkills = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsedSkills)) {
            skillGaps = parsedSkills.map((skill: { 
              skillName: string; 
              gapLevel: 'Low' | 'Medium' | 'High'; 
              confidenceScore: number; 
              mentionCount: number;
              contextSummary: string;
            }) => {
              // Store in the database
              storage.createSkillGap({
                transitionId: state.transition.transitionId,
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
        console.error("Error processing skill gaps:", error);
      }
      
      // Create an AI message to summarize the findings
      const aiMessage = new AIMessage(
        `I've identified ${skillGaps.length} skill gaps for your transition from ${state.transition.currentRole} to ${state.transition.targetRole}. Now I'll create a development plan based on these gaps.`
      );
      
      return {
        messages: [...messages, response, aiMessage],
        skillGaps,
        currentStage: 'planning' as 'planning'
      };
    };

    // Define the function for creating a development plan
    const createPlan = async (state: typeof CaraState.State) => {
      console.log("Starting planning stage");
      
      // Format the skill gaps for the model
      const skillGapsText = state.skillGaps
        .map(gap => `${gap.skillName} - ${gap.gapLevel} gap (${gap.mentionCount} mentions): ${gap.contextSummary || ''}`)
        .join("\n");
      
      // Create a prompt to generate a development plan
      const planPrompt = `Based on the identified skill gaps for transitioning from ${state.transition.currentRole} to ${state.transition.targetRole}, create a comprehensive development plan:
      
Skill Gaps:
${skillGapsText}

Please create a structured development plan with:
1. 4-6 milestone phases in logical order
2. For each milestone:
   - Clear title
   - Brief description
   - Priority (Low, Medium, High)
   - Duration in weeks
   - Related skills addressed
   - 2-3 specific learning resources (title, URL, type)

Format as JSON with these fields. All fields are required.`;
      
      // Add the plan prompt to the messages
      const messages = [...state.messages, new HumanMessage(planPrompt)];
      
      // Call the model
      const response = await llmWithTools.invoke(messages);
      
      // Process the plan from the response
      let plan = null;
      
      try {
        // Create a plan in the database
        const dbPlan = await storage.createPlan({
          transitionId: state.transition.transitionId
        });
        
        // Extract JSON from the response
        const jsonMatch = String(response.content).match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          const parsedMilestones = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsedMilestones)) {
            // Store milestones in the database
            for (let i = 0; i < parsedMilestones.length; i++) {
              const m = parsedMilestones[i];
              const milestone = await storage.createMilestone({
                planId: dbPlan.id,
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
                  await storage.createResource({
                    milestoneId: milestone.id,
                    title: r.title,
                    url: r.url,
                    type: r.type || "website"
                  });
                }
              }
            }
            
            plan = {
              id: dbPlan.id,
              milestones: parsedMilestones
            };
          }
        }
      } catch (error) {
        console.error("Error processing plan:", error);
      }
      
      // Generate insights about the transition
      const insightsPrompt = `Based on the transition stories and skill gaps collected for the ${state.transition.currentRole} to ${state.transition.targetRole} transition, generate key insights about this career path. Include:
      
1. Common challenges and how people overcame them
2. Typical timeframe for the transition
3. Success factors that appeared repeatedly
4. Warning signs or pitfalls to avoid

Format as a JSON object with these categories.`;
      
      // Add the insights prompt to the messages
      const insightsMessages = [...state.messages, new HumanMessage(insightsPrompt)];
      
      // Call the model for insights
      const insightsResponse = await llmWithTools.invoke(insightsMessages);
      
      // Process insights from the response
      let insights = null;
      
      try {
        // Extract JSON from the response
        const jsonMatch = String(insightsResponse.content).match(/\{.*\}/s);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
          
          // Store insights in the database
          for (const challenge of insights.commonChallenges || []) {
            await storage.createInsight({
              transitionId: state.transition.transitionId,
              type: "challenge",
              content: challenge,
              source: null,
              date: null,
              experienceYears: null
            });
          }
          
          for (const observation of insights.keyObservations || []) {
            await storage.createInsight({
              transitionId: state.transition.transitionId,
              type: "observation",
              content: observation,
              source: null,
              date: null,
              experienceYears: null
            });
          }
        }
      } catch (error) {
        console.error("Error processing insights:", error);
      }
      
      // Create a summary message
      const finalMessage = new AIMessage(
        `I've completed my analysis of your transition from ${state.transition.currentRole} to ${state.transition.targetRole}. I've created a development plan with ${plan?.milestones?.length || 0} milestones, identified ${state.skillGaps.length} skill gaps, and gathered insights about the transition process. You can now explore the detailed results.`
      );
      
      return {
        messages: [...messages, response, finalMessage],
        plan,
        insights,
        currentStage: 'complete' as 'complete'
      };
    };

    // Define the cleanup function for marking the transition as complete
    const completeTransition = async (state: typeof CaraState.State) => {
      try {
        // Mark the transition as complete in the database
        await storage.updateTransitionStatus(state.transition.transitionId, true);
        
        return {
          messages: [...state.messages]
        };
      } catch (error) {
        console.error("Error completing transition:", error);
        return {
          messages: [...state.messages]
        };
      }
    };

    // Create the graph
    const graph = new StateGraph(CaraState)
      .addNode("agent", callModel)
      .addNode("tools", toolNode)
      .addNode("scraping", scrapeStories)
      .addNode("analyzing", analyzeSkillGaps)
      .addNode("planning", createPlan)
      .addNode("complete", completeTransition)
      
      // Define the starting point
      .addEdge("__start__", "agent")
      
      // Define edges from agent to other nodes
      .addConditionalEdges(
        "agent",
        (state) => {
          const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
          
          // Check for tool calls first
          if (lastMessage.tool_calls?.length) {
            return "tools";
          }
          
          // Check current stage and route accordingly
          switch(state.currentStage) {
            case 'init':
              return "scraping";
            case 'scraping':
              return "analyzing";
            case 'analyzing':
              return "planning";
            case 'planning':
              return "complete";
            default:
              return "complete";
          }
        },
        ["tools", "scraping", "analyzing", "planning", "complete"]
      )
      
      // Define the return edges
      .addEdge("tools", "agent")
      .addEdge("scraping", "agent")
      .addEdge("analyzing", "agent")
      .addEdge("planning", "agent")
      .addEdge("complete", "__end__");

    // Compile the graph
    return graph.compile();
  }

  /**
   * Safe JSON parser that can handle different input types
   */
  private safeParseJSON(text: any) {
    // Convert MessageContent to string if needed
    if (typeof text !== 'string') {
      try {
        text = typeof text === 'object' ? JSON.stringify(text) : String(text);
      } catch (error) {
        console.error("Failed to convert input to string:", error);
        text = "";
      }
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      // Try to find a JSON object in the text
      try {
        let jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (!jsonMatch) {
          console.error("Failed to extract JSON from text:", error);
          return null;
        }
        text = jsonMatch[0];
        return JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse extracted JSON:", e);
        return null;
      }
    }
  }
}