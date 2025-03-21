// Skill Analysis Agent using Claude
import { Document } from 'langchain/document';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Define the structure for skill gap analysis result
export interface SkillGapAnalysis {
  skillName: string;
  gapLevel: 'Low' | 'Medium' | 'High';
  confidenceScore: number;
  mentionCount: number;
  contextSummary: string;
}

// Zod schema for validating skill data structure
const skillSchema = z.object({
  skillName: z.string(),
  gapLevel: z.enum(['Low', 'Medium', 'High']),
  confidenceScore: z.number().min(0).max(100),
  mentionCount: z.number().min(0),
  contextSummary: z.string()
});

const skillsArraySchema = z.array(skillSchema);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "placeholder-key",
});

/**
 * Agent to analyze scraped data and identify skill gaps
 * 
 * This uses Document structures and Claude for analysis
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
   * Process the scraped data to extract skill gaps
   */
  async analyzeSkillGaps(existingSkills: string[]): Promise<SkillGapAnalysis[]> {
    try {
      console.log(`Analyzing skill gaps for transition from ${this.currentRole} to ${this.targetRole}`);
      
      // Combine document content for analysis
      const combinedContent = this.scrapedData.map(doc => {
        return `Source: ${doc.metadata.source}\n${doc.pageContent}`;
      }).join('\n\n---\n\n');
      
      // Create system prompt for skill extraction with context
      const systemPrompt = `You are a technical career transition analyst specializing in identifying skill gaps.
      
Analyze the provided data about transitioning from ${this.currentRole} to ${this.targetRole}.

The candidate already has these skills: ${existingSkills.join(', ')}.

Extract the following:
1. Key technical and soft skills needed for the ${this.targetRole} role
2. Analyze the gap level (Low/Medium/High) for each skill based on typical ${this.currentRole} background
3. Assign a confidence score (0-100) based on frequency and emphasis in the data
4. Count roughly how many times each skill is mentioned
5. Provide a brief context summary about why each skill is important for this transition

Format the response as a JSON array with objects having these properties:
- skillName: string (the name of the skill)
- gapLevel: string (must be exactly "Low", "Medium", or "High")
- confidenceScore: number (between 0-100)
- mentionCount: number (count of mentions in the data)
- contextSummary: string (brief explanation of the skill's importance)

Return ONLY valid JSON with no explanation or other text.`;

      // Call Claude API
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        system: systemPrompt,
        max_tokens: 1500,
        messages: [
          { role: 'user', content: combinedContent }
        ],
      });
      
      // Extract and parse the JSON response
      const responseContent = response.content[0].text;
      let skillsData;
      
      try {
        // Try to parse directly
        skillsData = JSON.parse(responseContent);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from the response
        const jsonMatch = responseContent.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          skillsData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse JSON from Claude response');
        }
      }
      
      // Validate the skills data against our schema
      const validationResult = skillsArraySchema.safeParse(skillsData);
      
      if (!validationResult.success) {
        console.error('Validation error:', validationResult.error);
        throw new Error('Skills data failed validation');
      }
      
      return validationResult.data;
    } catch (error) {
      console.error('Error in skill gap analysis:', error);
      // Return a minimal fallback result
      return [
        {
          skillName: 'Technical Skills',
          gapLevel: 'Medium',
          confidenceScore: 70,
          mentionCount: 1,
          contextSummary: `Based on limited analysis, technical skills may be important for transitioning from ${this.currentRole} to ${this.targetRole}.`
        }
      ];
    }
  }
}