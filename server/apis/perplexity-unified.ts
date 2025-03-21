/**
 * Unified Perplexity API Service
 * 
 * This file centralizes all Perplexity API calls for the application,
 * using the Sonar model which provides real-time web search capabilities.
 */

import axios from 'axios';
import { z } from 'zod';

// Environment variables check
if (!process.env.PERPLEXITY_API_KEY) {
  console.error('PERPLEXITY_API_KEY environment variable is not set');
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Headers for API calls
const getHeaders = () => ({
  'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
  'Content-Type': 'application/json'
});

/**
 * Normalize and standardize various date formats to ISO format (YYYY-MM-DD)
 * Handles:
 * - ISO dates
 * - MM/DD/YYYY or DD/MM/YYYY
 * - Month DD, YYYY
 * - Relative dates (X days/months/years ago)
 * 
 * @param dateStr The date string to normalize
 * @returns Normalized date in YYYY-MM-DD format or original string if parsing fails
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const date = dateStr.trim();
  
  // Already in YYYY-MM-DD or YYYY/MM/DD format
  if (date.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
    return date.replace(/\//g, '-');
  } 
  
  // In MM-DD-YYYY or DD-MM-YYYY format
  if (date.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
    const parts = date.replace(/\//g, '-').split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }
  
  // In Month DD, YYYY format (e.g., "January 1, 2023")
  if (date.match(/[A-Za-z]+\s+\d{1,2},?\s+\d{4}/)) {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {
      console.log('Failed to parse date:', date);
    }
  }
  
  // Handle relative dates like "2 months ago", "1 year ago", etc.
  if (date.toLowerCase().includes('ago') || 
      date.toLowerCase().includes('month') || 
      date.toLowerCase().includes('year') || 
      date.toLowerCase().includes('day')) {
    const now = new Date();
    
    if (date.toLowerCase().includes('year')) {
      const yearMatch = date.match(/(\d+)\s*year/);
      if (yearMatch && yearMatch[1]) {
        const years = parseInt(yearMatch[1]);
        now.setFullYear(now.getFullYear() - years);
        return now.toISOString().split('T')[0];
      }
    } 
    
    if (date.toLowerCase().includes('month')) {
      const monthMatch = date.match(/(\d+)\s*month/);
      if (monthMatch && monthMatch[1]) {
        const months = parseInt(monthMatch[1]);
        now.setMonth(now.getMonth() - months);
        return now.toISOString().split('T')[0];
      }
    } 
    
    if (date.toLowerCase().includes('day')) {
      const dayMatch = date.match(/(\d+)\s*day/);
      if (dayMatch && dayMatch[1]) {
        const days = parseInt(dayMatch[1]);
        now.setDate(now.getDate() - days);
        return now.toISOString().split('T')[0];
      }
    }
  }
  
  // Return original if no patterns match
  return date;
}

/**
 * Generic function to make calls to Perplexity API with the Sonar model
 * 
 * @param prompt The prompt to send to Perplexity
 * @param maxTokens Maximum tokens for the response
 * @returns The API response text
 */
export async function callPerplexity(
  prompt: string, 
  maxTokens: number = 1000
): Promise<string> {
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY environment variable is not set');
    }

    // Debug: Log the request (without API key)
    console.log('Sending request to Perplexity API with model: sonar');

    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: "sonar", // Using the Sonar model for real-time web search
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens
      },
      { headers: getHeaders() }
    );

    // Debug: Log structure of response (without sensitive content)
    console.log('Perplexity API response structure:', 
      Object.keys(response.data),
      'choices length:', response.data.choices?.length);

    // Check if the response has the expected structure
    if (response.data && 
        response.data.choices && 
        Array.isArray(response.data.choices) && 
        response.data.choices.length > 0 && 
        response.data.choices[0].message && 
        response.data.choices[0].message.content) {
      
      // Return the content from the first choice
      return response.data.choices[0].message.content;
    } else {
      console.error('Unexpected API response structure:', JSON.stringify(response.data, null, 2));
      throw new Error('Unexpected response structure from Perplexity API');
    }
  } catch (error: any) {
    // Handle specific API errors
    const errorResponse = error.response?.data;
    
    if (errorResponse) {
      console.error('Perplexity API error response:', JSON.stringify(errorResponse, null, 2));
    }
    
    const errorMessage = errorResponse?.error?.message || 
                        error.response?.statusText || 
                        error.message || 
                        'Unknown error';
    
    throw new Error(`Perplexity API error: ${errorMessage}`);
  }
}

