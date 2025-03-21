import axios from 'axios';

// Resource type interface
interface Resource {
  title: string;
  url: string;
  type: string; // "Book", "Video", "Course", "GitHub", etc.
}

/**
 * Find learning resources using Perplexity API
 * @param skill The skill to find resources for
 * @param context Additional context about the skill
 * @returns Array of resource objects
 */
export async function findResources(skill: string, context: string): Promise<Resource[]> {
  try {
    console.log(`Finding resources for skill: ${skill}`);
    
    // Create search query
    const searchQuery = `Find the best free online resources for learning "${skill}" for tech career transitions. ${context}`;
    
    // Check if API key is available
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("Perplexity API key is required to find resources");
    }
    
    // Call Perplexity API
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: `You are a technical learning resource finder. 
              Find high-quality, free learning resources for technical skills.
              Return results as a JSON array of objects with these properties:
              - title: The name of the resource
              - url: The URL of the resource (must be valid and working)
              - type: The type of resource (Book, Video, Course, GitHub, etc.)
              
              Be specific with titles and accurate with URLs.
              Focus on widely respected, free resources.
              Limit to 2-3 high-quality resources.`
          },
          {
            role: "user",
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        search_domain_filter: ["perplexity.ai"],
        search_recency_filter: "month",
        top_p: 0.9,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Parse and validate response
    try {
      const content = response.data.choices[0].message.content;
      
      // Try to extract JSON array from text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const resources = JSON.parse(jsonMatch[0]);
        return validateResources(resources);
      }
      
      // If no JSON array found, try parsing the whole content
      try {
        const resources = JSON.parse(content);
        return validateResources(resources);
      } catch (parseError: any) {
        // If all parsing attempts fail, throw an error
        console.error("Error parsing Perplexity response content:", parseError);
        throw new Error(`Failed to parse resources for ${skill}: ${parseError?.message || 'Unknown parsing error'}`);
      }
    } catch (parseError: any) {
      console.error("Error parsing Perplexity response:", parseError);
      throw new Error(`Failed to parse Perplexity API response for ${skill}: ${parseError?.message || 'Unknown parsing error'}`);
    }
  } catch (error: any) {
    console.error("Error calling Perplexity API:", error);
    throw new Error(`Failed to retrieve resources from Perplexity API for ${skill}: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Validate resources to ensure they have required fields
 */
function validateResources(resources: any[]): Resource[] {
  if (!Array.isArray(resources)) {
    throw new Error("Invalid response format: resources must be an array");
  }
  
  const validResources = resources
    .filter(resource => 
      typeof resource === 'object' && 
      resource.title && 
      resource.url && 
      resource.type
    )
    .map(resource => ({
      title: resource.title,
      url: resource.url,
      type: resource.type
    }))
    .slice(0, 3); // Limit to 3 resources
    
  if (validResources.length === 0) {
    throw new Error("No valid resources found in API response");
  }
  
  return validResources;
}

/**
 * Search internet forums (Reddit, Quora, Blind, etc.) for career transition stories
 * @param currentRole User's current role
 * @param targetRole User's target role
 * @returns Array of scraped content objects with source, content, and url
 */
export async function searchForums(currentRole: string, targetRole: string): Promise<{ source: string, content: string, url: string }[]> {
  try {
    console.log(`Searching forums for transition from ${currentRole} to ${targetRole}`);
    
    // Check if API key is available
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("Perplexity API key is required to search forums");
    }
    
    // Create search queries
    const searchQueries = [
      `Career transition stories from ${currentRole} to ${targetRole} Reddit`,
      `How to transition from ${currentRole} to ${targetRole} Blind forum`,
      `${currentRole} to ${targetRole} career change Quora`,
      `${targetRole} skills needed coming from ${currentRole} background`
    ];
    
    // Process all queries and combine results
    const allResults = await Promise.all(
      searchQueries.map(async (query) => {
        try {
          return await executeForumSearch(query);
        } catch (error) {
          console.error(`Error searching forums with query "${query}":`, error);
          return [];
        }
      })
    );
    
    // Flatten and deduplicate results
    const combinedResults = allResults.flat();
    
    // Filter out any empty results and deduplicate by URL
    const uniqueUrls = new Set<string>();
    const filteredResults = combinedResults.filter(result => {
      if (!result.url || !result.content || uniqueUrls.has(result.url)) {
        return false;
      }
      uniqueUrls.add(result.url);
      return true;
    });
    
    if (filteredResults.length === 0) {
      throw new Error("No forum search results found for this career transition");
    }
    
    console.log(`Found ${filteredResults.length} forum posts about ${currentRole} to ${targetRole} transition`);
    return filteredResults;
  } catch (error: any) {
    console.error("Error in forum search:", error);
    throw new Error(`Failed to search forums for career transition data: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Execute a forum search query using Perplexity
 * @param searchQuery The query to search for
 * @returns Array of search results
 */
async function executeForumSearch(searchQuery: string): Promise<{ source: string, content: string, url: string }[]> {
  try {
    console.log(`Executing forum search: "${searchQuery}"`);
    
    // Call Perplexity API
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: `You are a web forum search expert that extracts real career transition stories and advice.
              Search the internet for posts, comments, and threads related to the user's query.
              Focus on Reddit, Quora, Blind, and other professional forums.
              
              For each result, return:
              1. The source (name of the forum + thread)
              2. A detailed excerpt of the relevant content (full paragraphs, not summaries)
              3. The URL of the post
              
              Return results as a JSON array of objects with these properties:
              - source: string (e.g., "Reddit - r/cscareerquestions")
              - content: string (the full text of the post or comment)
              - url: string (direct link to the post)
              
              Return 3-5 high-quality results.
              NEVER make up or fabricate content. Only return real posts from the internet.
              Search with high effort to find authentic career stories.`
          },
          {
            role: "user",
            content: searchQuery
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        search_domain_filter: ["perplexity.ai"],
        search_depth: "deep", // Request deeper search
        search_recency_filter: "year",
        top_p: 0.9,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Parse and validate response
    try {
      const content = response.data.choices[0].message.content;
      
      // Try to extract JSON array from text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        return validateForumResults(results);
      }
      
      // If no JSON array found, try parsing the whole content
      try {
        const results = JSON.parse(content);
        return validateForumResults(results);
      } catch (parseError: any) {
        console.error("Error parsing Perplexity response content:", parseError);
        throw new Error(`Failed to parse forum search results: ${parseError?.message || 'Unknown parsing error'}`);
      }
    } catch (parseError: any) {
      console.error("Error parsing Perplexity response:", parseError);
      throw new Error(`Failed to parse Perplexity API response: ${parseError?.message || 'Unknown parsing error'}`);
    }
  } catch (error: any) {
    console.error("Error calling Perplexity API for forum search:", error);
    throw new Error(`Failed to search forums: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Validate forum search results to ensure they have required fields
 */
function validateForumResults(results: any[]): { source: string, content: string, url: string }[] {
  if (!Array.isArray(results)) {
    throw new Error("Invalid response format: forum results must be an array");
  }
  
  const validResults = results
    .filter(result => 
      typeof result === 'object' && 
      result.source && 
      result.content && 
      result.url
    )
    .map(result => ({
      source: result.source,
      content: result.content,
      url: result.url
    }));
    
  if (validResults.length === 0) {
    throw new Error("No valid forum results found in API response");
  }
  
  return validResults;
}

// No fallback methods allowed - we only use real data
