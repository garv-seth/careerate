// Gemini API integration for resource discovery and plan generation
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Use Gemini AI to generate the most appropriate API call for a given platform and query
 * 
 * @param platform The API platform to use ("Reddit", "Quora", or "Forums")
 * @param query The search query to use
 * @returns JSON string with API call details
 */
export async function generateApiCall(platform: string, query: string): Promise<string> {
  try {
    // Safety check - don't proceed if we don't have an API key
    if (!process.env.GEMINI_API_KEY) {
      console.error("Missing Gemini API key");
      
      // Return default API call configurations if Gemini is not available
      if (platform === "Reddit") {
        return JSON.stringify({
          method: 'GET',
          url: 'https://reddit-scraper2.p.rapidapi.com/search_posts',
          host: 'reddit-scraper2.p.rapidapi.com',
          params: { query, sort: 'RELEVANCE', time: 'all' }
        });
      } else if (platform === "Quora") {
        return JSON.stringify({
          method: 'GET',
          url: 'https://quora-scraper.p.rapidapi.com/search_answers',
          host: 'quora-scraper.p.rapidapi.com',
          endpoint: 'search_answers',
          params: { query, language: 'en', time: 'all_times' }
        });
      } else {
        return JSON.stringify({
          method: 'GET',
          url: 'https://real-time-forums-search.p.rapidapi.com/search',
          host: 'real-time-forums-search.p.rapidapi.com',
          params: { q: query, gl: 'us', hl: 'en' }
        });
      }
    }
    
    // Import Google AI SDK
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    
    // Initialize the Google AI SDK with API key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create API-specific prompts with documentation
    let prompt = "";
    
    if (platform === "Reddit") {
      prompt = `Generate the most appropriate API call for Reddit API using this documentation:
      
API Host: reddit-scraper2.p.rapidapi.com
Search posts endpoint: /search_posts
Required Parameters:
- query: the keyword or phrase for searching posts (string)

Optional Parameters:
- sort: the type of post sorting. Available options:
  - RELEVANCE
  - HOT
  - NEW
  - TOP
  - COMMENTS (by number of comments)
- time: the time frame to search within. Used only when sort is TOP, RELEVANCE, or COMMENTS:
  - all
  - year
  - month
  - week
  - day
  - hour
- nsfw: whether to retrieve content that is not safe for work (1 for Yes, 0 for No)

For the search query: "${query}"

Only return a JSON object with these fields:
{
  "method": "GET",
  "url": "https://reddit-scraper2.p.rapidapi.com/search_posts",
  "host": "reddit-scraper2.p.rapidapi.com",
  "params": { query, sort, time, nsfw (optional) }
}`;
    } else if (platform === "Quora") {
      prompt = `Generate the most appropriate API call for Quora API using this documentation:
      
API Host: quora-scraper.p.rapidapi.com
Search answers endpoint: /search_answers
Search questions endpoint: /search_questions

Required Parameters for both endpoints:
- query: the keyword or phrase to search for (string)
- language: Two-letter language code. Use "en" for English.

Optional Parameters:
- time: the time period to search within:
  - all_times
  - hour
  - day
  - week
  - month
  - year

For the search query: "${query}"

Decide which is more appropriate (search_answers or search_questions) based on the query.
Only return a JSON object with these fields:
{
  "method": "GET",
  "url": "https://quora-scraper.p.rapidapi.com/[endpoint]",
  "host": "quora-scraper.p.rapidapi.com",
  "endpoint": "[endpoint name]",
  "params": { query, language, time }
}`;
    } else {
      prompt = `Generate the most appropriate API call for Forum Search API using this documentation:
      
API Host: real-time-forums-search.p.rapidapi.com
Search endpoint: /search

Required Parameters:
- q: the query string to search for (string)

Optional Parameters:
- gl: country code for Google Search (default: "us")
- hl: language code for Google Search (default: "en")
- num: number of results to return (1-100, default: 10)

For the search query: "${query}"

Only return a JSON object with these fields:
{
  "method": "GET",
  "url": "https://real-time-forums-search.p.rapidapi.com/search",
  "host": "real-time-forums-search.p.rapidapi.com",
  "params": { q, gl, hl, num (optional) }
}`;
    }
    
    // Generate API call with Gemini Pro
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    // If JSON extraction fails, return default configurations
    if (platform === "Reddit") {
      return JSON.stringify({
        method: 'GET',
        url: 'https://reddit-scraper2.p.rapidapi.com/search_posts',
        host: 'reddit-scraper2.p.rapidapi.com',
        params: { query, sort: 'RELEVANCE', time: 'all' }
      });
    } else if (platform === "Quora") {
      return JSON.stringify({
        method: 'GET',
        url: 'https://quora-scraper.p.rapidapi.com/search_answers',
        host: 'quora-scraper.p.rapidapi.com',
        endpoint: 'search_answers',
        params: { query, language: 'en', time: 'all_times' }
      });
    } else {
      return JSON.stringify({
        method: 'GET',
        url: 'https://real-time-forums-search.p.rapidapi.com/search',
        host: 'real-time-forums-search.p.rapidapi.com',
        params: { q: query, gl: 'us', hl: 'en' }
      });
    }
  } catch (error) {
    console.error("Error generating API call with Gemini:", error);
    
    // Return default configurations if an error occurs
    if (platform === "Reddit") {
      return JSON.stringify({
        method: 'GET',
        url: 'https://reddit-scraper2.p.rapidapi.com/search_posts',
        host: 'reddit-scraper2.p.rapidapi.com',
        params: { query, sort: 'RELEVANCE', time: 'all' }
      });
    } else if (platform === "Quora") {
      return JSON.stringify({
        method: 'GET',
        url: 'https://quora-scraper.p.rapidapi.com/search_answers',
        host: 'quora-scraper.p.rapidapi.com',
        endpoint: 'search_answers',
        params: { query, language: 'en', time: 'all_times' }
      });
    } else {
      return JSON.stringify({
        method: 'GET',
        url: 'https://real-time-forums-search.p.rapidapi.com/search',
        host: 'real-time-forums-search.p.rapidapi.com',
        params: { q: query, gl: 'us', hl: 'en' }
      });
    }
  }
}

