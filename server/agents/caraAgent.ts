// Cara - Career Transition AI Agent using Perplexity for comprehensive internet search
import { Document } from '@langchain/core/documents';
import { extractSkills } from '../apis/claude';
import { scrapeForums } from '../apis/scraper';
import { generatePlanWithGemini, findResourcesWithGemini, analyzeTransitionStories } from '../apis/gemini';
import { SkillAnalysisAgent, SkillGapAnalysis } from './skillAnalysisAgent';
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
 * 1. Web scraping with Perplexity AI (searches across Reddit, Quora, Blind, and more)
 * 2. Skill gap analysis with Claude
 * 3. Resource discovery with Gemini
 * 4. Plan generation with Gemini
 */
export class CaraAgent {
  private currentRole: string;
  private targetRole: string;
  private scrapedData: any[] = [];
  private skillAnalyzer: SkillAnalysisAgent | null = null;
  
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
      
      // Use the updated scrapeForums function which now leverages Perplexity for comprehensive results
      this.scrapedData = await scrapeForums(this.currentRole, this.targetRole);
      console.log(`Cara found ${this.scrapedData.length} relevant transition stories from multiple sources`);
      
      // Save the scraped data to the database
      // First get the transition ID from the database
      const transition = await storage.getTransitionByRoles(this.currentRole, this.targetRole);
      
      if (!transition) {
        console.error("Transition not found for", this.currentRole, "to", this.targetRole);
        return;
      }
      
      // Save each scraped item to the database
      for (const item of this.scrapedData) {
        try {
          await storage.createScrapedData({
            transitionId: transition.id,
            source: item.source,
            content: item.content,
            url: item.url || null,
            skillsExtracted: [] // We'll extract skills later
          });
          console.log(`Saved scraped data from ${item.source} to database`);
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
            // Save additional results to database
            for (const item of additionalResults) {
              // Skip any duplicates by URL
              if (this.scrapedData.some(existing => existing.url === item.url)) {
                continue;
              }
              
              try {
                await storage.createScrapedData({
                  transitionId: transition.id,
                  source: item.source,
                  content: item.content,
                  url: item.url || null,
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
    } catch (error) {
      console.error("Error in Cara's web scraping:", error);
      throw error;
    }
  }
  
  /**
   * Analyze skill gaps between current and target roles
   */
  private async analyzeSkillGaps(existingSkills: string[]): Promise<SkillGapAnalysis[]> {
    try {
      // Use the SkillAnalysisAgent to analyze the scraped data
      this.skillAnalyzer = new SkillAnalysisAgent(
        this.currentRole, 
        this.targetRole, 
        this.scrapedData
      );
      
      return await this.skillAnalyzer.analyzeSkillGaps(existingSkills);
    } catch (error) {
      console.error("Error in Cara's skill gap analysis:", error);
      throw error;
    }
  }
  
  /**
   * Generate insights about the career transition
   */
  private async generateInsights(): Promise<any> {
    try {
      // Use Gemini to analyze transition stories and provide structured insights
      return await analyzeTransitionStories(
        this.currentRole,
        this.targetRole,
        this.scrapedData
      );
    } catch (error) {
      console.error("Error generating insights:", error);
      return null;
    }
  }
  
  /**
   * Extract skills from scraped content
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
        }
      }
      
      // Return unique skills by filtering duplicates
      return allSkills.filter((skill, index) => 
        allSkills.indexOf(skill) === index
      );
    } catch (error) {
      console.error("Error extracting mentioned skills:", error);
      return [];
    }
  }
  
  /**
   * Generate a career transition plan
   */
  async generatePlan(skills: string[]): Promise<any[]> {
    try {
      return await generatePlanWithGemini(
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