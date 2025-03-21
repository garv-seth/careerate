// Cara - Career Transition AI Agent using a simplified LangGraph approach
import { storage } from '../storage';
import { SkillGapAnalysis, SimplifiedLangGraphAgent } from './simplifiedLangGraphAgent';

// Interface for Cara's analysis results
export interface CaraAnalysisResult {
  skillGaps: SkillGapAnalysis[];
  insights: any;
  scrapedCount: number;
}

/**
 * Cara - AI Career Transition Agent
 * 
 * This agent orchestrates the entire career transition analysis process:
 * 1. Web scraping with Tavily (searches across Reddit, Quora, Blind, and more)
 * 2. Skill gap analysis with OpenAI
 * 3. Resource discovery with Tavily
 * 4. Plan generation with OpenAI
 * 
 * All AI functions are powered by LangGraph + OpenAI with Tavily for real-time web search
 * Now uses a simplified LangGraph approach for more reliability
 */
export class CaraAgent {
  private currentRole: string;
  private targetRole: string;
  
  constructor(currentRole: string, targetRole: string) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
  }
  
  /**
   * Main method to perform a complete career transition analysis
   * This method now uses a simplified LangGraph.js approach for more reliable analysis
   * 
   * The workflow:
   * 1. Scraping: Gather transition stories from the web
   * 2. Analysis: Identify skill gaps based on stories
   * 3. Planning: Create a development plan with milestones
   * 4. Insights: Extract key insights and success factors
   */
  async analyzeCareerTransition(existingSkills: string[] = []): Promise<CaraAnalysisResult> {
    try {
      console.log(`Cara is analyzing transition from ${this.currentRole} to ${this.targetRole} using simplified LangGraph`);
      
      // Get the transition ID from the database
      const transition = await storage.getTransitionByRoles(this.currentRole, this.targetRole);
      
      if (!transition) {
        throw new Error(`Transition not found for ${this.currentRole} to ${this.targetRole}`);
      }
      
      // Create an instance of the simplified agent
      const simplifiedAgent = new SimplifiedLangGraphAgent(
        this.currentRole,
        this.targetRole,
        transition.id
      );
      
      // Run the analysis
      const result = await simplifiedAgent.analyzeCareerTransition(existingSkills);
      
      console.log(`Simplified LangGraph analysis complete with ${result.skillGaps.length} skill gaps identified`);
      
      return result;
    } catch (error) {
      console.error("Error in Cara's simplified LangGraph analysis:", error);
      throw error;
    }
  }
}