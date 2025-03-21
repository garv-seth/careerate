/**
 * LangGraph-based Career Transition Agent (Cara)
 * 
 * This file implements Cara using LangGraph, a framework for building
 * orchestrated agents with controllable actions and flows.
 */
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { StructuredTool } from "@langchain/core/tools";
import { storage } from "../storage";
import { CareerTransitionSearch, SkillGapSearch, LearningResourceSearch } from "../tools/tavilySearch";

// Define our own skill gap analysis interface to avoid dependency on the Perplexity API file
export interface SkillGapAnalysis {
  skillName: string;
  gapLevel: 'Low' | 'Medium' | 'High';
  confidenceScore: number;
  mentionCount: number;
  contextSummary: string;
}

// System prompts for different stages
const caraSystemPrompts = {
  general: `You are Cara, an AI career transition assistant. 
  You help professionals navigate career transitions by analyzing real-world data,
  identifying skill gaps, and creating personalized development plans.
  Be informative, encouraging, and practical in your guidance.`,
  
  scraping: `As a career transition assistant, search for and extract stories from people
  who have successfully transitioned between similar roles. Focus on finding actionable
  patterns and insights from real experiences.`,
  
  analyzing: `Analyze career transition stories to identify skill gaps between roles.
  For each skill, determine its importance, the difficulty of acquiring it,
  and how critical it is for the target role.`,
  
  insights: `Generate insights from career transition data to help the user understand
  the journey ahead. Identify common challenges, success factors, and realistic
  timeframes based on real-world experiences.`,
  
  planning: `Create a step-by-step development plan to bridge identified skill gaps.
  Focus on creating practical milestones with specific resources for each skill.
  Prioritize skills that will have the highest impact on the transition.`
};

// Interface for the state of the Cara agent
export interface CaraAgentState {
  messages: BaseMessage[];
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

/**
 * LangGraph-based implementation of Cara Agent
 * 
 * This implementation uses a simplified approach that avoids the StateGraph typing issues.
 * Instead of using StateGraph directly, we implement the workflow logic manually.
 */
export class LangGraphCaraAgent {
  private currentRole: string;
  private targetRole: string;
  private transitionId: number;
  private existingSkills: string[] = [];
  private model: ChatOpenAI;
  private tools: StructuredTool[];
  
  constructor(currentRole: string, targetRole: string, transitionId: number) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
    this.transitionId = transitionId;
    
    // Initialize the OpenAI model
    this.model = new ChatOpenAI({
      temperature: 0.7,
      modelName: "gpt-4-turbo-preview",
      streaming: false,
    });
    
    // Initialize tools
    this.tools = [
      new CareerTransitionSearch(),
      new SkillGapSearch(),
      new LearningResourceSearch()
    ];
  }
  
