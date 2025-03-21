// Cara - Career Transition AI Agent using LangGraph's Plan-Execute pattern
import { storage } from '../storage';
import { SkillGapAnalysis } from './langGraphAgent';
import { CaraPlanExecuteAgent } from './caraPlanExecuteAgent-fixed';

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
 * Uses the Plan-Execute pattern for systematic analysis
 */
export class CaraAgent {
  private currentRole: string;
  private targetRole: string;
  private planExecuteAgent: CaraPlanExecuteAgent;
  
  constructor(currentRole: string, targetRole: string) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
    this.planExecuteAgent = new CaraPlanExecuteAgent();
  }
  
  /**
   * Main method to perform a complete career transition analysis
   * This method now uses the Plan-Execute pattern for more systematic analysis
   * 
   * The Plan-Execute workflow:
   * 1. Planning: Create a detailed multi-step plan for the analysis
   * 2. Execution: Execute each plan step using specialized tools
   * 3. Replanning: Evaluate progress and update the plan as needed
   * 4. Collection: Gather all insights, skill gaps, and metrics
   */
  async analyzeCareerTransition(existingSkills: string[] = []): Promise<CaraAnalysisResult> {
    try {
      console.log(`Cara is analyzing transition from ${this.currentRole} to ${this.targetRole} using Plan-Execute pattern`);
      
      // Get the transition ID from the database
      const transition = await storage.getTransitionByRoles(this.currentRole, this.targetRole);
      
      if (!transition) {
        throw new Error(`Transition not found for ${this.currentRole} to ${this.targetRole}`);
      }
      
      // Run the Plan-Execute workflow
      const result = await this.planExecuteAgent.analyzeCareerTransition(
        this.currentRole,
        this.targetRole,
        transition.id,
        existingSkills
      );
      
      console.log(`Plan-Execute analysis complete with ${result.skillGaps.length} skill gaps identified`);
      
      return result;
    } catch (error) {
      console.error("Error in Cara's Plan-Execute analysis:", error);
      throw error;
    }
  }
}