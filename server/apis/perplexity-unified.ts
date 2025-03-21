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
 * Generic function to make calls to Perplexity API with the Sonar model
 * 
 * @param prompt The prompt to send to Perplexity
 * @param maxTokens Maximum tokens for the response
 * @returns The API response text
 */
async function callPerplexity(
  prompt: string, 
  maxTokens: number = 1000
): Promise<string> {
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY environment variable is not set');
    }

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

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Unexpected response structure from Perplexity API');
    }
  } catch (error: any) {
    console.error('Error calling Perplexity API:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
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
      I need detailed stories from people who have transitioned from ${currentRole} to ${targetRole} careers.
      Search across Reddit, Quora, Blind, and any relevant forums.
      
      For each story you find:
      1. Include the EXACT full text of the person's story
      2. Provide the exact source (Reddit, Quora, etc.) and complete URL
      3. Include the publication date of the post
      4. Make sure the story is from someone who has ACTUALLY made this career transition
      
      Format each result as:
      - Source: [platform name]
      - URL: [complete URL]
      - Date: [publication date]
      - Content: [full text of the transition story]
      
      Return at least 3-5 real examples with full citations. 
      Format your response so I can easily parse each story with its metadata.
    `;

    const response = await callPerplexity(searchQuery);
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
    const results: { source: string; content: string; url: string; date: string }[] = [];
    
    // Split the text by story entries (looking for "Source:" as the delimiter)
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
      if (source && content) {
        results.push({
          source,
          content,
          url: url || 'Not provided',
          date: date || 'Not provided'
        });
      }
    }

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

      ${text.substring(0, 10000)} // Limiting text length to avoid token limits

      Return ONLY a JSON array of skill names, nothing else. 
      Example response format: ["Python", "System Design", "Leadership", "Distributed Systems"]
    `;

    const response = await callPerplexity(prompt);
    
    try {
      // Attempt to parse the response as JSON directly
      return JSON.parse(response);
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON array from text
      const match = response.match(/\[(.*)\]/s);
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
interface SkillGapAnalysis {
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
  scrapedContent: { source: string; content: string }[],
  existingSkills: string[] = []
): Promise<SkillGapAnalysis[]> {
  try {
    // Generate a mock resume for a Microsoft Level 63 employee (as requested)
    const mockResume = `
      RESUME - Microsoft Level 63 Software Engineer
      
      EXPERIENCE:
      Microsoft Corporation
      Principal Software Engineer (Level 63) | 2018 - Present
      - Lead architecture for high-scale distributed systems handling millions of transactions
      - Designed and implemented microservices architecture for critical payment systems
      - Mentored junior engineers and led technical design reviews
      - Technologies: C#, .NET Core, Azure, SQL Server, Redis, Kubernetes
      
      Senior Software Engineer (Level 62) | 2015 - 2018
      - Developed scalable backend services for Microsoft Office products
      - Implemented performance optimizations improving response time by 40%
      - Technologies: C#, ASP.NET, SQL Server, RabbitMQ
      
      PREVIOUS EXPERIENCE:
      Amazon Web Services
      Software Development Engineer II | 2012 - 2015
      - Built cloud infrastructure services for AWS customers
      - Technologies: Java, Spring, AWS Services, DynamoDB
      
      EDUCATION:
      Master of Science, Computer Science
      Stanford University | 2012
      
      Bachelor of Science, Computer Engineering
      University of Washington | 2010
      
      SKILLS:
      ${existingSkills.join(', ')}
    `;

    // Combine scraped content
    const combinedContent = scrapedContent
      .map(item => `Source: ${item.source}\n${item.content}`)
      .join('\n\n---\n\n');

    const prompt = `
      You are a career transition analyst specializing in identifying skill gaps.
      
      CURRENT ROLE: ${currentRole}
      TARGET ROLE: ${targetRole}
      
      Here is the resume of someone in the current role:
      ${mockResume}
      
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
        skillGapsData = JSON.parse(response);
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
  scrapedContent: any[]
): Promise<{
  keyObservations: string[];
  commonChallenges: string[];
}> {
  try {
    // Combine content for analysis
    const combinedContent = scrapedContent.map(item => 
      `SOURCE: ${item.source}\nURL: ${item.url || 'Not available'}\nCONTENT: ${item.content}\n---\n`
    ).join('\n');

    const prompt = `
      Analyze these real career transition stories from ${currentRole} to ${targetRole}:
      
      ${combinedContent}
      
      Extract:
      1. Key observations - important insights from people who made this transition
      2. Common challenges - difficulties most people faced during the transition
      
      For each point:
      - Include a direct quote or reference from the stories when possible
      - Include the source platform (Reddit, Quora, etc.)
      - Focus on actionable insights that would help someone make this transition
      
      Format your response as JSON:
      {
        "keyObservations": [
          "Key insight: [observation text with quote] Source: [platform]"
        ],
        "commonChallenges": [
          "Challenge: [challenge text with quote] Source: [platform]"
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
    // Combine content for analysis
    const combinedContent = scrapedContent.map(item => 
      `SOURCE: ${item.source}\nURL: ${item.url || 'Not available'}\nCONTENT: ${item.content}\nDATE: ${item.date || 'Not available'}\n---\n`
    ).join('\n');

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
      
      The counts should reflect the actual number of times a path was mentioned.
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
      
      return {
        successRate: Math.min(Math.max(overviewData.successRate, 0), 100),
        avgTransitionTime: Math.max(overviewData.avgTransitionTime, 1),
        commonPaths: overviewData.commonPaths
          .filter((item: any) => item && item.path)
          .map((item: any) => ({
            path: item.path,
            count: typeof item.count === 'number' ? Math.max(item.count, 1) : 1
          }))
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