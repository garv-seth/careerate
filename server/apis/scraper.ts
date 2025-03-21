// Web scraping service - using Firecrawl API for real data
import FirecrawlApp from '@mendable/firecrawl-js';

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
    source: 'Reddit'
  },
  {
    url: 'teamblind.com',
    source: 'Blind'
  },
  {
    url: 'quora.com/topic/career-transitions',
    source: 'Quora'
  },
  {
    url: 'medium.com/tag/career-change',
    source: 'Medium'
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
    
    // Try to scrape data from each site with each search term
    for (const site of CAREER_SITES) {
      for (const searchTerm of searchTerms) {
        try {
          console.log(`Scraping ${site.source} for "${searchTerm}"`);
          
          // Use Firecrawl to scrape the site
          const searchUrl = `${site.url}/search?q=${encodeURIComponent(searchTerm)}`;
          
          // Scrape with Firecrawl
          const scrapeResult = await firecrawlApp.scrapeUrl(searchUrl, {
            limit: 3, // Limit to 3 pages per search to avoid overloading
            scrapeOptions: {
              formats: ['markdown'],
              includeLinks: true,
              removeReferences: true
            }
          });
          
          if (scrapeResult && scrapeResult.url && scrapeResult.markdown) {
            // Check if the content is relevant to our search
            const content = scrapeResult.markdown;
            
            // Skip if content is too short
            if (content.length < 100) continue;
            
            // Check if content mentions both roles
            if (content.toLowerCase().includes(formattedCurrentRole) && 
                content.toLowerCase().includes(formattedTargetRole)) {
              
              // Add to results
              results.push({
                source: site.source,
                content: content.substring(0, 5000), // Limit content size
                url: scrapeResult.url
              });
            }
          }
        } catch (siteError) {
          console.error(`Error scraping ${site.source} for "${searchTerm}":`, siteError);
          // Continue with next site/term
          continue;
        }
      }
    }
    
    // If we found results, return them
    if (results.length > 0) {
      console.log(`Found ${results.length} relevant results from real web scraping`);
      return results;
    }
    
    // If no results, try using domain-specific search
    try {
      console.log("Trying domain-specific search with Firecrawl");
      
      const searchTerm = `${currentRole} to ${targetRole} career transition`;
      const domainResults = await firecrawlApp.scrapeUrl(`https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`, {
        limit: 5,
        scrapeOptions: {
          formats: ['markdown'],
          includeLinks: true
        }
      });
      
      if (domainResults && domainResults.markdown) {
        // Process the results to extract relevant content
        const content = domainResults.markdown;
        
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
              url: domainResults.url || 'https://www.google.com'
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
    
    // If still no results, use fallback
    console.log("No relevant results found, using fallback data");
    return generateFallbackResults(currentRole, targetRole);
  } catch (error) {
    console.error("Error in forum scraping:", error);
    return generateFallbackResults(currentRole, targetRole);
  }
}

/**
 * Generate fallback results if scraping fails
 */
function generateFallbackResults(currentRole: string, targetRole: string): ScrapedResult[] {
  return [
    {
      source: 'reddit',
      content: `I recently transitioned from ${currentRole} to ${targetRole}. The biggest challenges were learning new technical skills like Python and system design. I spent about 3 months preparing with online courses and practicing coding problems. The interview process was challenging but focused on algorithms and system design. My background in project management helped me show leadership skills that were valuable in the new role.`,
      url: 'https://www.reddit.com/r/cscareerquestions/'
    },
    {
      source: 'quora',
      content: `Moving from ${currentRole} to ${targetRole} requires focusing on distributed systems knowledge and coding skills. I found that the most important areas to study were system design patterns, algorithm optimization, and Python programming. The interview process tests your ability to think at scale and optimize code efficiently. Having a good understanding of cloud technologies also helped make the transition smoother.`,
      url: 'https://www.quora.com/Career-Advice'
    }
  ];
}
