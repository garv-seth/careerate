// Web scraping service - using LangGraph + Tavily for comprehensive search
import { searchForums } from '../helpers/langGraphHelpers';

// Interface for scraped data
export interface ScrapedResult {
  source: string;
  content: string;
  url: string;
  date: string;
}

/**
 * Scrape forums for career transition stories using Tavily search and LangGraph
 * This approach provides comprehensive results from multiple platforms including:
 * - Reddit
 * - Quora
 * - Blind
 * - Stack Overflow
 * - Medium
 * - LinkedIn posts
 * - Career blogs
 * 
 * @param currentRole User's current role
 * @param targetRole User's target role
 * @returns Array of scraped content objects including source, content, url, and date
 */
export async function scrapeForums(
  currentRole: string,
  targetRole: string
): Promise<ScrapedResult[]> {
  try {
    console.log(`Searching for transition stories from ${currentRole} to ${targetRole} using Tavily`);
    
    // Use Tavily search via LangGraph helpers to find career transition stories
    const results = await searchForums(currentRole, targetRole);
    
    console.log(`Found ${results.length} relevant results about ${currentRole} to ${targetRole} transitions`);
    
    // Process and clean up results
    const processedResults = results.map(result => ({
      source: result.source || "Web search",
      // Limit content size to 5000 chars to avoid excessive database storage
      content: result.content.substring(0, 5000),
      url: result.url || "",
      date: result.date || new Date().toISOString().split('T')[0]
    }));
    
    return processedResults;
  } catch (error: any) {
    console.error("Error in forum search:", error);
    throw new Error(`Failed to scrape transition data: ${error?.message || 'Unknown error'}`);
  }
}
