// Web scraping service - using Perplexity Sonar model for comprehensive search
import { searchForums as perplexitySearchForums } from './perplexity-unified';

// Interface for scraped data
export interface ScrapedResult {
  source: string;
  content: string;
  url: string;
  date: string;
}

/**
 * Scrape forums for career transition stories using Perplexity Sonar's real-time web search
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
    console.log(`Scraping for ${currentRole} to ${targetRole} using Perplexity Sonar's real-time web search`);
    
    // Use Perplexity Sonar to search across multiple forums simultaneously with real-time data
    const results = await perplexitySearchForums(currentRole, targetRole);
    
    console.log(`Found ${results.length} relevant results about ${currentRole} to ${targetRole} transitions`);
    
    // Process and clean up results
    const processedResults = results.map(result => ({
      source: result.source,
      // Limit content size to 5000 chars to avoid excessive database storage
      content: result.content.substring(0, 5000),
      url: result.url,
      date: result.date
    }));
    
    return processedResults;
  } catch (error: any) {
    console.error("Error in forum search:", error);
    throw new Error(`Failed to scrape transition data: ${error?.message || 'Unknown error'}`);
  }
}
