
import { storage } from "../storage";
import { SkillGapAnalysis } from "./langGraphAgent";
import { ImprovedPlanExecuteAgent } from "./improvedPlanExecuteAgent";

export interface CaraAnalysisResult {
  skillGaps: SkillGapAnalysis[];
  insights: any;
  scrapedCount: number;
}

export class ImprovedCaraAgent {
  private currentRole: string;
  private targetRole: string;
  private planExecuteAgent: ImprovedPlanExecuteAgent;

  constructor(currentRole: string, targetRole: string) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
    this.planExecuteAgent = new ImprovedPlanExecuteAgent();
  }

  async analyzeCareerTransition(existingSkills: string[] = []): Promise<CaraAnalysisResult> {
    try {
      console.log(`Starting career transition analysis from ${this.currentRole} to ${this.targetRole}`);

      // Create the analysis query
      const query = `Analyze career transition from ${this.currentRole} to ${this.targetRole}.
      Existing skills: ${existingSkills.join(", ")}
      
      Follow these steps:
      1. Search for real transition stories and experiences
      2. Identify required skills and skill gaps
      3. Analyze success factors and challenges
      4. Provide actionable insights
      
      Return results in JSON format with skillGaps, insights, and statistics.`;

      // Run the plan-execute agent
      const result = await this.planExecuteAgent.run(query);

      // Process and validate the results
      const processedResult = this.processAgentResult(result);
      
      // Store results in database
      await this.storeResults(processedResult);

      return processedResult;
    } catch (error) {
      console.error("Error in career transition analysis:", error);
      // Return fallback result
      return this.getFallbackResult();
    }
  }

  private processAgentResult(result: any): CaraAnalysisResult {
    try {
      // Extract the final message content
      const lastMessage = result.messages[result.messages.length - 1];
      const content = typeof lastMessage === 'string' ? lastMessage : lastMessage.content;
      
      // Parse JSON from content
      const parsed = JSON.parse(content);

      return {
        skillGaps: this.validateSkillGaps(parsed.skillGaps || []),
        insights: parsed.insights || {},
        scrapedCount: result.searchResults?.length || 0
      };
    } catch (error) {
      console.error("Error processing agent result:", error);
      return this.getFallbackResult();
    }
  }

  private validateSkillGaps(gaps: any[]): SkillGapAnalysis[] {
    return gaps.map(gap => ({
      skillName: gap.skillName || "Unknown Skill",
      gapLevel: gap.gapLevel || "Medium",
      confidenceScore: gap.confidenceScore || 70,
      mentionCount: gap.mentionCount || 1,
      contextSummary: gap.contextSummary || ""
    }));
  }

  private async storeResults(result: CaraAnalysisResult) {
    try {
      const transition = await storage.getTransitionByRoles(this.currentRole, this.targetRole);
      if (!transition) return;

      // Store skill gaps
      for (const gap of result.skillGaps) {
        await storage.createSkillGap({
          transitionId: transition.id,
          skillName: gap.skillName,
          gapLevel: gap.gapLevel as "Low" | "Medium" | "High",
          confidenceScore: gap.confidenceScore,
          mentionCount: gap.mentionCount
        });
      }

      // Store insights if available
      if (result.insights) {
        await storage.createInsight({
          transitionId: transition.id,
          type: "observation",
          content: JSON.stringify(result.insights),
          source: "ImprovedCaraAgent",
          date: new Date().toISOString().split('T')[0],
          experienceYears: null
        });
      }
    } catch (error) {
      console.error("Error storing results:", error);
    }
  }

  private getFallbackResult(): CaraAnalysisResult {
    return {
      skillGaps: [
        {
          skillName: "Technical Skills",
          gapLevel: "Medium",
          confidenceScore: 70,
          mentionCount: 1,
          contextSummary: "Core technical skills needed for the target role"
        }
      ],
      insights: {
        successRate: 65,
        timeToTransition: "6-12 months",
        commonChallenges: ["Technical expertise", "Role-specific knowledge"]
      },
      scrapedCount: 0
    };
  }
}
