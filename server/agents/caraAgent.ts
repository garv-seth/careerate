// Cara - Career Transition AI Agent using Perplexity Sonar for real-time web search and analysis
import { scrapeForums } from '../apis/scraper';
import { 
  extractSkills,
  generatePlan,
  analyzeTransitionStories,
  analyzeSkillGaps,
  SkillGapAnalysis
} from '../apis/perplexity-unified';
import { storage } from '../storage';

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
 * 1. Web scraping with Perplexity Sonar (searches across Reddit, Quora, Blind, and more)
 * 2. Skill gap analysis with Perplexity Sonar
 * 3. Resource discovery with Perplexity Sonar
 * 4. Plan generation with Perplexity Sonar
 * 
 * All AI functions are powered by Perplexity Sonar model with real-time web search
 */
export class CaraAgent {
  private currentRole: string;
  private targetRole: string;
  private scrapedData: any[] = [];
  
  constructor(currentRole: string, targetRole: string) {
    this.currentRole = currentRole;
    this.targetRole = targetRole;
  }
  
  /**
   * Main method to perform a complete career transition analysis
   */
  async analyzeCareerTransition(existingSkills: string[] = []): Promise<CaraAnalysisResult> {
    try {
      console.log(`Cara is analyzing transition from ${this.currentRole} to ${this.targetRole}`);
      
      // Step 1: Scrape relevant content from the web using Perplexity AI
      await this.scrapeWebContent();
      
      // Step 2: Perform skill gap analysis
      const skillGaps = await this.analyzeSkillGaps(existingSkills);
      
      // Step 3: Generate transition insights
      const insights = await this.generateInsights();
      
      return {
        skillGaps,
        insights,
        scrapedCount: this.scrapedData.length
      };
    } catch (error) {
      console.error("Error in Cara's analysis:", error);
      throw error;
    }
  }
  
  /**
   * Scrape relevant content about career transitions using Perplexity's internet search capabilities
   * and save to database
   */
  async scrapeWebContent(): Promise<void> {
    try {
      console.log("Cara is using Perplexity AI to search for career transition data across multiple forums");
      
      // Get the transition ID from the database
      const transition = await storage.getTransitionByRoles(this.currentRole, this.targetRole);
      
      if (!transition) {
        console.error("Transition not found for", this.currentRole, "to", this.targetRole);
        return;
      }
      
      // First get existing scraped data to avoid duplicates
      const existingScrapedData = await storage.getScrapedDataByTransitionId(transition.id);
      const existingUrls = new Set(existingScrapedData.map(item => item.url).filter(Boolean));
      
      // Use the updated scrapeForums function which now leverages Perplexity for comprehensive results
      this.scrapedData = await scrapeForums(this.currentRole, this.targetRole);
      console.log(`Cara found ${this.scrapedData.length} relevant transition stories from multiple sources`);
      
      // Filter out duplicates based on URL
      const newItems = this.scrapedData.filter(item => 
        !item.url || !existingUrls.has(item.url)
      );
      
      console.log(`After filtering duplicates, ${newItems.length} new stories will be saved`);
      
      // Save each new scraped item to the database
      for (const item of newItems) {
        try {
          await storage.createScrapedData({
            transitionId: transition.id,
            source: item.source,
            content: item.content,
            url: item.url || null,
            postDate: item.date || null,
            skillsExtracted: [] // We'll extract skills later
          });
          console.log(`Saved new scraped data from ${item.source} to database`);
        } catch (saveError) {
          console.error("Error saving scraped data to database:", saveError);
        }
      }
      
      // If we have very limited data, try additional queries with varied wording
      if (this.scrapedData.length < 2) {
        try {
          console.log("Limited data, Cara is searching with alternative phrasing");
          
          // Create alternative search queries
          const additionalResults = await scrapeForums(
            `professionals transitioning from ${this.currentRole}`,
            `becoming a ${this.targetRole} success stories`
          );
          
          if (additionalResults.length > 0) {
            // Filter out duplicates from additional results
            const newAdditionalItems = additionalResults.filter(item => 
              !item.url || 
              (!existingUrls.has(item.url) && 
               !this.scrapedData.some(existing => existing.url === item.url))
            );
            
            console.log(`Found ${additionalResults.length} additional stories, ${newAdditionalItems.length} are new`);
            
            // Save additional results to database
            for (const item of newAdditionalItems) {
              try {
                await storage.createScrapedData({
                  transitionId: transition.id,
                  source: item.source,
                  content: item.content,
                  url: item.url || null,
                  postDate: item.date || null,
                  skillsExtracted: []
                });
                
                // Add to in-memory collection
                this.scrapedData.push(item);
                console.log(`Saved additional data from ${item.source} to database`);
              } catch (saveError) {
                console.error("Error saving additional data to database:", saveError);
              }
            }
          }
        } catch (additionalSearchError) {
          console.error("Error in additional search:", additionalSearchError);
        }
      }
      
      // Update this.scrapedData to include all data from the database (for use in subsequent operations)
      this.scrapedData = await storage.getScrapedDataByTransitionId(transition.id);
    } catch (error) {
      console.error("Error in Cara's web scraping:", error);
      throw error;
    }
  }
  
  /**
   * Analyze skill gaps between current and target roles using Perplexity Sonar
   */
  async analyzeSkillGaps(existingSkills: string[]): Promise<SkillGapAnalysis[]> {
    try {
      // Use Perplexity Sonar directly to analyze skill gaps
      return await analyzeSkillGaps(
        this.currentRole,
        this.targetRole,
        this.scrapedData,
        existingSkills
      );
    } catch (error) {
      console.error("Error in Cara's skill gap analysis:", error);
      throw error;
    }
  }
  
  /**
   * Generate insights about the career transition using Perplexity Sonar
   */
  private async generateInsights(): Promise<any> {
    try {
      // Use Perplexity Sonar to analyze transition stories and provide structured insights
      return await analyzeTransitionStories(
        this.currentRole,
        this.targetRole,
        this.scrapedData
      );
    } catch (error) {
      console.error("Error generating insights:", error);
      // With our no-fallback approach, we throw errors instead of returning null
      throw new Error(`Failed to generate transition insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Extract skills from scraped content using Perplexity Sonar
   */
  async extractMentionedSkills(): Promise<string[]> {
    try {
      const allSkills: string[] = [];
      
      // Process each piece of scraped content
      for (const data of this.scrapedData) {
        try {
          const skills = await extractSkills(data.content);
          allSkills.push(...skills);
        } catch (extractError) {
          console.error("Error extracting skills from content:", extractError);
          // Continue trying other content items
        }
      }
      
      // If we couldn't extract any skills at all, that's a problem
      if (allSkills.length === 0) {
        throw new Error("Failed to extract any skills from scraped content");
      }
      
      // Return unique skills by filtering duplicates
      return allSkills.filter((skill, index) => 
        allSkills.indexOf(skill) === index
      );
    } catch (error) {
      console.error("Error extracting mentioned skills:", error);
      throw new Error(`Failed to extract skills: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate a career transition plan using Perplexity Sonar
   */
  async generatePlan(skills: string[]): Promise<any[]> {
    try {
      return await generatePlan(
        this.currentRole,
        this.targetRole,
        skills
      );
    } catch (error) {
      console.error("Error in Cara's plan generation:", error);
      throw error;
    }
  }
}