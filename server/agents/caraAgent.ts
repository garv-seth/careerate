// Cara - Career Transition AI Agent
import { Document } from '@langchain/core/documents';
import { FireCrawlLoader } from '@langchain/community/document_loaders/web/firecrawl';
// SimpleDirectoryReader is not needed for the current implementation
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
 * 1. Web scraping with Firecrawl
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
      
      // Step 1: Scrape relevant content from the web using Firecrawl
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
   * Scrape relevant content about career transitions and save to database
   */
  async scrapeWebContent(): Promise<void> {
    try {
      // Use improved scraper to get real transition stories
      this.scrapedData = await scrapeForums(this.currentRole, this.targetRole);
      console.log(`Cara found ${this.scrapedData.length} relevant transition stories`);
      
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
      
      // If we have very limited data, try direct search with more specific terms
      if (this.scrapedData.length < 2) {
        try {
          console.log("Limited data, Cara is searching for more specific information");
          
          // Use LlamaIndex + Firecrawl combination for better data gathering
          const searchTerms = [
            `${this.currentRole} to ${this.targetRole} career transition experience`,
            `${this.targetRole} job skills for ${this.currentRole} background`,
            `how to move from ${this.currentRole} to ${this.targetRole}`
          ];
          
          // Try each search term
          for (const searchTerm of searchTerms) {
            try {
              // Use the Firecrawl loader from LangChain
              const loader = new FireCrawlLoader({
                url: `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`,
                apiKey: process.env.FIRECRAWL_API_KEY,
                mode: "scrape",
                params: {
                  formats: ["markdown"]
                }
              });
              
              // Get documents
              const docs = await loader.load();
              
              // Process found documents
              if (docs.length > 0) {
                for (const doc of docs) {
                  if (doc.pageContent.length > 200) {
                    const item = {
                      source: 'Google Search Results',
                      content: doc.pageContent.substring(0, 5000),
                      url: doc.metadata.source || 'https://www.google.com/'
                    };
                    
                    // Add to in-memory collection
                    this.scrapedData.push(item);
                    
                    // Save to database
                    try {
                      await storage.createScrapedData({
                        transitionId: transition.id,
                        source: item.source,
                        content: item.content,
                        url: item.url || null,
                        skillsExtracted: [] // We'll extract skills later
                      });
                      console.log(`Saved additional scraped data from Google to database`);
                    } catch (saveError) {
                      console.error("Error saving additional scraped data to database:", saveError);
                    }
                  }
                }
              }
              
              // If we found enough data, stop searching
              if (this.scrapedData.length >= 3) break;
            } catch (searchError) {
              console.error(`Error in Cara's search for ${searchTerm}:`, searchError);
            }
          }
        } catch (searchError) {
          console.error("Error in Cara's additional search:", searchError);
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