/**
 * Search internet forums (Reddit, Quora, Blind, etc.) for career transition stories
 * 
 * @param currentRole User's current role
 * @param targetRole User's target role
 * @returns Array of scraped content objects with source, content, url and date
 */
export async function searchForums(
  currentRole: string,
  targetRole: string
): Promise<{ source: string; content: string; url: string; date: string }[]> {
  try {
    const searchQuery = `
      Find detailed stories from people who have successfully transitioned from "${currentRole}" to "${targetRole}" careers.
      Search across Reddit, Quora, Blind, HackerNews, Medium, LinkedIn and other relevant professional forums.
      
      For each story:
      1. Provide ONLY stories from people who have ACTUALLY completed this specific career transition
      2. Include the EXACT and COMPLETE text of their career transition story
      3. Provide the exact source platform (Reddit, Quora, etc.) with the specific subreddit or forum section
      4. Include the complete URL to the original post (not just the domain)
      5. Include the exact publication date in YYYY-MM-DD format whenever possible
         - For Reddit: include the exact post date from the post metadata (not just "2 years ago")
         - For Quora: include the exact answer date or last updated date
         - For Blind: include the post date
         - For Medium/blogs: include the publication date shown on the article
      
      Format each result precisely as:
      Source: [platform name with specific forum/subreddit]
      URL: [complete URL to the specific post]
      Date: [YYYY-MM-DD or most specific date available]
      Content:
      [The complete text of the transition story]
      
      Return at least 3-5 highly relevant examples with proper citations.
      Do NOT generate or fabricate stories. Only return real examples you can cite with URLs.
      Use triple backticks as delimiters between different stories to make them easy to parse.
    `;

    const response = await callPerplexity(searchQuery, 1500);
    return parseForumResults(response);
  } catch (error: any) {
    console.error('Error searching forums with Perplexity:', error);
    throw new Error(`Failed to search forums: ${error.message}`);
  }
}

/**
 * Parse the forum search results from Perplexity's response
 */
