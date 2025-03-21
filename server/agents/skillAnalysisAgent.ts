// Skill Analysis Agent using Perplexity Sonar and LangChain
import { Document } from '@langchain/core/documents';
import { z } from 'zod';
import { analyzeSkillGaps, SkillGapAnalysis } from '../apis/perplexity-unified';

// Zod schema for validating skill data structure
const skillSchema = z.object({
  skillName: z.string(),
  gapLevel: z.enum(['Low', 'Medium', 'High']),
  confidenceScore: z.number().min(0).max(100),
  mentionCount: z.number().min(0),
  contextSummary: z.string()
});

const skillsArraySchema = z.array(skillSchema);

/**
 * Agent to analyze scraped data and identify skill gaps
 * 
 * This uses Document structures and Perplexity Sonar for analysis
 */
export class SkillAnalysisAgent {
  private currentRole: string;
  private targetRole: string;
  private scrapedData: Document[];

  constructor(currentRole: string, targetRole: string, scrapedContent: { source: string, content: string, url: string }[]) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
    
    // Convert scraped content to Documents
    this.scrapedData = scrapedContent.map(item => new Document({
      pageContent: item.content,
      metadata: {
        source: item.source,
        url: item.url
      }
    }));
  }

  /**
   * Process the scraped data to extract skill gaps using Perplexity Sonar
   */
  async analyzeSkillGaps(existingSkills: string[]): Promise<SkillGapAnalysis[]> {
    try {
      console.log(`Analyzing skill gaps for transition from ${this.currentRole} to ${this.targetRole}`);
      
      // Prepare scraped content for analysis
      const formattedContent = this.scrapedData.map(doc => ({
        source: doc.metadata.source as string,
        content: doc.pageContent
      }));
      
      // Use the unified Perplexity API for skill gap analysis
      const skillGapsData = await analyzeSkillGaps(
        this.currentRole,
        this.targetRole,
        formattedContent,
        existingSkills
      );
      
      // Validate the skills data against our schema
      const validationResult = skillsArraySchema.safeParse(skillGapsData);
      
      if (!validationResult.success) {
        console.error('Validation error:', validationResult.error);
        throw new Error('Skills data failed validation');
      }
      
      return validationResult.data;
    } catch (error) {
      console.error('Error in skill gap analysis:', error);
      // With our new approach, we don't use fallback data - we throw errors instead
      throw new Error(`Failed to analyze skill gaps for ${this.currentRole} to ${this.targetRole}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // No fallback methods - we only use real data from Perplexity searches
}