/**
 * Generate a development plan with milestones using Gemini
 * Includes specific YouTube resources and other learning materials
 * 
 * @param currentRole User's current role
 * @param targetRole User's target role
 * @param skills Array of skills to focus on
 * @returns Array of milestone objects with resources
 */
export async function generatePlanWithGemini(
  currentRole: string,
  targetRole: string,
  skills: string[]
): Promise<any[]> {
  console.log(`Generating plan for transition: ${currentRole} → ${targetRole}`);
  console.log(`Skills to focus on:`, skills);

  try {
    // Get a unique set of skills (no duplicates)
    const uniqueSkills = skills.filter((skill, index) => 
      skills.indexOf(skill) === index
    );
    
    // Create a model instance with safety settings
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Create prompt for Gemini
    const prompt = `Create a 5-milestone career transition plan for someone transitioning from ${currentRole} to ${targetRole}.

Focus on these skills: ${uniqueSkills.join(', ')}

For each milestone:
1. Create a clear title and description of what to learn
2. Assign a priority level (High, Medium, Low)
3. Estimate duration in weeks
4. For each milestone, find exactly 3 learning resources including:
   - At least one YouTube video with specific URL (the complete YouTube URL)
   - One book or online course
   - One GitHub repository or practical project
   
Format the response as a valid JSON array with this structure:
[{
  "title": "Milestone title",
  "description": "Detailed description",
  "priority": "High/Medium/Low",
  "durationWeeks": number,
  "order": number (1-5),
  "resources": [
    {
      "title": "Resource title",
      "url": "URL for resource (complete URL)",
      "type": "YouTube/Book/Course/GitHub"
    },
    ... (3 resources per milestone)
  ]
}]

Return only valid JSON with no additional explanation.`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    let milestones = [];
    try {
      // Find and extract JSON from the response
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        milestones = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the whole response as JSON
        milestones = JSON.parse(text);
      }
      
      // Verify each milestone has the required fields
      milestones = milestones.map((milestone: any) => {
        return {
          title: milestone.title,
          description: milestone.description || "No description provided",
          priority: milestone.priority || "Medium",
          durationWeeks: milestone.durationWeeks || 4,
          order: milestone.order || 1,
          progress: 0, // Default progress
          resources: Array.isArray(milestone.resources) ? 
            milestone.resources.map((resource: any) => ({
              title: resource.title || "Resource",
              url: resource.url || "https://www.youtube.com/",
              type: resource.type || "YouTube"
            })) : 
            []
        };
      });
      
      console.log(`Successfully generated ${milestones.length} milestones with resources`);
      return milestones;
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      throw new Error("Failed to parse the plan from Gemini");
    }
  } catch (error) {
    console.error("Error generating plan with Gemini:", error);
    throw error;
  }
}

/**
 * Find learning resources for a specific skill
 * Focuses on discovering YouTube videos and practical coding resources
 * 
 * @param skill The skill to find resources for
 * @param context Additional context about the skill
 * @returns Array of resource objects
 */
