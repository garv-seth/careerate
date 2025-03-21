/**
 * LangGraph-based Career Transition Agent (Cara)
 * 
 * This file implements Cara using LangGraph, a framework for building
 * orchestrated agents with controllable actions and flows.
 */
import { ChatOpenAI } from "@langchain/openai";
import { 
  StateGraph, 
  MessagesAnnotation, 
  MemorySaver 
} from "@langchain/langgraph";
import { AIMessage, HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { StructuredTool } from "@langchain/core/tools";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { storage } from '../storage';
import { 
  CareerTransitionSearch, 
  SkillGapSearch, 
  LearningResourceSearch 
} from '../tools/tavilySearch';
import { SkillGapAnalysis } from '../apis/perplexity-unified';

// Define a type for MessagesState to replace the missing import
type MessagesState = BaseMessage[];

// Define the types for CaraAgentState
export interface CaraAgentState {
  messages: MessagesState;
  transition: {
    currentRole: string;
    targetRole: string;
    transitionId: number;
  };
  searchResults: {
    stories: Array<{
      source: string;
      content: string;
      url: string;
      date: string;
    }>;
    scrapedCount: number;
  };
  skillGaps: SkillGapAnalysis[];
  existingSkills: string[];
  insights: any;
  plan: any;
  currentStage: 'init' | 'scraping' | 'analyzing' | 'planning' | 'complete';
}

// Cara system prompts for different stages
const caraSystemPrompts = {
  // General system prompt for Cara
  general: `You are Cara, an AI Career Assistant specialized in analyzing career transitions.
You help users understand the skills, challenges, and steps needed to transition from one career to another.
You always provide data-backed insights based on real experiences from professionals who have made similar transitions.`,

  // Prompt for the scraping stage - finding transition stories
  scraping: `As Cara, focus on gathering relevant transition stories from various sources.
Search for real experiences of professionals who have successfully transitioned from the user's current role to their target role.
Look for patterns, challenges, timeframes, and strategies that were effective.
Format each story with its source, main content highlights, url, and date when available.`,

  // Prompt for analyzing skill gaps
  analyzing: `As Cara, analyze the collected transition stories to identify skill gaps between the current and target roles.
For each skill gap identified, assess:
1. Gap Level (Low/Medium/High)
2. Confidence Score (0-100)
3. Mention Count across stories
4. Context summary explaining the skill's importance
Consider both technical and soft skills in your analysis.`,

  // Prompt for generating insights
  insights: `As Cara, extract meaningful insights from the transition stories.
Identify:
1. Common challenges faced during the transition
2. Typical transition timeframe
3. Most effective strategies used by successful professionals
4. Warning signs or pitfalls to avoid
Always ground your insights in the collected data, not general career advice.`,

  // Prompt for creating a development plan
  planning: `As Cara, create a comprehensive development plan to bridge the identified skill gaps.
For each significant skill gap, create:
1. A milestone with clear objectives
2. Estimated time to complete (in weeks)
3. Priority level (Low/Medium/High)
4. Specific learning resources (courses, books, projects)
The plan should be practical, focused on the most critical skills first, and adaptable to the user's situation.`
};

// Create a LangGraph-based Cara Agent
export class LangGraphCaraAgent {
  private currentRole: string;
  private targetRole: string;
  private transitionId: number;
  private existingSkills: string[] = [];
  private model: ChatOpenAI;
  private tools: StructuredTool[];
  private memorySaver: MemorySaver;
  private app: any; // Using any type to avoid compilation issues with StateGraph types

  constructor(currentRole: string, targetRole: string, transitionId: number) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
    this.transitionId = transitionId;
    
    // Initialize the LLM
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.2,
      streaming: true,
    });
    
    // Initialize the tools
    this.tools = [
      new CareerTransitionSearch(),
      new SkillGapSearch(),
      new LearningResourceSearch(),
      new TavilySearchResults({ 
        maxResults: 5,
        apiKey: process.env.TAVILY_API_KEY
      }),
    ];
    
    // Initialize memory for persistence
    this.memorySaver = new MemorySaver();
    
    // Create and compile the workflow
    const workflow = this.createWorkflow();
    this.app = workflow.compile();
  }
  
  /**
   * Create the LangGraph workflow for Cara
   */
  private createWorkflow() {
    // Define the initial state for Cara
    const initialState: CaraAgentState = {
      messages: [],
      transition: {
        currentRole: this.currentRole,
        targetRole: this.targetRole,
        transitionId: this.transitionId
      },
      searchResults: {
        stories: [],
        scrapedCount: 0
      },
      skillGaps: [],
      existingSkills: this.existingSkills,
      insights: null,
      plan: null,
      currentStage: 'init'
    };

    // Create a new StateGraph
    const workflow = new StateGraph<CaraAgentState>({
      channels: {
        messages: MessagesAnnotation,
        transition: {},
        searchResults: {},
        skillGaps: {},
        existingSkills: {},
        insights: {},
        plan: {},
        currentStage: {}
      }
    })
      .withCheckpointer(this.memorySaver)
      .withConfig({ recursionLimit: 20 });
      
    // Define the nodes for each stage of the workflow
    
    // Initialize stage
    workflow.addNode("initialize", async (state) => {
      // Create a system message
      const systemMessage = new SystemMessage(caraSystemPrompts.general);
      
      // Create a human message with the transition details
      const humanMessage = new HumanMessage(
        `I want to transition from ${state.transition.currentRole} to ${state.transition.targetRole}. Can you help me understand what skills I need and create a development plan?`
      );
      
      return {
        messages: [systemMessage, humanMessage],
        currentStage: 'scraping' as const
      };
    });
    
    // Scraping stage
    workflow.addNode("scrape_transition_stories", async (state) => {
      console.log("Starting scraping stage");
      
      // Add a system message for the scraping stage
      const scrapingSystemMessage = new SystemMessage(caraSystemPrompts.scraping);
      
      // Create a sequence for scraping transition stories
      const scrapingSequence = RunnableSequence.from([
        // First, use the career transition search tool
        async () => {
          const transitionSearch = new CareerTransitionSearch();
          const searchResults = await transitionSearch._call({
            query: "career transition experiences success stories challenges",
            currentRole: state.transition.currentRole,
            targetRole: state.transition.targetRole
          });
          
          return `I've found the following information about transitions from ${state.transition.currentRole} to ${state.transition.targetRole}:\n\n${searchResults}`;
        },
        // Then process the search results with the LLM
        async (searchContext) => {
          // Construct a prompt for the LLM
          const processPrompt = `
          You've searched for transition stories from ${state.transition.currentRole} to ${state.transition.targetRole}.
          
          Here's what was found:
          ${searchContext}
          
          Extract and format 5-10 distinct transition stories from the search results.
          For each story, provide:
          1. Source (website/platform)
          2. Content (key points of the transition story)
          3. URL (if available)
          4. Date (if available)
          
          Format as a JSON array of objects with these fields.
          `;
          
          // Use the LLM to process the search results
          const processResponse = await this.model.invoke([
            new SystemMessage(caraSystemPrompts.scraping),
            new HumanMessage(processPrompt)
          ]);
          
          return processResponse.content;
        },
        // Parse the response to extract the stories
        async (storiesResponse) => {
          try {
            // Extract JSON from the response
            const jsonMatch = String(storiesResponse).match(/\[\s*\{.*\}\s*\]/s);
            let storiesJson;
            
            if (jsonMatch) {
              storiesJson = JSON.parse(jsonMatch[0]);
            } else {
              // Try to parse the entire response as JSON
              storiesJson = JSON.parse(String(storiesResponse));
            }
            
            // Ensure it's an array
            const stories = Array.isArray(storiesJson) ? storiesJson : [];
            
            // Save the scraped data to the database
            for (const story of stories) {
              await storage.createScrapedData({
                transitionId: state.transition.transitionId,
                source: story.source || "Unknown",
                content: story.content || "",
                url: story.url || null,
                postDate: story.date || null,
                skillsExtracted: []
              });
            }
            
            // Return the stories and update the count
            return {
              stories,
              scrapedCount: stories.length
            };
          } catch (error) {
            console.error("Error parsing stories:", error);
            return {
              stories: [],
              scrapedCount: 0
            };
          }
        }
      ]);
      
      // Execute the scraping sequence
      const scraped = await scrapingSequence.invoke({});
      
      // Create an AI message to summarize the scraping results
      const aiMessage = new AIMessage(
        `I've found ${scraped.scrapedCount} transition stories from ${state.transition.currentRole} to ${state.transition.targetRole}. I'll now analyze these to identify skill gaps.`
      );
      
      return {
        messages: [...state.messages, aiMessage],
        searchResults: scraped,
        currentStage: 'analyzing' as const
      };
    });
    
    // Skill gap analysis stage
    workflow.addNode("analyze_skill_gaps", async (state) => {
      console.log("Starting skill gap analysis stage");
      
      // Add a system message for the analyzing stage
      const analyzingSystemMessage = new SystemMessage(caraSystemPrompts.analyzing);
      
      // Create a sequence for analyzing skill gaps
      const skillGapSequence = RunnableSequence.from([
        // First, extract all the content from the scraped stories
        async () => {
          const storiesContent = state.searchResults.stories
            .map(story => story.content)
            .join("\n\n");
          
          return `Here are the transition stories I've collected:\n\n${storiesContent}`;
        },
        // Then analyze the skill gaps
        async (storiesContent) => {
          // Construct a prompt for the LLM
          const skillGapPrompt = `
          Analyze these transition stories from ${state.transition.currentRole} to ${state.transition.targetRole}.
          
          ${storiesContent}
          
          Extract and analyze skill gaps between these roles. For each skill:
          1. skillName: Name of the skill
          2. gapLevel: "Low", "Medium", or "High"
          3. confidenceScore: Number between 0-100
          4. mentionCount: How many times the skill was mentioned
          5. contextSummary: Brief explanation of the skill's importance
          
          Format as a JSON array of objects with these fields.
          `;
          
          // Use the LLM to analyze the skill gaps
          const skillGapResponse = await this.model.invoke([
            analyzingSystemMessage,
            new HumanMessage(skillGapPrompt)
          ]);
          
          return skillGapResponse.content;
        },
        // Parse the response to extract the skill gaps
        async (skillGapResponse) => {
          try {
            // Extract JSON from the response
            const jsonMatch = String(skillGapResponse).match(/\[\s*\{.*\}\s*\]/s);
            let skillGapsJson;
            
            if (jsonMatch) {
              skillGapsJson = JSON.parse(jsonMatch[0]);
            } else {
              // Try to parse the entire response as JSON
              skillGapsJson = JSON.parse(String(skillGapResponse));
            }
            
            // Ensure it's an array
            const skillGaps = Array.isArray(skillGapsJson) ? skillGapsJson : [];
            
            // Save the skill gaps to the database
            for (const gap of skillGaps) {
              await storage.createSkillGap({
                transitionId: state.transition.transitionId,
                skillName: gap.skillName,
                gapLevel: gap.gapLevel as "Low" | "Medium" | "High",
                confidenceScore: gap.confidenceScore,
                mentionCount: gap.mentionCount
              });
            }
            
            return skillGaps;
          } catch (error) {
            console.error("Error parsing skill gaps:", error);
            return [];
          }
        }
      ]);
      
      // Execute the skill gap analysis sequence
      const skillGaps = await skillGapSequence.invoke({});
      
      // Create an AI message to summarize the skill gap analysis
      const aiMessage = new AIMessage(
        `I've identified ${skillGaps.length} skill gaps for your transition from ${state.transition.currentRole} to ${state.transition.targetRole}. I'll now generate insights about this career path.`
      );
      
      return {
        messages: [...state.messages, aiMessage],
        skillGaps,
        currentStage: 'planning' as const
      };
    });
    
    // Generate insights stage
    workflow.addNode("generate_insights", async (state) => {
      console.log("Starting insights generation stage");
      
      // Add a system message for the insights stage
      const insightsSystemMessage = new SystemMessage(caraSystemPrompts.insights);
      
      // Create a sequence for generating insights
      const insightsSequence = RunnableSequence.from([
        // First, gather all the data we have so far
        async () => {
          const storiesContent = state.searchResults.stories
            .map(story => story.content)
            .join("\n\n");
          
          const skillGapsContent = state.skillGaps
            .map(gap => `${gap.skillName} - ${gap.gapLevel} gap (${gap.mentionCount} mentions)`)
            .join("\n");
          
          return `
          Transition stories:
          ${storiesContent}
          
          Identified skill gaps:
          ${skillGapsContent}
          `;
        },
        // Then generate insights
        async (allData) => {
          // Construct a prompt for the LLM
          const insightsPrompt = `
          Based on the transition stories and skill gaps collected for the ${state.transition.currentRole} to ${state.transition.targetRole} transition:
          
          ${allData}
          
          Generate key insights about this career transition. Include:
          1. Common challenges and how people overcame them
          2. Typical timeframe for the transition
          3. Success factors that appeared repeatedly
          4. Warning signs or pitfalls to avoid
          
          Format as a JSON object with these categories.
          `;
          
          // Use the LLM to generate insights
          const insightsResponse = await this.model.invoke([
            insightsSystemMessage,
            new HumanMessage(insightsPrompt)
          ]);
          
          return insightsResponse.content;
        },
        // Parse the response to extract the insights
        async (insightsResponse) => {
          try {
            // Extract JSON from the response
            const jsonMatch = String(insightsResponse).match(/\{.*\}/s);
            let insightsJson;
            
            if (jsonMatch) {
              insightsJson = JSON.parse(jsonMatch[0]);
            } else {
              // Try to parse the entire response as JSON
              insightsJson = JSON.parse(String(insightsResponse));
            }
            
            // Save the insights to the database
            for (const type in insightsJson) {
              const content = Array.isArray(insightsJson[type])
                ? insightsJson[type].join("\n")
                : String(insightsJson[type]);
              
              await storage.createInsight({
                transitionId: state.transition.transitionId,
                type: "observation",
                content,
                source: null,
                date: null,
                experienceYears: null
              });
            }
            
            return insightsJson;
          } catch (error) {
            console.error("Error parsing insights:", error);
            return {};
          }
        }
      ]);
      
      // Execute the insights generation sequence
      const insights = await insightsSequence.invoke({});
      
      // Create an AI message to summarize the insights
      const aiMessage = new AIMessage(
        `I've generated insights about the transition from ${state.transition.currentRole} to ${state.transition.targetRole}. Now I'll create a development plan to help you bridge the skill gaps.`
      );
      
      return {
        messages: [...state.messages, aiMessage],
        insights,
        currentStage: 'planning' as const
      };
    });
    
    // Development plan stage
    workflow.addNode("create_development_plan", async (state) => {
      console.log("Starting development plan stage");
      
      // Add a system message for the planning stage
      const planningSystemMessage = new SystemMessage(caraSystemPrompts.planning);
      
      // Create a sequence for generating a development plan
      const planSequence = RunnableSequence.from([
        // First, gather all the skill gaps
        async () => {
          const skillGapsContent = state.skillGaps
            .map(gap => `${gap.skillName} - ${gap.gapLevel} gap (${gap.mentionCount} mentions): ${gap.contextSummary || ''}`)
            .join("\n\n");
          
          return `Skill gaps to address:\n${skillGapsContent}`;
        },
        // Then create a development plan
        async (skillGapsContent) => {
          // Construct a prompt for the LLM
          const planPrompt = `
          Create a development plan for transitioning from ${state.transition.currentRole} to ${state.transition.targetRole}.
          
          Here are the skill gaps that need to be addressed:
          ${skillGapsContent}
          
          Create a plan with:
          1. A series of milestones (5-7) focused on acquiring the most critical skills first
          2. For each milestone:
             - title: Clear title
             - description: Detailed description
             - priority: "Low", "Medium", or "High"
             - durationWeeks: Estimated weeks to complete
             - order: Sequence number
             - resources: List of learning resources (title, url, type)
          
          Format as a JSON object with "milestones" array.
          `;
          
          // Use the LLM to create a development plan
          const planResponse = await this.model.invoke([
            planningSystemMessage,
            new HumanMessage(planPrompt)
          ]);
          
          return planResponse.content;
        },
        // Parse the response to extract the plan
        async (planResponse) => {
          try {
            // Extract JSON from the response
            const jsonMatch = String(planResponse).match(/\{.*\}/s);
            let planJson;
            
            if (jsonMatch) {
              planJson = JSON.parse(jsonMatch[0]);
            } else {
              // Try to parse the entire response as JSON
              planJson = JSON.parse(String(planResponse));
            }
            
            // Ensure we have milestones
            const milestones = planJson.milestones || [];
            
            // Save the plan and milestones to the database
            const plan = await storage.createPlan({
              transitionId: state.transition.transitionId
            });
            
            for (const milestone of milestones) {
              const newMilestone = await storage.createMilestone({
                planId: plan.id,
                title: milestone.title,
                description: milestone.description,
                priority: milestone.priority,
                durationWeeks: milestone.durationWeeks,
                order: milestone.order,
                progress: 0
              });
              
              // Save the resources for this milestone
              if (Array.isArray(milestone.resources)) {
                for (const resource of milestone.resources) {
                  await storage.createResource({
                    milestoneId: newMilestone.id,
                    title: resource.title,
                    url: resource.url,
                    type: resource.type
                  });
                }
              }
            }
            
            return {
              plan,
              milestones
            };
          } catch (error) {
            console.error("Error parsing plan:", error);
            return {
              plan: null,
              milestones: []
            };
          }
        }
      ]);
      
      // Execute the plan creation sequence
      const planResult = await planSequence.invoke({});
      
      // Create an AI message to summarize the plan
      const aiMessage = new AIMessage(
        `I've created a development plan with ${planResult.milestones.length} milestones to help you transition from ${state.transition.currentRole} to ${state.transition.targetRole}. The plan focuses on bridging the identified skill gaps with practical learning resources.`
      );
      
      // Update the transition to mark it as complete
      await storage.updateTransitionStatus(state.transition.transitionId, true);
      
      return {
        messages: [...state.messages, aiMessage],
        plan: planResult,
        currentStage: 'complete' as const
      };
    });
    
    // Define the edges of the workflow
    workflow.addEdge("__start__", "initialize");
    workflow.addEdge("initialize", "scrape_transition_stories");
    workflow.addEdge("scrape_transition_stories", "analyze_skill_gaps");
    workflow.addEdge("analyze_skill_gaps", "generate_insights");
    workflow.addEdge("generate_insights", "create_development_plan");
    
    return workflow;
  }
  
  /**
   * Main method to perform a complete career transition analysis
   * This is the public API for using the LangGraph Cara Agent
   */
  async analyzeCareerTransition(existingSkills: string[] = []): Promise<{
    skillGaps: SkillGapAnalysis[];
    insights: any;
    scrapedCount: number;
  }> {
    try {
      console.log(`LangGraph Cara is analyzing transition from ${this.currentRole} to ${this.targetRole}`);
      this.existingSkills = existingSkills;
      
      // Create a unique thread ID for this transition analysis
      const threadId = `transition_${this.transitionId}`;
      
      // Run the workflow
      const finalState = await this.app.invoke(
        {}, // Empty initial state - the workflow will initialize it
        { configurable: { thread_id: threadId } }
      );
      
      console.log(`LangGraph Cara completed analysis with ${finalState.skillGaps.length} skill gaps identified`);
      
      // Return the results in the same format as the original CaraAgent
      return {
        skillGaps: finalState.skillGaps,
        insights: finalState.insights,
        scrapedCount: finalState.searchResults.scrapedCount
      };
    } catch (error) {
      console.error("Error in LangGraph Cara:", error);
      throw error;
    }
  }
}