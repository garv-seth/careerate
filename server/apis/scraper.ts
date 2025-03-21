// Web scraping service - using Firecrawl API for real data
import FirecrawlApp from '@mendable/firecrawl-js';
import { FireCrawlLoader } from '@langchain/community/document_loaders/web/firecrawl';
import { Document } from '@langchain/core/documents';

// Configure Firecrawl with API key
const firecrawlApp = new FirecrawlApp({ 
  apiKey: process.env.FIRECRAWL_API_KEY || "" 
});

// Interface for scraped data
interface ScrapedResult {
  source: string;
  content: string;
  url: string;
}

// Sites to target for career transition stories
const CAREER_SITES = [
  {
    url: 'reddit.com/r/cscareerquestions',
    crawlUrl: 'https://www.reddit.com/r/cscareerquestions/',
    source: 'Reddit'
  },
  {
    url: 'teamblind.com',
    crawlUrl: 'https://www.teamblind.com/',
    source: 'Blind'
  },
  {
    url: 'quora.com/topic/career-transitions',
    crawlUrl: 'https://www.quora.com/topic/Career-Transitions',
    source: 'Quora'
  },
  {
    url: 'medium.com/tag/career-change',
    crawlUrl: 'https://medium.com/tag/career-change',
    source: 'Medium'
  },
  {
    url: 'indeed.com/career-advice/finding-a-job/career-change',
    crawlUrl: 'https://www.indeed.com/career-advice/finding-a-job/career-change',
    source: 'Indeed'
  }
];

/**
 * Scrape forums for transition stories
 * @param currentRole User's current role
 * @param targetRole User's target role
 * @returns Array of scraped content objects
 */
export async function scrapeForums(
  currentRole: string,
  targetRole: string
): Promise<ScrapedResult[]> {
  try {
    console.log(`Scraping for: ${currentRole} to ${targetRole}`);
    
    const results: ScrapedResult[] = [];
    
    // To avoid rate limiting, we'll use just one focused search approach
    // Use Google search for higher success rate
    const searchTerm = `${currentRole} to ${targetRole} career transition tips`;
    console.log(`Using Google search for: "${searchTerm}"`);
    
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
      
      // Use the FireCrawlLoader with scrape mode (most reliable)
      const loader = new FireCrawlLoader({
        url: searchUrl,
        apiKey: process.env.FIRECRAWL_API_KEY,
        mode: "scrape",
        params: {
          formats: ["markdown"]
        }
      });
      
      // Load documents
      const docs = await loader.load();
      console.log(`Retrieved ${docs.length} documents from search`);
      
      // Process each document
      for (const doc of docs) {
        // Skip if content is too short
        if (doc.pageContent.length < 200) continue;
        
        results.push({
          source: 'Google Search',
          content: doc.pageContent.substring(0, 5000), // Limit content size
          url: doc.metadata.source || searchUrl
        });
        
        // Break early after getting one good document to avoid rate limits
        break;
      }
    } catch (searchError) {
      console.error(`Error in Google search:`, searchError);
    }
    
    // Try a direct targeted scrape of Indeed career advice if Google search failed
    if (results.length === 0) {
      try {
        console.log("Trying Indeed career advice");
        
        const loader = new FireCrawlLoader({
          url: "https://www.indeed.com/career-advice/finding-a-job/career-change",
          apiKey: process.env.FIRECRAWL_API_KEY,
          mode: "scrape",
          params: {
            formats: ["markdown"]
          }
        });
        
        const docs = await loader.load();
        
        if (docs.length > 0) {
          console.log(`Retrieved ${docs.length} documents from Indeed`);
          
          results.push({
            source: 'Indeed Career Advice',
            content: docs[0].pageContent.substring(0, 5000),
            url: docs[0].metadata.source || 'https://www.indeed.com/career-advice'
          });
        }
      } catch (indeedError) {
        console.error("Error scraping Indeed:", indeedError);
      }
    }
    
    // Check if we found any results
    if (results.length > 0) {
      console.log(`Found ${results.length} relevant results`);
      return results;
    }
    
    // As a last resort, try a more generic search query
    try {
      console.log("Trying more generic career change search");
      
      const genericSearchUrl = "https://www.google.com/search?q=career+change+guide+steps";
      const loader = new FireCrawlLoader({
        url: genericSearchUrl,
        apiKey: process.env.FIRECRAWL_API_KEY,
        mode: "scrape",
        params: {
          formats: ["markdown"]
        }
      });
      
      const docs = await loader.load();
      
      if (docs.length > 0) {
        console.log(`Retrieved ${docs.length} documents from generic search`);
        
        results.push({
          source: 'Career Change Guide',
          content: docs[0].pageContent.substring(0, 5000),
          url: docs[0].metadata.source || genericSearchUrl
        });
      }
    } catch (genericError) {
      console.error("Error in generic search:", genericError);
    }
    
    // Return whatever results we have, even if empty
    console.log(`Returning ${results.length} results`);
    return results;
  } catch (error) {
    console.error("Error in web scraping:", error);
    return [];
  }
}
