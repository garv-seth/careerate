/**
 * Improved Cara - AI Career Transition Agent
 * 
 * This is an enhanced version of the CaraAgent that leverages LangGraph's Plan-Execute pattern
 * combined with specialized search tools to provide more comprehensive and reliable career transition analysis.
 * 
 * The key improvements:
 * 1. Uses a Plan-Execute pattern to break down the transition analysis into clear steps
 * 2. Specialized search agent focused on finding authentic transition stories
 * 3. Advanced skill gap analysis based on real-world stories and experiences
 * 4. Better structured development plans with concrete resources and timelines
 */
import { storage } from "../storage";
import { SkillGapAnalysis } from "./langGraphAgent";
import { ImprovedPlanExecuteAgent } from "./improvedPlanExecuteAgent";

// Result interface for career analysis
export interface CaraAnalysisResult {
  skillGaps: SkillGapAnalysis[];
  insights: any;
  scrapedCount: number;
}

/**
 * ImprovedCaraAgent - Enhanced AI Career Transition Agent
 * 
 * This is the main entry point for career transition analysis using the improved LangGraph approach.
 */
export class ImprovedCaraAgent {
  private currentRole: string;
  private targetRole: string;
  private planExecuteAgent: ImprovedPlanExecuteAgent;

  constructor(currentRole: string, targetRole: string) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
    this.planExecuteAgent = new ImprovedPlanExecuteAgent();
  }

  /**
   * Main method to perform a complete career transition analysis
   * This uses the improved LangGraph.js Plan-Execute agent pattern for more reliable analysis
   * 
   * The workflow:
   * 1. Planning: Create detailed step-by-step plan for the analysis
   * 2. Searching: Use specialized search agent to find authentic transition stories
   * 3. Analysis: Identify skill gaps based on real-world experiences
   * 4. Insights: Extract key observations, challenges, and success factors
   * 5. Planning: Create structured development plan with concrete resources
   */
  async analyzeCareerTransition(existingSkills: string[] = []): Promise<CaraAnalysisResult> {
    try {
      console.log(`ImprovedCara is analyzing transition from ${this.currentRole} to ${this.targetRole}`);
      
      // Get the transition ID from the database or create new one
      let transition = await storage.getTransitionByRoles(this.currentRole, this.targetRole);
      
      if (!transition) {
        // Create a new transition record
        transition = await storage.createTransition({
          currentRole: this.currentRole,
          targetRole: this.targetRole,
          userId: null,
          isComplete: false
        });
        console.log(`Created new transition ID: ${transition.id}`);
      } else {
        console.log(`Found existing transition ID: ${transition.id}`);
      }
      
      // Set the transition to not complete while we run the analysis
      await storage.updateTransitionStatus(transition.id, false);
      
      // Run the improved Plan-Execute agent
      console.log(`Starting improved Plan-Execute analysis for transition ID: ${transition.id}`);
      const analysisResult = await this.planExecuteAgent.analyzeCareerTransition(
        this.currentRole,
        this.targetRole,
        transition.id,
        existingSkills
      );
      
      // Set the transition to complete
      await storage.updateTransitionStatus(transition.id, true);
      
      return analysisResult;
    } catch (error) {
      console.error(`Error in career transition analysis:`, error);
      throw error;
    }
  }
}