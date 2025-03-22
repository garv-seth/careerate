
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
      Existing skills: ${existingSkills.join(", ") || "None specified"}
      
      Follow these steps:
      1. Search for real transition stories and experiences
      2. Identify required skills and skill gaps
      3. Analyze success factors and challenges
      4. Provide actionable insights
      
      Return results in JSON format with skillGaps, insights, and success factors.`;

      // Run the agent with the query
      const result = await this.planExecuteAgent.run(query);
      console.log("Agent execution completed, processing results...");
      
      // Process and validate the results
      const processedResult = this.processAgentResult(result);
      
      // Store results in database
      await this.storeResults(processedResult);

      return processedResult;
    } catch (error) {
      console.error("Error in career transition analysis:", error);
      return this.getFallbackResult();
    }
  }

  private processAgentResult(result: any): CaraAnalysisResult {
    try {
      console.log("Processing agent result:", result);
      
      // For our improved implementation, the content might already be a parsed JSON
      // from the ImprovedPlanExecuteAgent JSON extractor
      let parsed;
      
      if (typeof result.content === 'object' && result.content !== null) {
        // It's already a parsed object
        parsed = result.content;
      } else {
        // It's still a string, try to parse it
        const content = result.content || "";
        console.log("Parsing string content...");
        
        // Find the JSON part in the content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error("No JSON content found in agent result");
          return this.getFallbackResult();
        }
        
        // Parse the JSON
        parsed = JSON.parse(jsonMatch[0]);
      }
      
      console.log("Successfully parsed result:", parsed);
      
      return {
        skillGaps: this.validateSkillGaps(parsed.skillGaps || []),
        insights: parsed.insights || {},
        scrapedCount: 5 // Fixed count based on the maxResults in TavilySearchResults
      };
    } catch (error) {
      console.error("Error processing agent result:", error);
      return this.getFallbackResult();
    }
  }

  private validateSkillGaps(gaps: any[]): SkillGapAnalysis[] {
    if (!Array.isArray(gaps) || gaps.length === 0) {
      console.warn("No valid skill gaps found, using fallback");
      return this.getFallbackResult().skillGaps;
    }
    
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
      console.log("Storing results in database...");
      const transition = await storage.getTransitionByRoles(this.currentRole, this.targetRole);
      if (!transition) {
        console.warn("No transition found in database, not storing results");
        return;
      }

      // Store skill gaps
      console.log(`Storing ${result.skillGaps.length} skill gaps`);
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
        console.log("Storing insights");
        await storage.createInsight({
          transitionId: transition.id,
          type: "observation",
          content: JSON.stringify(result.insights),
          source: "ImprovedCaraAgent",
          date: new Date().toISOString().split('T')[0],
          experienceYears: null
        });
      }
      
      console.log("Results stored successfully");
    } catch (error) {
      console.error("Error storing results:", error);
    }
  }

  private getFallbackResult(): CaraAnalysisResult {
    console.warn("Using fallback result due to processing error");
    return {
      skillGaps: [
        {
          skillName: "Technical Skills",
          gapLevel: "Medium",
          confidenceScore: 70,
          mentionCount: 1,
          contextSummary: "Core technical skills needed for the target role"
        },
        {
          skillName: "Domain Knowledge",
          gapLevel: "High",
          confidenceScore: 80,
          mentionCount: 2,
          contextSummary: "Specific knowledge required for the industry"
        }
      ],
      insights: {
        successRate: 65,
        timeToTransition: "6-12 months",
        commonChallenges: ["Technical expertise", "Role-specific knowledge", "Industry connections"]
      },
      scrapedCount: 3
    };
  }
}
