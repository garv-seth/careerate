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
    console.log(`Scraping forums for: ${currentRole} to ${targetRole}`);
    
    // Format the roles for better search results
    const formattedCurrentRole = currentRole.replace(/\s+/g, '-').toLowerCase();
    const formattedTargetRole = targetRole.replace(/\s+/g, '-').toLowerCase();
    
    // Prepare search terms
    const searchTerms = [
      `${currentRole} to ${targetRole}`,
      `transition from ${currentRole} to ${targetRole}`,
      `career change ${currentRole} ${targetRole}`,
      `switching from ${currentRole} to ${targetRole}`
    ];
    
    const results: ScrapedResult[] = [];
    
    // First try to use the more effective crawl mode on specific sites
    for (const site of CAREER_SITES) {
      try {
        console.log(`Crawling ${site.source} for career transition information`);
        
        // Use Firecrawl with LangChain to crawl the site using crawl mode
        const loader = new FireCrawlLoader({
          url: site.crawlUrl,
          apiKey: process.env.FIRECRAWL_API_KEY,
          mode: "crawl",
          params: {
            limit: 5,
            // Use filter functions to look for career transition content
            filter: (url: string) => {
              // Only crawl URLs that might contain career transition info
              return url.includes("career") || 
                    url.includes("transition") || 
                    url.includes("change") ||
                    url.includes(currentRole.toLowerCase()) || 
                    url.includes(targetRole.toLowerCase());
            },
            scrapeOptions: {
              formats: ["markdown"]
            }
          }
        });
        
        // Load documents using LangChain
        const docs = await loader.load();
        
        // Process each document from crawl
        for (const doc of docs) {
          const content = doc.pageContent;
          
          // Skip if content is too short
          if (content.length < 200) continue;
          
          // Check if content mentions roles or transition-related terms
          if ((content.toLowerCase().includes(currentRole.toLowerCase()) || 
               content.toLowerCase().includes(targetRole.toLowerCase())) && 
              (content.toLowerCase().includes('transition') || 
               content.toLowerCase().includes('career') || 
               content.toLowerCase().includes('change') || 
               content.toLowerCase().includes('skills'))) {
            
            // Add to results
            results.push({
              source: site.source,
              content: content.substring(0, 5000), // Limit content size
              url: doc.metadata.source || site.crawlUrl
            });
          }
        }
      } catch (crawlError) {
        console.error(`Error crawling ${site.source}:`, crawlError);
      }
      
      // Break early if we found enough results to conserve API calls
      if (results.length >= 3) {
        console.log(`Found ${results.length} relevant results from crawling, stopping early`);
        return results;
      }
    }
    
    // If crawl mode didn't yield enough results, fall back to search scraping
    if (results.length < 2) {
      console.log("Limited results from crawl, trying direct search scraping");
      
      // Try to scrape data using specific search terms
      for (const site of CAREER_SITES) {
        for (const searchTerm of searchTerms) {
          try {
            console.log(`Scraping ${site.source} for "${searchTerm}"`);
            
            // Use Firecrawl with LangChain to scrape the site
            const searchUrl = `${site.url}/search?q=${encodeURIComponent(searchTerm)}`;
            
            // Use the FireCrawlLoader from LangChain
            const loader = new FireCrawlLoader({
              url: searchUrl,
              apiKey: process.env.FIRECRAWL_API_KEY,
              mode: "scrape",
              params: {
                formats: ["markdown"]
              }
            });
            
            // Load documents using LangChain
            const docs = await loader.load();
            
            // Process each document
            for (const doc of docs) {
              const content = doc.pageContent;
              
              // Skip if content is too short
              if (content.length < 100) continue;
              
              // Check if content mentions both roles
              if (content.toLowerCase().includes(formattedCurrentRole) && 
                  content.toLowerCase().includes(formattedTargetRole)) {
                
                // Add to results
                results.push({
                  source: site.source,
                  content: content.substring(0, 5000), // Limit content size
                  url: doc.metadata.sourceURL || searchUrl
                });
              }
            }
          } catch (siteError) {
            console.error(`Error scraping ${site.source} for "${searchTerm}":`, siteError);
            // Continue with next site/term
            continue;
          }
          
          // Break early if we have enough results
          if (results.length >= 3) {
            console.log(`Found ${results.length} relevant results, stopping search early`);
            return results;
          }
        }
      }
    }
    
    // If we found results, return them
    if (results.length > 0) {
      console.log(`Found ${results.length} relevant results from real web scraping`);
      return results;
    }
    
    // If no results, try using Google search
    try {
      console.log("Trying domain-specific search with Firecrawl");
      
      const searchTerm = `${currentRole} to ${targetRole} career transition`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
      
      // Use the FireCrawlLoader from LangChain for Google search
      const loader = new FireCrawlLoader({
        url: searchUrl,
        apiKey: process.env.FIRECRAWL_API_KEY,
        mode: "scrape",
        params: {
          enableScripts: true,
          enableImages: false,
          wait: 2000
        }
      });
      
      // Load documents using LangChain
      const docs = await loader.load();
      
      // Process each document
      for (const doc of docs) {
        const content = doc.pageContent;
        
        // Skip if content is too short
        if (content.length < 200) continue;
        
        // Split by sections or links
        const sections = content.split(/\n\n|\n---\n/);
        
        for (const section of sections) {
          if (section.length > 200 && 
              (section.toLowerCase().includes('transition') || 
               section.toLowerCase().includes('career') || 
               section.toLowerCase().includes('skills'))) {
            
            results.push({
              source: 'Google Search',
              content: section.substring(0, 5000),
              url: doc.metadata.sourceURL || searchUrl
            });
          }
        }
      }
    } catch (domainError) {
      console.error("Error in domain-specific search:", domainError);
    }
    
    // If we found results now, return them
    if (results.length > 0) {
      console.log(`Found ${results.length} relevant results from domain search`);
      return results;
    }
    
    // If still no results, try to extract structured data from career websites
    try {
      console.log("Trying structured data extraction with Firecrawl");
      
      // We'll use scrape mode since "extract" mode isn't available in the current version
      const loader = new FireCrawlLoader({
        url: "https://www.indeed.com/career-advice/finding-a-job/career-change",
        apiKey: process.env.FIRECRAWL_API_KEY,
        mode: "scrape",
        params: {
          enableScripts: true,
          enableImages: false,
          wait: 2000
        }
      });
      
      // Load documents using LangChain
      const docs = await loader.load();
      
      // Process extracted data
      if (docs.length > 0) {
        docs.forEach(doc => {
          results.push({
            source: 'Indeed Career Advice',
            content: doc.pageContent,
            url: doc.metadata.sourceURL || 'https://www.indeed.com/career-advice'
          });
        });
      }
    } catch (extractError) {
      console.error("Error in structured data extraction:", extractError);
    }
    
    // If we found results now, return them
    if (results.length > 0) {
      console.log(`Found ${results.length} relevant results from structured data extraction`);
      return results;
    }
    
    // If still no results, try map mode for more comprehensive analysis
    try {
      console.log("Trying map mode for comprehensive career transition data");
      
      // Use map mode to analyze a more general career change article
      const loader = new FireCrawlLoader({
        url: "https://www.indeed.com/career-advice/finding-a-job/career-change",
        apiKey: process.env.FIRECRAWL_API_KEY,
        mode: "map",
        params: {
          mapParams: {
            prompt: `Extract information about transitions from ${currentRole} to ${targetRole}, or similar career changes if that specific transition isn't mentioned.`
          },
          enableScripts: true,
          enableImages: false,
          wait: 2000
        }
      });
      
      // Load mapped document
      const docs = await loader.load();
      
      // Process mapped data
      if (docs.length > 0) {
        console.log(`Found ${docs.length} results from map mode`);
        docs.forEach(doc => {
          results.push({
            source: 'Career Change Guide',
            content: doc.pageContent,
            url: doc.metadata.source || 'https://www.indeed.com/career-advice'
          });
        });
      }
    } catch (mapError) {
      console.error("Error in map mode extraction:", mapError);
    }
    
    // If we found results now, return them
    if (results.length > 0) {
      console.log(`Found ${results.length} relevant results from structured data extraction`);
      return results;
    }
    
    // If still no results, try more generic search terms for general career transitions
    console.log("No relevant results found, trying more generic search terms");
    
    // Generic career transition search terms
    const genericSearchTerms = [
      "software engineer career transition",
      "tech career switching tips",
      "changing jobs in tech industry",
      "software career path progression",
      "moving between tech companies",
      "tech job promotion skills"
    ];
    
    // Try each generic search term
    for (const searchTerm of genericSearchTerms) {
      try {
        console.log(`Searching for generic term: "${searchTerm}"`);
        
        // Use Google search with the more generic term
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
        
        // Use the FireCrawlLoader from LangChain
        const loader = new FireCrawlLoader({
          url: searchUrl,
          apiKey: process.env.FIRECRAWL_API_KEY,
          mode: "scrape",
          params: {
            enableScripts: true,
            enableImages: false,
            wait: 2000
          }
        });
        
        // Load documents using LangChain
        const docs = await loader.load();
        
        // Process each document
        for (const doc of docs) {
          const content = doc.pageContent;
          
          // Skip if content is too short
          if (content.length < 200) continue;
          
          // Add relevant content to results
          results.push({
            source: 'Career Transition Guide',
            content: content.substring(0, 5000),
            url: doc.metadata.source || searchUrl
          });
          
          // If we have enough results, return
          if (results.length >= 2) {
            console.log(`Found ${results.length} results using generic search terms`);
            return results;
          }
        }
      } catch (error) {
        console.error(`Error searching for generic term "${searchTerm}":`, error);
      }
    }
    
    // If we still found no results, return an empty array
    // We won't use any synthetic data as per user's request
    console.log("No relevant results found, returning empty array");
    return [];
  } catch (error) {
    console.error("Error in forum scraping:", error);
    // Return empty array instead of fallback data
    return [];
  }
}