export async function findResourcesWithGemini(
  skill: string,
  context: string
): Promise<{ title: string; url: string; type: string }[]> {
  console.log(`Finding resources for skill: ${skill}`);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `Find 3 top learning resources for mastering "${skill}" in the context of ${context}. 
    Include at least one specific YouTube video with its complete URL.
    For each resource, provide:
    1. Title
    2. Complete URL (direct link)
    3. Type (YouTube, Book, Course, GitHub, etc.)
    
    Format your answer as a JSON array:
    [
      {
        "title": "Resource name",
        "url": "Complete URL",
        "type": "Resource type"
      }
    ]
    Return only the JSON data with no additional text.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    try {
      // Try to extract a JSON array from the response
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const resources = JSON.parse(jsonMatch[0]);
        return resources.slice(0, 3); // Limit to 3 resources
      } else {
        // If no JSON array found, try to parse the entire text
        const resources = JSON.parse(text);
        return Array.isArray(resources) ? resources.slice(0, 3) : [];
      }
    } catch (parseError) {
      console.error("Error parsing Gemini resources response:", parseError);
      return [];
    }
  } catch (error) {
    console.error(`Error finding resources for ${skill}:`, error);
    return [];
  }
}

/**
 * Analyze a transition story to extract insights
 * 
 * @param currentRole Current role
 * @param targetRole Target role
 * @param scrapedContent Array of scraped content objects
 * @returns Structured insights
 */
export async function analyzeTransitionStories(
  currentRole: string, 
  targetRole: string, 
  scrapedContent: any[]
): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Combine all content for analysis
    const combinedContent = scrapedContent.map(item => 
      `SOURCE: ${item.source}\n${item.content}\n---\n`
    ).join('\n');
    
    const prompt = `You are Cara, an AI career transition analyst.
    
    Analyze these career transition stories about moving from ${currentRole} to ${targetRole}:
    
    ${combinedContent}
    
    Provide a structured analysis with:
    1. Success Rate (percentage) based on the stories
    2. Average Transition Time (in months)
    3. Common Paths (strategies people used)
    4. Key Observations (patterns in the transition stories)
    5. Common Challenges faced during transitions
    
    Format your response as a JSON object with these fields:
    {
      "successRate": number,
      "avgTransitionTime": number,
      "commonPaths": [
        { "path": "description", "count": number }
      ],
      "keyObservations": [
        "observation 1", "observation 2", ...
      ],
      "commonChallenges": [
        "challenge 1", "challenge 2", ...
      ]
    }
    
    Base your analysis exclusively on the provided stories. Do not make up or invent data.
    If there's insufficient data for any field, provide a conservative estimate based only on the available information.
    Return only the JSON object.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      // Try to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Gemini insights analysis:", parseError);
      throw new Error("Failed to generate insights from scraped content");
    }
  } catch (error) {
    console.error("Error analyzing transition stories with Gemini:", error);
    throw error;
  }
}

/**
 * Generate transition overview statistics based on scraped data
 * 
 * @param currentRole Current role
 * @param targetRole Target role
 * @param scrapedContent Array of scraped content objects
 * @returns Overview statistics
 */
export async function generateTransitionOverview(
  currentRole: string,
  targetRole: string,
  scrapedContent: any[]
): Promise<{
  successRate: number;
  avgTransitionTime: number;
  commonPaths: Array<{ path: string; count: number }>;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Combine all content for analysis
    const combinedContent = scrapedContent.map(item => 
      `SOURCE: ${item.source}\nURL: ${item.url || 'Not available'}\nCONTENT: ${item.content}\n---\n`
    ).join('\n');
    
    const prompt = `You are Cara, an AI career transition analyst.
    
    I have ${scrapedContent.length} real stories from people who transitioned from ${currentRole} to ${targetRole}.
    
    Here are the stories:
    
    ${combinedContent}
    
    Based ONLY on this real data (do not invent statistics), provide:
    1. Success Rate (percentage) - estimate how many transitions were successful
    2. Average Transition Time (in months) - time it took to complete the transition
    3. Common Paths - list the most common strategies people used to transition
    
    Format your response as JSON:
    {
      "successRate": number,
      "avgTransitionTime": number,
      "commonPaths": [
        { "path": "description", "count": number }
      ]
    }
    
    The counts should reflect the actual number of times a path was mentioned in the stories.
    Your analysis must be 100% based on the provided stories only. Don't invent data.
    Return only the JSON object.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      // Try to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      let overviewData;
      
      if (jsonMatch) {
        overviewData = JSON.parse(jsonMatch[0]);
      } else {
        overviewData = JSON.parse(text);
      }
      
      // Validate and ensure the data structure is correct
      return {
        successRate: typeof overviewData.successRate === 'number' ? Math.min(Math.max(overviewData.successRate, 0), 100) : 75,
        avgTransitionTime: typeof overviewData.avgTransitionTime === 'number' ? Math.max(overviewData.avgTransitionTime, 1) : 6,
        commonPaths: Array.isArray(overviewData.commonPaths) ? 
          overviewData.commonPaths.map(path => ({
            path: path.path || "Unspecified path",
            count: typeof path.count === 'number' ? Math.max(path.count, 1) : 1
          })) : []
      };
    } catch (parseError) {
      console.error("Error parsing Gemini overview generation:", parseError);
      throw new Error("Failed to generate transition overview from scraped content");
    }
  } catch (error) {
    console.error("Error generating transition overview with Gemini:", error);
    throw error;
  }
}