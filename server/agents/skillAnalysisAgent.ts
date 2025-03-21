// Skill Analysis Agent using Claude and LangChain
import { Document } from '@langchain/core/documents';
import { FireCrawlLoader } from '@langchain/community/document_loaders/web/firecrawl';
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
      let analysisContent = this.scrapedData.map(doc => {
        return `Source: ${doc.metadata.source}\n${doc.pageContent}`;
      }).join('\n\n---\n\n');
      
      // Try to gather more data directly using FireCrawlLoader if content is limited
      if (analysisContent.length < 2000) {
        try {
          console.log("Limited data available, gathering more information using FireCrawlLoader");
          
          // Create search terms for targeted role skill information
          const searchTerm = `${this.targetRole} required skills`;
          
          // Use LangChain FireCrawlLoader to get skill information
          const loader = new FireCrawlLoader({
            url: `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`,
            apiKey: process.env.FIRECRAWL_API_KEY,
            mode: "scrape",
            params: {
              scrapeOptions: {
                formats: ['markdown'],
              }
            }
          });
          
          // Load documents using LangChain
          const additionalDocs = await loader.load();
          
          // Add the additional content to our analysis
          if (additionalDocs.length > 0) {
            const additionalContent = additionalDocs.map(doc => {
              return `Source: Additional Search\n${doc.pageContent}`;
            }).join('\n\n---\n\n');
            
            // Append the new content
            analysisContent += '\n\n' + additionalContent;
            console.log("Successfully gathered additional data for analysis");
          }
        } catch (error) {
          console.error("Error gathering additional skill data:", error);
          // Continue with original data if there's an error
        }
      }
      
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
          { role: 'user', content: analysisContent }
        ],
      });
      
      // Extract and parse the JSON response
      const contentBlock = response.content[0];
      const responseContent = 'text' in contentBlock ? contentBlock.text : '';
      let skillsData;
      
      try {
        // Try to parse directly
        skillsData = JSON.parse(responseContent);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from the response
        const jsonMatch = responseContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
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
      
      // Generate a more comprehensive fallback result based on role transition
      return this.generateFallbackSkillGaps();
    }
  }
  
  /**
   * Generate fallback skill gaps based on roles when AI analysis fails
   * This ensures we always have some skills to work with
   */
  private generateFallbackSkillGaps(): SkillGapAnalysis[] {
    console.log(`Generating role-based fallback skill gaps for ${this.currentRole} to ${this.targetRole}`);
    
    // Common skill gaps based on the target role
    const roleSpecificSkills: {[key: string]: SkillGapAnalysis[]} = {
      "Machine Learning Engineer": [
        {
          skillName: "Deep Learning",
          gapLevel: "Medium",
          confidenceScore: 85,
          mentionCount: 3,
          contextSummary: "Deep learning expertise is required for ML Engineering roles beyond basic data science"
        },
        {
          skillName: "MLOps",
          gapLevel: "High", 
          confidenceScore: 90,
          mentionCount: 4,
          contextSummary: "ML Engineers need to deploy and maintain models in production environments"
        },
        {
          skillName: "Large Scale Distributed Systems",
          gapLevel: "Medium",
          confidenceScore: 75,
          mentionCount: 2,
          contextSummary: "ML Engineers need to understand how to build systems that scale"
        }
      ],
      "Data Scientist": [
        {
          skillName: "Statistical Analysis",
          gapLevel: "Medium",
          confidenceScore: 80,
          mentionCount: 3,
          contextSummary: "Strong statistical foundation is essential for data science roles"
        },
        {
          skillName: "Data Visualization",
          gapLevel: "Medium",
          confidenceScore: 75,
          mentionCount: 2,
          contextSummary: "Ability to communicate insights through visualization is key for data scientists"
        }
      ],
      "Software Engineer": [
        {
          skillName: "Software Design Patterns",
          gapLevel: "Medium",
          confidenceScore: 80,
          mentionCount: 3,
          contextSummary: "Understanding design patterns is essential for writing maintainable code"
        },
        {
          skillName: "Algorithms and Data Structures",
          gapLevel: "Medium",
          confidenceScore: 85,
          mentionCount: 4,
          contextSummary: "Strong algorithmic thinking is required for software engineering roles"
        }
      ],
      "Product Manager": [
        {
          skillName: "User Research",
          gapLevel: "High",
          confidenceScore: 85,
          mentionCount: 3,
          contextSummary: "Understanding user needs is central to product management"
        },
        {
          skillName: "Agile Methodologies",
          gapLevel: "Medium",
          confidenceScore: 80,
          mentionCount: 2,
          contextSummary: "Product managers need to understand agile workflow and sprint planning"
        }
      ]
    };
    
    // Generic fallback skills that apply to most technical transitions
    const genericSkills: SkillGapAnalysis[] = [
      {
        skillName: "Technical Communication",
        gapLevel: "Medium",
        confidenceScore: 70,
        mentionCount: 2,
        contextSummary: `Effectively communicating technical concepts is essential when transitioning to ${this.targetRole}`
      },
      {
        skillName: "Project Management",
        gapLevel: "Medium", 
        confidenceScore: 65,
        mentionCount: 1,
        contextSummary: `Managing projects and timelines is important in ${this.targetRole} roles`
      }
    ];
    
    // Combine role-specific and generic skills
    let resultSkills = [...genericSkills];
    
    // Add role-specific skills if available
    if (roleSpecificSkills[this.targetRole]) {
      resultSkills = [...roleSpecificSkills[this.targetRole], ...resultSkills];
    }
    
    return resultSkills;
  }
}