function parseForumResults(responseText: string): { source: string; content: string; url: string; date: string }[] {
  try {
    // Debug
    console.log('Parsing forum results from Perplexity response');
    
    const results: { source: string; content: string; url: string; date: string }[] = [];
    
    // Check if we received a JSON structure first
    try {
      // Try to find a JSON array in the response
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        if (Array.isArray(jsonData)) {
          console.log(`Found JSON array with ${jsonData.length} entries`);
          
          for (const item of jsonData) {
            if (item.source && item.content) {
              results.push({
                source: item.source,
                content: item.content,
                url: item.url || 'Not provided',
                date: item.date ? normalizeDate(item.date) : 'Not provided'
              });
            }
          }
          
          if (results.length > 0) {
            return results;
          }
        }
      }
    } catch (jsonError) {
      console.log('Failed to parse as JSON, trying markdown format');
    }
    
    // First try to split by markdown code blocks which is our preferred format
    const markdownBlocks = responseText.split(/```(?:markdown)?|```/).filter(block => block.trim().length > 0);
    
    // If we have markdown blocks, process them
    if (markdownBlocks.length > 1) {
      console.log(`Found ${markdownBlocks.length} markdown-formatted blocks to parse`);
      
      for (const block of markdownBlocks) {
        if (!block.includes('Source:') && !block.includes('URL:')) continue;
        
        let source = '';
        let url = '';
        let date = '';
        let content = '';

        // Extract source
        const sourceMatch = block.match(/Source:?\s*([^\n]+)/i);
        if (sourceMatch && sourceMatch[1]) {
          source = sourceMatch[1].trim();
        }

        // Extract URL
        const urlMatch = block.match(/URL:?\s*([^\n]+)/i);
        if (urlMatch && urlMatch[1]) {
          url = urlMatch[1].trim();
        }

        // Extract date - try to match YYYY-MM-DD format first
        const dateMatch = block.match(/Date:?\s*([^\n]+)/i);
        if (dateMatch && dateMatch[1]) {
          date = dateMatch[1].trim();
          
          // Use normalizeDate utility function for consistent date handling
          date = normalizeDate(date);
        }

        // Extract content - everything after "Content:" and before the next section
        const contentMatch = block.match(/Content:?\s*([\s\S]+)/i);
        if (contentMatch && contentMatch[1]) {
          content = contentMatch[1].trim();
        }

        // Only add if we have minimum required data
        if (source && content && content.length > 50) {
          results.push({
            source,
            content,
            url: url || 'Not provided',
            date: date || 'Not provided'
          });
        }
      }
    } 
    
    // If no results from markdown blocks, fall back to the original method
    if (results.length === 0) {
      console.log('Falling back to legacy parsing method');
      
      // Split by "Source:" sections
      const storyBlocks = responseText.split(/(?=Source:|SOURCE:)/g).filter(block => block.trim().length > 0);
      
      for (const block of storyBlocks) {
        let source = '';
        let url = '';
        let date = '';
        let content = '';

        // Extract source
        const sourceMatch = block.match(/Source:?\s*([^\n]+)/i);
        if (sourceMatch && sourceMatch[1]) {
          source = sourceMatch[1].trim();
        }

        // Extract URL
        const urlMatch = block.match(/URL:?\s*([^\n]+)/i);
        if (urlMatch && urlMatch[1]) {
          url = urlMatch[1].trim();
        }

        // Extract date
        const dateMatch = block.match(/Date:?\s*([^\n]+)/i);
        if (dateMatch && dateMatch[1]) {
          date = dateMatch[1].trim();
          
          // Use normalizeDate utility function for consistent date handling
          date = normalizeDate(date);
        }

        // Extract content - everything after "Content:" or after all metadata
        const contentMatch = block.match(/Content:?\s*([\s\S]+)/i);
        if (contentMatch && contentMatch[1]) {
          content = contentMatch[1].trim();
        } else {
          // If no Content label, try to extract content after all metadata
          const lines = block.split('\n').filter(line => line.trim().length > 0);
          // Skip metadata lines and join the rest as content
          let contentStarted = false;
          for (const line of lines) {
            if (contentStarted) {
              content += line + '\n';
            } else if (!line.match(/^(Source|URL|Date):/i)) {
              contentStarted = true;
              content += line + '\n';
            }
          }
          content = content.trim();
        }

        // Only add if we have at least source and content
        if (source && content && content.length > 50) {
          results.push({
            source,
            content,
            url: url || 'Not provided',
            date: date || 'Not provided'
          });
        }
      }
    }

    console.log(`Successfully parsed ${results.length} results from Perplexity response`);
    
    // Filter out results that don't have sufficient data
    return results.filter(result => 
      result.source && 
      result.content && 
      result.content.length > 50 && // Ensure content is substantial
      (result.url !== 'Not provided' || result.date !== 'Not provided') // At least URL or date must be provided
    );
  } catch (error) {
    console.error('Error parsing forum results:', error);
    throw new Error('Failed to parse forum search results');
  }
}

/**
 * Extract skills from text content using Perplexity
 * 
 * @param text The content to analyze
 * @returns Array of extracted skills
 */