  /**
   * Main method to perform a complete career transition analysis
   * This is the public API for using the LangGraph Cara Agent
   * 
   * Instead of using StateGraph with its type issues, we implement
   * the workflow logic manually with the same steps
   */
  async analyzeCareerTransition(existingSkills: string[] = []): Promise<{
    skillGaps: SkillGapAnalysis[];
    insights: any;
    scrapedCount: number;
  }> {
    this.existingSkills = existingSkills;
    console.log(`Starting career transition analysis from ${this.currentRole} to ${this.targetRole}`);
    
    // Initialize the state manually
    const state: CaraAgentState = {
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
    
    try {
      // Step 1: Initialize
      await this.initializeAgent(state);
      
      // Step 2: Scrape transition stories
      await this.scrapeTransitionStories(state);
      
      // Step 3: Analyze skill gaps
      await this.analyzeSkillGaps(state);
      
      // Step 4: Generate insights
      await this.generateInsights(state);
      
      // Step 5: Create development plan
      await this.createDevelopmentPlan(state);
      
      console.log(`Career transition analysis complete: ${state.currentStage}`);
      
      // Return the results
      return {
        skillGaps: state.skillGaps || [],
        insights: state.insights || {},
        scrapedCount: state.searchResults?.scrapedCount || 0
      };
    } catch (error) {
      console.error("Error running career transition analysis:", error);
      throw error;
    }
  }
  
  /**
   * Initialize the agent with system messages
   */
  private async initializeAgent(state: CaraAgentState): Promise<void> {
    // Create a system message
    const systemMessage = new SystemMessage(caraSystemPrompts.general);
    
    // Create a human message with the transition details
    const humanMessage = new HumanMessage(
      `I want to transition from ${state.transition.currentRole} to ${state.transition.targetRole}. Can you help me understand what skills I need and create a development plan?`
    );
    
    // Update the state
    state.messages = [systemMessage, humanMessage];
    state.currentStage = 'scraping';
  }
  
  /**
   * Scrape transition stories from the web
   */
  private async scrapeTransitionStories(state: CaraAgentState): Promise<void> {
    console.log("Starting scraping stage");
    
    // Use the career transition search tool
    const transitionSearch = new CareerTransitionSearch();
    const searchResults = await transitionSearch._call({
      query: "career transition experiences success stories challenges",
      currentRole: state.transition.currentRole,
      targetRole: state.transition.targetRole
    });
    
    // Process the search results with the LLM
    const processPrompt = `
    You've searched for transition stories from ${state.transition.currentRole} to ${state.transition.targetRole}.
    
    Here's what was found:
    ${searchResults}
    
    Extract and format 5-10 distinct transition stories from the search results.
    For each story, provide:
    1. Source (website/platform)
    2. Content (key points of the transition story)
    3. URL (if available)
    4. Date (if available)
    
    Format as a JSON array of objects with these fields.
    `;
    
    // Use the LLM to process the results
    const processResponse = await this.model.invoke([
      new SystemMessage(caraSystemPrompts.scraping),
      new HumanMessage(processPrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(processResponse.content).match(/\[\s*\{.*\}\s*\]/s);
      let storiesJson;
      
      if (jsonMatch) {
        storiesJson = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        storiesJson = JSON.parse(String(processResponse.content));
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
      
      // Update the state
      state.searchResults = {
        stories,
        scrapedCount: stories.length
      };
      
      // Add an AI message
      const aiMessage = new AIMessage(
        `I've found ${stories.length} transition stories from ${state.transition.currentRole} to ${state.transition.targetRole}. I'll now analyze these to identify skill gaps.`
      );
      state.messages.push(aiMessage);
      state.currentStage = 'analyzing';
      
    } catch (error) {
      console.error("Error parsing stories:", error);
      state.searchResults = {
        stories: [],
        scrapedCount: 0
      };
      state.currentStage = 'analyzing';
    }
  }
  
  /**
   * Analyze skill gaps based on the transition stories
   */
  private async analyzeSkillGaps(state: CaraAgentState): Promise<void> {
    console.log("Starting skill gap analysis stage");
    
    // Extract content from scraped stories
    const storiesContent = state.searchResults.stories
      .map((story: {source: string; content: string; url: string; date: string}) => story.content)
      .join("\n\n");
    
    // Construct the skill gap prompt
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
      new SystemMessage(caraSystemPrompts.analyzing),
      new HumanMessage(skillGapPrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(skillGapResponse.content).match(/\[\s*\{.*\}\s*\]/s);
      let skillGapsJson;
      
      if (jsonMatch) {
        skillGapsJson = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        skillGapsJson = JSON.parse(String(skillGapResponse.content));
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
      
      // Update the state
      state.skillGaps = skillGaps;
      
      // Add an AI message
      const aiMessage = new AIMessage(
        `I've identified ${skillGaps.length} skill gaps for your transition from ${state.transition.currentRole} to ${state.transition.targetRole}. I'll now generate insights about this career path.`
      );
      state.messages.push(aiMessage);
      
    } catch (error) {
      console.error("Error parsing skill gaps:", error);
      state.skillGaps = [];
    }
    
    state.currentStage = 'planning';
  }
  
  /**
   * Generate insights based on the transition stories and skill gaps
   */
  private async generateInsights(state: CaraAgentState): Promise<void> {
    console.log("Starting insights generation stage");
    
    // Gather data for insights generation
    const storiesContent = state.searchResults.stories
      .map((story: {source: string; content: string; url: string; date: string}) => story.content)
      .join("\n\n");
    
    const skillGapsContent = state.skillGaps
      .map((gap: SkillGapAnalysis) => `${gap.skillName} - ${gap.gapLevel} gap (${gap.mentionCount} mentions)`)
      .join("\n");
    
    // Construct the insights prompt
    const insightsPrompt = `
    Based on the transition stories and skill gaps collected for the ${state.transition.currentRole} to ${state.transition.targetRole} transition:
    
    Transition stories:
    ${storiesContent}
    
    Identified skill gaps:
    ${skillGapsContent}
    
    Generate key insights about this career transition. Include:
    1. Common challenges and how people overcame them
    2. Typical timeframe for the transition
    3. Success factors that appeared repeatedly
    4. Warning signs or pitfalls to avoid
    
    Format as a JSON object with these categories.
    `;
    
    // Use the LLM to generate insights
    const insightsResponse = await this.model.invoke([
      new SystemMessage(caraSystemPrompts.insights),
      new HumanMessage(insightsPrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(insightsResponse.content).match(/\{.*\}/s);
      let insightsJson;
      
      if (jsonMatch) {
        insightsJson = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        insightsJson = JSON.parse(String(insightsResponse.content));
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
      
      // Update the state
      state.insights = insightsJson;
      
      // Add an AI message
      const aiMessage = new AIMessage(
        `I've generated insights about the transition from ${state.transition.currentRole} to ${state.transition.targetRole}. Now I'll create a development plan to help you bridge the skill gaps.`
      );
      state.messages.push(aiMessage);
      
    } catch (error) {
      console.error("Error parsing insights:", error);
      state.insights = {};
    }
  }
  
  /**
   * Create a development plan based on the skill gaps
   */
  private async createDevelopmentPlan(state: CaraAgentState): Promise<void> {
    console.log("Starting development plan stage");
    
    // Gather skill gap content for the plan
    const skillGapsContent = state.skillGaps
      .map((gap: SkillGapAnalysis) => `${gap.skillName} - ${gap.gapLevel} gap (${gap.mentionCount} mentions): ${gap.contextSummary || ''}`)
      .join("\n\n");
    
    // Construct the plan prompt
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
      new SystemMessage(caraSystemPrompts.planning),
      new HumanMessage(planPrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(planResponse.content).match(/\{.*\}/s);
      let planJson;
      
      if (jsonMatch) {
        planJson = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        planJson = JSON.parse(String(planResponse.content));
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
        
        // Save resources for this milestone
        const resources = milestone.resources || [];
        for (const resource of resources) {
          await storage.createResource({
            milestoneId: newMilestone.id,
            title: resource.title,
            url: resource.url,
            type: resource.type
          });
        }
      }
      
      // Update the state
      state.plan = {
        plan,
        milestones
      };
      
      // Add an AI message
      const aiMessage = new AIMessage(
        `I've created a development plan with ${milestones.length} milestones to help you transition from ${state.transition.currentRole} to ${state.transition.targetRole}.`
      );
      state.messages.push(aiMessage);
      
      // Mark the transition as complete
      await storage.updateTransitionStatus(state.transition.transitionId, true);
      
    } catch (error) {
      console.error("Error parsing plan:", error);
      state.plan = {};
    }
    
    state.currentStage = 'complete';
  }
}