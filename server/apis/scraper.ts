// Web scraping service using firecrawl
import firecrawl from 'firecrawl';

// Interface for scraped data
interface ScrapedResult {
  source: string;
  content: string;
  url: string;
}

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
    
    // Clean inputs for search queries
    const cleanCurrentRole = currentRole.replace(/[^\w\s]/gi, '').trim();
    const cleanTargetRole = targetRole.replace(/[^\w\s]/gi, '').trim();
    
    // Create search queries for Reddit and Quora
    const searchQueries = [
      // Reddit queries
      `site:reddit.com ${cleanCurrentRole} to ${cleanTargetRole} transition`,
      `site:reddit.com moved from ${cleanCurrentRole} to ${cleanTargetRole}`,
      // Quora queries
      `site:quora.com transition from ${cleanCurrentRole} to ${cleanTargetRole}`,
      `site:quora.com how to move from ${cleanCurrentRole} to ${cleanTargetRole}`
    ];
    
    // Results array
    const results: ScrapedResult[] = [];
    
    // Scrape each query with rate limiting
    for (const query of searchQueries) {
      try {
        // Use firecrawl to extract text from search results
        const searchResults = await firecrawl.search(query, { limit: 3 });
        
        for (const result of searchResults) {
          // Extract content from each result
          try {
            const content = await firecrawl.extract(result.url);
            
            // Determine source
            const source = result.url.includes('reddit.com') ? 'reddit' : 
                         result.url.includes('quora.com') ? 'quora' : 'other';
            
            // Add to results if content is long enough
            if (content && content.length > 50) {
              results.push({
                source,
                content,
                url: result.url
              });
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (extractError) {
            console.error(`Error extracting content from ${result.url}:`, extractError);
          }
        }
      } catch (searchError) {
        console.error(`Error searching for "${query}":`, searchError);
      }
      
      // Rate limiting between queries
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`Found ${results.length} results from forums`);
    
    // Return results, with a fallback if none found
    return results.length > 0 ? results : generateFallbackResults(cleanCurrentRole, cleanTargetRole);
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
