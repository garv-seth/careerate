// Web scraping service - using multiple APIs for real data
import FirecrawlApp from '@mendable/firecrawl-js';
import { FireCrawlLoader } from '@langchain/community/document_loaders/web/firecrawl';
import { Document } from '@langchain/core/documents';
import axios from 'axios';
import { generateApiCall } from '../apis/gemini';

// Configure Firecrawl with API key
const firecrawlApp = new FirecrawlApp({ 
  apiKey: process.env.FIRECRAWL_API_KEY || "" 
});

// RapidAPI key for alternative APIs
const RAPID_API_KEY = process.env.RAPID_API_KEY || "";

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
 * Scrape Reddit using the RapidAPI Reddit Scraper
 * @param searchQuery The query to search for
 * @returns Array of scraped content objects
 */
async function scrapeReddit(searchQuery: string): Promise<ScrapedResult[]> {
  try {
    console.log(`Scraping Reddit for: "${searchQuery}"`);
    
    // Generate the API call using Gemini
    const apiCallCode = await generateApiCall("Reddit", searchQuery);
    
    // Execute the generated API call
    const apiCallData = JSON.parse(apiCallCode);
    
    const options = {
      method: apiCallData.method,
      url: apiCallData.url,
      params: apiCallData.params,
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': apiCallData.host
      }
    };
    
    const response = await axios.request(options);
    const results: ScrapedResult[] = [];
    
    // Process Reddit response data
    if (response.data && response.data.data) {
      for (const post of response.data.data) {
        if (post.content && post.content.length > 100) {
          results.push({
            source: 'Reddit',
            content: post.content.substring(0, 5000),
            url: post.url || `https://www.reddit.com${post.permalink || ''}`
          });
        }
      }
    }
    
    console.log(`Found ${results.length} relevant Reddit results`);
    return results;
  } catch (error: any) {
    console.error("Error scraping Reddit:", error);
    throw new Error(`Failed to scrape Reddit: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Scrape Quora using the RapidAPI Quora Scraper
 * @param searchQuery The query to search for
 * @returns Array of scraped content objects
 */
async function scrapeQuora(searchQuery: string): Promise<ScrapedResult[]> {
  try {
    console.log(`Scraping Quora for: "${searchQuery}"`);
    
    // Generate the API call using Gemini
    const apiCallCode = await generateApiCall("Quora", searchQuery);
    
    // Execute the generated API call
    const apiCallData = JSON.parse(apiCallCode);
    
    const options = {
      method: apiCallData.method,
      url: apiCallData.url,
      params: apiCallData.params,
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': apiCallData.host
      }
    };
    
    const response = await axios.request(options);
    const results: ScrapedResult[] = [];
    
    // Process Quora response data
    if (response.data && response.data.data) {
      // For question answers
      if (apiCallData.endpoint === 'search_answers') {
        for (const answer of response.data.data) {
          if (answer.content && answer.content.length > 100) {
            results.push({
              source: 'Quora',
              content: answer.content.substring(0, 5000),
              url: answer.url || `https://www.quora.com/`
            });
          }
        }
      }
      // For questions
      else if (apiCallData.endpoint === 'search_questions') {
        for (const question of response.data.data) {
          if (question.title && question.title.length > 20) {
            results.push({
              source: 'Quora',
              content: `Question: ${question.title}\n\n${question.description || ''}`.substring(0, 5000),
              url: question.url || `https://www.quora.com/`
            });
          }
        }
      }
    }
    
    console.log(`Found ${results.length} relevant Quora results`);
    return results;
  } catch (error: any) {
    console.error("Error scraping Quora:", error);
    throw new Error(`Failed to scrape Quora: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Search forums across the web using RapidAPI Forums Search
 * @param searchQuery The query to search for
 * @returns Array of scraped content objects
 */
async function searchForums(searchQuery: string): Promise<ScrapedResult[]> {
  try {
    console.log(`Searching forums for: "${searchQuery}"`);
    
    // Generate the API call using Gemini
    const apiCallCode = await generateApiCall("Forums", searchQuery);
    
    // Execute the generated API call
    const apiCallData = JSON.parse(apiCallCode);
    
    const options = {
      method: apiCallData.method,
      url: apiCallData.url,
      params: apiCallData.params,
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': apiCallData.host
      }
    };
    
    const response = await axios.request(options);
    const results: ScrapedResult[] = [];
    
    // Process forum search response data
    if (response.data && response.data.data && response.data.data.results) {
      for (const result of response.data.data.results) {
        if (result.content && result.content.length > 100) {
          results.push({
            source: result.site_name || 'Forum',
            content: `${result.title || ''}\n\n${result.content}`.substring(0, 5000),
            url: result.url || 'https://www.google.com'
          });
        }
      }
    }
    
    console.log(`Found ${results.length} relevant forum results`);
    return results;
  } catch (error: any) {
    console.error("Error searching forums:", error);
    throw new Error(`Failed to search forums: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Scrape forums for transition stories using multiple APIs
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
    
    // First try Firecrawl
    const searchTerm = `${currentRole} to ${targetRole} career transition tips`;
    console.log(`Using Google search for: "${searchTerm}"`);
    
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
      
      // Use the FireCrawlLoader with scrape mode
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
    
    // If Firecrawl failed, use alternative APIs
    if (results.length === 0) {
      console.log("Firecrawl didn't return results, trying alternative APIs");
      // Create career transition specific search queries
      const redditQuery = `${currentRole} to ${targetRole} career transition experience reddit`;
      const quoraQuery = `How to transition from ${currentRole} to ${targetRole}`;
      const forumsQuery = `${currentRole} to ${targetRole} career change advice forums`;
      
      // Try each API sequentially to ensure we get at least one result
      try {
        // First try Reddit
        const redditResults = await scrapeReddit(redditQuery);
        results.push(...redditResults);
        
        // If we still don't have results, try Quora
        if (results.length === 0) {
          const quoraResults = await scrapeQuora(quoraQuery);
          results.push(...quoraResults);
        }
        
        // If we still don't have results, try Forums
        if (results.length === 0) {
          const forumResults = await searchForums(forumsQuery);
          results.push(...forumResults);
        }
      } catch (apiError: any) {
        console.error("Error with alternative APIs:", apiError?.message);
      }
    }
    
    // If still no results, try Indeed career advice as a last resort
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
      } catch (indeedError: any) {
        console.error("Error scraping Indeed:", indeedError?.message);
      }
    }
    
    // If we still have no results after trying everything, throw an error
    if (results.length === 0) {
      throw new Error(`Failed to retrieve any career transition content for ${currentRole} to ${targetRole} from any source`);
    }
    
    console.log(`Returning ${results.length} results`);
    return results;
  } catch (error: any) {
    console.error("Error in web scraping:", error);
    throw new Error(`Failed to scrape web content: ${error?.message || 'Unknown error'}`);
  }
}