export async function extractSkills(text: string): Promise<string[]> {
  try {
    const prompt = `
      Analyze the following text about a career transition and extract a list of technical and soft skills 
      that are mentioned or implied as important for the target role:

      ${text.substring(0, 10000)}

      Return ONLY a JSON array of skill names, nothing else. Format your response as:
      ["Python", "System Design", "Leadership", "Distributed Systems"]
      
      Do not include any explanatory text, markdown formatting, or additional information.
      Only provide the JSON array.
    `;

    const response = await callPerplexity(prompt);
    
    try {
      // Attempt to parse the response as JSON directly
      return JSON.parse(response);
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON array from text
      const match = response.match(/\[([\s\S]*)\]/);
      if (match) {
        return JSON.parse(`[${match[1]}]`);
      }
      
      // If still unable to parse, extract skills manually
      const skillsArray = response
        .split(/,|\n/)
        .map(item => {
          // Remove quotes, brackets, numbers, and clean up
          return item.replace(/["\[\]0-9.]/g, '').trim();
        })
        .filter(item => item.length > 0);
      
      return skillsArray;
    }
  } catch (error: any) {
    console.error('Error extracting skills with Perplexity:', error);
    throw new Error(`Failed to extract skills: ${error.message}`);
  }
}

/**
 * Interface for skill gap analysis
 */
export interface SkillGapAnalysis {
  skillName: string;
  gapLevel: 'Low' | 'Medium' | 'High';
  confidenceScore: number;
  mentionCount: number;
  contextSummary: string;
}

/**
 * Analyze skill gaps for a career transition
 * 
 * @param currentRole Current role
 * @param targetRole Target role 
 * @param scrapedContent Array of scraped content
 * @param existingSkills Array of user's existing skills
 */
export async function analyzeSkillGaps(
  currentRole: string,
  targetRole: string,
  scrapedContent: { source: string; content: string; postDate?: string; date?: string }[],
  existingSkills: string[] = []
): Promise<SkillGapAnalysis[]> {
  try {
    // Combine existing skills for analysis
    const skillsContext = existingSkills.length > 0 
      ? `The person currently has the following skills: ${existingSkills.join(', ')}`
      : `We need to determine what skills someone in ${currentRole} would need to acquire to become ${targetRole}`;

    // Combine scraped content
    const combinedContent = scrapedContent
      .map(item => `Source: ${item.source}\nDate: ${item.postDate || item.date || 'Unknown'}\n${item.content}`)
      .join('\n\n---\n\n');

    const prompt = `
      You are a career transition analyst specializing in identifying skill gaps.
      
      CURRENT ROLE: ${currentRole}
      TARGET ROLE: ${targetRole}
      
      ${skillsContext}
      
      Here is data about people who have made this transition:
      ${combinedContent}
      
      Analyze the skill gaps this person would have when transitioning from ${currentRole} to ${targetRole}.
      Search the web for additional information about skills needed for ${targetRole} roles.
      
      For each required skill:
      1. Determine the gap level (Low/Medium/High) based on resume and typical ${currentRole} background
      2. Assign a confidence score (0-100) based on frequency in job postings and career stories
      3. Count approximately how many times each skill is mentioned in the data
      4. Provide a brief context summary about why each skill is important
      5. Cite sources where possible
      
      Return your analysis as a JSON array with objects having these properties:
      - skillName: string (name of the skill)
      - gapLevel: string (must be exactly "Low", "Medium", or "High")
      - confidenceScore: number (between 0-100)
      - mentionCount: number (count of mentions)
      - contextSummary: string (explanation with citation)
      
      Example:
      [
        {
          "skillName": "Distributed Systems",
          "gapLevel": "Medium",
          "confidenceScore": 85,
          "mentionCount": 7,
          "contextSummary": "Essential for ${targetRole} roles according to LinkedIn job analysis. Source: linkedin.com/jobs"
        }
      ]
      
      Return ONLY valid JSON with no explanation or other text.
    `;

    const response = await callPerplexity(prompt, 1500);
    
    // Parse and validate the response
    try {
      // Try to extract JSON
      const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      let skillGapsData;
      
      if (jsonMatch) {
        skillGapsData = JSON.parse(jsonMatch[0]);
      } else {
        try {
          skillGapsData = JSON.parse(response);
        } catch (err) {
          console.error('Failed to parse JSON response directly:', err);
          console.log('Raw response:', response);
          throw new Error('Failed to parse API response');
        }
      }
      
      // Validate the structure
      const validatedData = skillGapsData.map((item: any) => ({
        skillName: String(item.skillName || ''),
        gapLevel: (item.gapLevel === 'Low' || item.gapLevel === 'Medium' || item.gapLevel === 'High') 
          ? item.gapLevel : 'Medium',
        confidenceScore: Number(item.confidenceScore) || 70,
        mentionCount: Number(item.mentionCount) || 1,
        contextSummary: String(item.contextSummary || '')
      }));
      
      return validatedData as SkillGapAnalysis[];
    } catch (parseError) {
      console.error('Error parsing skill gaps response:', parseError);
      throw new Error('Failed to parse skill gap analysis results');
    }
  } catch (error: any) {
    console.error('Error analyzing skill gaps with Perplexity:', error);
    throw new Error(`Failed to analyze skill gaps: ${error.message}`);
  }
}

/**
 * Generate a development plan with milestones
 * 
 * @param currentRole User's current role
 * @param targetRole User's target role
 * @param skills Array of skills to focus on
 * @returns Array of milestone objects with resources
 */
export async function generatePlan(
  currentRole: string,
  targetRole: string,
  skills: string[]
): Promise<any[]> {
  try {
    const prompt = `
      Create a detailed development plan for transitioning from ${currentRole} to ${targetRole}.
      Focus on these key skills: ${skills.join(', ')}
      
      Search the web for the most effective learning paths and resources for this career transition.
      
      Create a structured 3-6 month plan with 4-6 milestones. For each milestone:
      
      1. Provide a clear title and description
      2. Assign a priority level (Low/Medium/High)
      3. Suggest duration in weeks
      4. Include 2-3 specific learning resources, especially YouTube tutorials and courses
      
      For each resource:
      - Title (exact title of the resource)
      - URL (direct link to the resource)
      - Type (Video, Course, Book, GitHub, etc.)
      
      For YouTube videos, find real, high-quality tutorials with exact titles and URLs.
      
      Format your response as JSON array:
      [
        {
          "title": "Milestone name",
          "description": "Detailed description",
          "priority": "High", // or "Medium" or "Low"
          "durationWeeks": 3,
          "order": 1,
          "resources": [
            {
              "title": "Exact resource title",
              "url": "https://exact.url.com",
              "type": "Video"
            }
          ]
        }
      ]
      
      Return ONLY valid JSON with no other text.
    `;

    const response = await callPerplexity(prompt, 2000);
    
    // Parse and validate the response
    try {
      const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      let planData;
      
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
      } else {
        planData = JSON.parse(response);
      }
      
      // Ensure all milestones have the required structure
      const validatedPlan = planData.map((milestone: any, index: number) => ({
        title: String(milestone.title || `Milestone ${index + 1}`),
        description: String(milestone.description || ''),
        priority: (milestone.priority === 'Low' || milestone.priority === 'Medium' || milestone.priority === 'High') 
          ? milestone.priority : 'Medium',
        durationWeeks: Number(milestone.durationWeeks) || 2,
        order: Number(milestone.order) || (index + 1),
        resources: Array.isArray(milestone.resources) 
          ? milestone.resources.map((resource: any) => ({
              title: String(resource.title || ''),
              url: String(resource.url || ''),
              type: String(resource.type || 'Resource')
            }))
          : []
      }));
      
      return validatedPlan;
    } catch (parseError) {
      console.error('Error parsing plan response:', parseError);
      throw new Error('Failed to parse development plan');
    }
  } catch (error: any) {
    console.error('Error generating plan with Perplexity:', error);
    throw new Error(`Failed to generate development plan: ${error.message}`);
  }
}

/**
 * Analyze transition stories to extract insights
 * 
 * @param currentRole Current role
 * @param targetRole Target role
 * @param scrapedContent Array of scraped content objects
 * @returns Structured insights
 */
export async function analyzeTransitionStories(
  currentRole: string,
  targetRole: string,
  scrapedContent: { source: string; content: string; url?: string; postDate?: string; date?: string }[]
): Promise<{
  keyObservations: string[];
  commonChallenges: string[];
}> {
  try {
    // Combine content for analysis
    const combinedContent = scrapedContent.map(item => 
      `SOURCE: ${item.source}\nURL: ${item.url || 'Not available'}\nDATE: ${item.postDate || item.date || 'Not available'}\nCONTENT: ${item.content}\n---\n`
    ).join('\n');

    const prompt = `
      Analyze these real career transition stories from ${currentRole} to ${targetRole}:
      
      ${combinedContent}
      
      Extract:
      1. Key observations - important insights from people who made this transition
      2. Common challenges - difficulties most people faced during the transition
      
      For each point:
      - Be concise and complete (do not end with "...")
      - Include the source platform (Reddit, Quora, etc.)
      - Focus on actionable insights that would help someone make this transition
      - Write in a natural narrative style without quotes or stars
      
      Format your response as JSON:
      {
        "keyObservations": [
          "One professional transitioning from ${currentRole} to ${targetRole} mentioned that... Source: [platform]"
        ],
        "commonChallenges": [
          "Many professionals found that... Source: [platform]"
        ]
      }
      
      Return ONLY valid JSON with no other text.
    `;

    const response = await callPerplexity(prompt, 1500);
    
    // Parse and validate the response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let insightsData;
      
      if (jsonMatch) {
        insightsData = JSON.parse(jsonMatch[0]);
      } else {
        insightsData = JSON.parse(response);
      }
      
      // Validate the structure
      return {
        keyObservations: Array.isArray(insightsData.keyObservations) 
          ? insightsData.keyObservations.map((item: any) => String(item)) 
          : [],
        commonChallenges: Array.isArray(insightsData.commonChallenges) 
          ? insightsData.commonChallenges.map((item: any) => String(item)) 
          : []
      };
    } catch (parseError) {
      console.error('Error parsing transition stories response:', parseError);
      throw new Error('Failed to parse transition stories analysis');
    }
  } catch (error: any) {
    console.error('Error analyzing transition stories with Perplexity:', error);
    throw new Error(`Failed to analyze transition stories: ${error.message}`);
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

/**
 * Find learning resources for a specific skill
 * 
 * @param skill The skill to find resources for
 * @param context Additional context about the skill
 * @returns Array of resource objects
 */
export async function findResources(
  skill: string,
  context: string
): Promise<Array<{ title: string; url: string; type: string; }>> {
  try {
    const prompt = `
      Find the best learning resources for "${skill}" in the context of "${context}".
      Search for high-quality YouTube tutorials, courses, books, and GitHub repositories.
      
      For each resource:
      1. Find the exact title
      2. Find the exact URL
      3. Categorize the type (Video, Course, Book, GitHub, etc.)
      
      Focus on resources with:
      - Clear learning paths
      - Good ratings/reviews
      - Up-to-date content
      - Practical coding exercises
      
      Return as a JSON array:
      [
        {
          "title": "Exact resource title",
          "url": "https://exact.url.com",
          "type": "Type of resource (Video, Course, etc.)"
        }
      ]
      
      Return ONLY the JSON array with no other text.
    `;

    const response = await callPerplexity(prompt, 1500);
    
    // Parse and validate the response
    try {
      const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      let resourcesData;
      
      if (jsonMatch) {
        resourcesData = JSON.parse(jsonMatch[0]);
      } else {
        resourcesData = JSON.parse(response);
      }
      
      // Validate resources
      const validatedResources = resourcesData.map((resource: any) => ({
        title: String(resource.title || ''),
        url: String(resource.url || ''),
        type: String(resource.type || 'Resource')
      }));
      
      return validatedResources;
    } catch (parseError) {
      console.error('Error parsing resources response:', parseError);
      throw new Error('Failed to parse resource search results');
    }
  } catch (error: any) {
    console.error('Error finding resources with Perplexity:', error);
    throw new Error(`Failed to find resources: ${error.message}`);
  }
}

/**
 * Calculate a personalized success rate for a career transition
 * Takes into account the user's skills, current role details, and target role requirements
 * 
 * @param currentRole Current role title
 * @param targetRole Target role title
 * @param userSkills Array of skills the user already has
 * @returns Object with success rate estimate and supporting data
 */
export async function calculatePersonalizedSuccessRate(
  currentRole: string, 
  targetRole: string, 
  userSkills: string[] = []
): Promise<{
  successRate: number;
  rationale: string;
  keyFactors: string[];
}> {
  try {
    const prompt = `
      You are a career transition analyst specializing in providing realistic success rate predictions.
      
      A professional is considering transitioning from ${currentRole} to ${targetRole}.
      Their existing skills include: ${userSkills.join(', ') || 'Unknown'}.
      
      Based on real career transition data (search the web for actual statistics):
      
      1. Calculate a realistic success rate (percentage from 0-100) for this specific career transition
      2. Provide a brief rationale for your percentage
      3. List 3-5 key factors that would increase their chance of success
      
      Your assessment should be data-driven and realistic, not optimistic.
      Search for real data about this specific career transition path.
      
      Format your response as JSON:
      {
        "successRate": number,
        "rationale": "brief explanation with sources",
        "keyFactors": ["factor 1", "factor 2", "factor 3"]
      }
      
      Return only the JSON object.
    `;
    
    const response = await callPerplexity(prompt, 1000);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let result;
      
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(response);
      }
      
      // Validate the result structure
      if (typeof result.successRate !== 'number') {
        throw new Error('Invalid success rate value');
      }
      
      return {
        successRate: Math.min(Math.max(result.successRate, 0), 100),
        rationale: result.rationale || "Based on analysis of similar career transitions",
        keyFactors: Array.isArray(result.keyFactors) ? result.keyFactors : []
      };
    } catch (parseError) {
      console.error('Error parsing personalized success rate:', parseError);
      throw new Error('Failed to calculate personalized success rate');
    }
  } catch (error) {
    console.error('Error calculating personalized success rate:', error);
    throw error;
  }
}

