// Cara - Career Transition AI Agent using LangGraph for orchestration
import { storage } from '../storage';
import { LangGraphCaraAgent, SkillGapAnalysis } from './langGraphAgent';

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
 */
export class CaraAgent {
  private currentRole: string;
  private targetRole: string;
  private langGraphAgent: LangGraphCaraAgent | null = null;
  
  constructor(currentRole: string, targetRole: string) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
  }
  
  /**
   * Main method to perform a complete career transition analysis
   * This method now delegates to the LangGraph implementation
   * 
   * The workflow steps remain the same:
   * 1. Scrape stories using Tavily
   * 2. Process stories to extract observations/challenges
   * 3. Extract skills and analyze gaps
   * 4. Generate plan based on gaps
   * 5. Generate final metrics based on all collected data
   */
  async analyzeCareerTransition(existingSkills: string[] = []): Promise<CaraAnalysisResult> {
    try {
      console.log(`Cara is analyzing transition from ${this.currentRole} to ${this.targetRole}`);
      
      // Get the transition ID from the database
      const transition = await storage.getTransitionByRoles(this.currentRole, this.targetRole);
      
      if (!transition) {
        throw new Error(`Transition not found for ${this.currentRole} to ${this.targetRole}`);
      }
      
      // Create a LangGraph Cara agent
      this.langGraphAgent = new LangGraphCaraAgent(
        this.currentRole,
        this.targetRole,
        transition.id
      );
      
      // Run the LangGraph workflow
      const result = await this.langGraphAgent.analyzeCareerTransition(existingSkills);
      console.log(`LangGraph Cara analysis complete with ${result.skillGaps.length} skill gaps identified`);
      
      // Update the transition to mark it as complete
      await storage.updateTransitionStatus(transition.id, true);
      
      return result;
    } catch (error) {
      console.error("Error in Cara's analysis:", error);
      throw error;
    }
  }
}