export async function generateTransitionOverview(
  currentRole: string,
  targetRole: string,
  scrapedContent: { source: string; content: string; url?: string; postDate?: string; date?: string }[]
): Promise<{
  successRate: number;
  avgTransitionTime: number;
  commonPaths: Array<{ path: string; count: number }>;
}> {
  try {
    // Combine content for analysis
    const combinedContent = scrapedContent.map(item => 
      `SOURCE: ${item.source}\nURL: ${item.url || 'Not available'}\nDATE: ${item.postDate || item.date || 'Not available'}\nCONTENT: ${item.content}\n---\n`
    ).join('\n');

    // Calculate a reasonable maximum number based on available data
    // We don't want to claim "X successful transitions" when we only found Y stories
    const totalStories = scrapedContent.length;
    // Use a reasonable cap on the count based on real data available
    // If we have no stories, max count is 3; if we have stories, use their count plus a reasonable sample size
    const maxPossibleCount = totalStories > 0 ? Math.min(totalStories + 5, 20) : 3;

    const prompt = `
      You are a career transition analyst.
      
      I have ${scrapedContent.length} real stories from people who transitioned from ${currentRole} to ${targetRole}.
      
      Here are the stories:
      
      ${combinedContent}
      
      Based ONLY on this real data (do not invent statistics), provide:
      1. Success Rate (percentage) - estimate how many transitions were successful
      2. Average Transition Time (in months) - time it took to complete the transition
      3. Common Paths - list the most common strategies people used to transition
      
      Search the web to find additional real transition stories to validate your estimates.
      Cite specific sources for your statistics.
      
      Format your response as JSON:
      {
        "successRate": number,
        "avgTransitionTime": number,
        "commonPaths": [
          { "path": "description with source citation", "count": number }
        ]
      }
      
      IMPORTANT: The "count" value for each path must be a logical number and cannot exceed ${maxPossibleCount}.
      Make sure the counts are accurate to the actual mentions in the data and additional research.
      
      Return only the JSON object with no other text.
    `;

    const response = await callPerplexity(prompt, 1500);
    
    // Parse and validate the response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let overviewData;
      
      if (jsonMatch) {
        overviewData = JSON.parse(jsonMatch[0]);
      } else {
        overviewData = JSON.parse(response);
      }
      
      // Validate and ensure the data structure is correct
      if (typeof overviewData.successRate !== 'number' || 
          typeof overviewData.avgTransitionTime !== 'number' ||
          !Array.isArray(overviewData.commonPaths)) {
        throw new Error("Incomplete data generated - missing required fields");
      }
      
      // Ensure path counts make logical sense
      const processedPaths = overviewData.commonPaths
        .filter((item: any) => item && item.path)
        .map((item: any) => {
          // Ensure count is between 1 and maxPossibleCount
          let count = typeof item.count === 'number' ? Math.max(item.count, 1) : 1;
          count = Math.min(count, maxPossibleCount);
          
          return {
            path: item.path,
            count: count
          };
        });
      
      return {
        successRate: Math.min(Math.max(overviewData.successRate, 0), 100),
        avgTransitionTime: Math.max(overviewData.avgTransitionTime, 1),
        commonPaths: processedPaths
      };
    } catch (parseError) {
      console.error('Error parsing overview response:', parseError);
      throw new Error('Failed to parse transition overview');
    }
  } catch (error: any) {
    console.error('Error generating transition overview with Perplexity:', error);
    throw new Error(`Failed to generate transition overview: ${error.message}`);
  }
}