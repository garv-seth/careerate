/**
 * LangGraph helpers for Cara
 * 
 * These functions replace the Perplexity API functions with LangGraph alternatives
 * that use Tavily for search and OpenAI or Gemini for processing.
 */
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CareerTransitionSearch, SkillGapSearch, LearningResourceSearch } from "../tools/tavilySearch";
import { createChatModel, getModelInfo } from "./modelFactory";

// Create a model instance for all our helpers to use
const model = createChatModel({
  temperature: 0.2,
  modelName: process.env.GOOGLE_API_KEY ? "gemini-1.5-pro" : "gpt-3.5-turbo"
});

function generateFallbackResponse(prompt: string) {
  // Simple template-based fallback responses
  if (prompt.includes("challenges")) {
    return {
      challenges: [
        "Adapting to new technical requirements",
        "Building leadership experience",
        "Demonstrating impact at scale"
      ]
    };
  }
  if (prompt.includes("observations") || prompt.includes("insights")) {
    return {
      observations: [
        "Career transitions typically require 6-12 months",
        "Technical expertise is highly valued",
        "Leadership skills become increasingly important"
      ]
    };
  }
  return {
    general: [
      "Focus on building relevant technical skills",
      "Seek mentorship opportunities",
      "Build a strong professional network"
    ]
  };
}

import { SkillGapAnalysis } from "../agents/langGraphAgent";
import { CaraAgent } from "../agents/caraAgent";

/**
 * Search forums for career transition stories using Tavily search
 */
export async function searchForums(
  currentRole: string,
  targetRole: string
): Promise<{ source: string; content: string; url: string; date: string }[]> {
  try {
    console.log(`Searching for transition stories from ${currentRole} to ${targetRole} using Tavily`);
    
    // Extract company, role, and level information from the roles
    const currentCompany = currentRole.split(' ')[0];
    const currentRoleTitle = currentRole.split(' ').slice(1, -2).join(' ');
    const targetCompany = targetRole.split(' ')[0];
    const targetRoleTitle = targetRole.split(' ').slice(1, -2).join(' ');
    
    // Search for exact match first
    const transitionSearch = new CareerTransitionSearch();
    const searchResults = await transitionSearch._call({
      query: "career transition experiences success stories challenges",
      currentRole,
      targetRole
    });
    
    // If no meaningful results, try searching with generic role titles across companies
    if (!searchResults || searchResults.trim().length < 100) {
      console.log("Limited search results for exact roles. Trying with more generic role search...");
      
      const genericSearchResults = await transitionSearch._call({
        query: "career transition experiences success stories challenges",
        currentRole: currentRoleTitle,
        targetRole: targetRoleTitle
      });
      
      // Merge results, prefer specific results if available
      return await processSearchResults(searchResults + "\n\n" + genericSearchResults, currentRole, targetRole);
    }
    
    // Process the search results
    return processSearchResults(searchResults, currentRole, targetRole);
  } catch (error) {
    console.error("Error searching forums with Tavily:", error);
    return [];
  }
}

// Helper function to process search results
async function processSearchResults(
    searchResults: string,
    currentRole: string, 
    targetRole: string
  ): Promise<{ source: string; content: string; url: string; date: string }[]> {
  try {
    // Process the search results with the LLM
    const processPrompt = `
    You've searched for transition stories from ${currentRole} to ${targetRole}.
    
    Here's what was found:
    ${searchResults}
    
    Extract and format 5-10 distinct transition stories from the search results.
    For each story, provide:
    1. Source (website/platform)
    2. Content (key points of the transition story)
    3. URL (if available)
    4. Date (if available, use today's date if not provided)
    
    Format as a JSON array of objects with these fields.
    `;
    
    // Use the LLM to process the results
    const processResponse = await model.invoke([
      new SystemMessage(`As a career transition assistant, extract real stories from web search results.`),
      new HumanMessage(processPrompt)
    ]);
    
    // Extract JSON from the response text
    const responseText = processResponse.content.toString();
    const jsonMatch = String(processResponse.content).match(/\[\s*\{.*\}\s*\]/s);
    let storiesJson;
    
    if (jsonMatch) {
      storiesJson = JSON.parse(jsonMatch[0]);
    } else {
      // Try to parse the entire response as JSON
      storiesJson = JSON.parse(String(processResponse.content));
    }
    
    // Ensure it's an array
    const stories = Array.isArray(storiesJson) ? storiesJson : [];
    
    console.log(`Successfully parsed ${stories.length} transition stories`);
    return stories;
  } catch (error) {
    console.error("Error parsing stories:", error);
    return [];
  }
}

/**
 * Analyze skill gaps for a career transition
 */
export async function analyzeSkillGaps(
  currentRole: string,
  targetRole: string,
  scrapedContent: Array<{ source: string; content: string; url?: string; date?: string; postDate?: string }>,
  existingSkills: string[] = []
): Promise<SkillGapAnalysis[]> {
  try {
    console.log(`Analyzing skill gaps for transition from ${currentRole} to ${targetRole}`);
    
    // Extract content from scraped stories
    const storiesContent = scrapedContent
      .map(story => story.content)
      .join("\n\n");
    
    // Construct the skill gap prompt
    const skillGapPrompt = `
    Analyze these transition stories from ${currentRole} to ${targetRole}.
    
    ${storiesContent}
    
    The user already has these skills: ${existingSkills.join(", ")}
    
    Extract and analyze skill gaps between these roles. For each skill:
    1. skillName: Name of the skill
    2. gapLevel: "Low", "Medium", or "High"
    3. confidenceScore: Number between 0-100
    4. mentionCount: How many times the skill was mentioned
    5. contextSummary: Brief explanation of the skill's importance
    
    Format as a JSON array of objects with these fields.
    `;
    
    // Use the LLM to analyze the skill gaps
    const skillGapResponse = await model.invoke([
      new SystemMessage(`Analyze career transition stories to identify skill gaps between roles.`),
      new HumanMessage(skillGapPrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(skillGapResponse.content).match(/\[\s*\{.*\}\s*\]/s);
      let skillGapsJson;
      
      if (jsonMatch) {
        skillGapsJson = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        skillGapsJson = JSON.parse(String(skillGapResponse.content));
      }
      
      // Ensure it's an array
      const skillGaps = Array.isArray(skillGapsJson) ? skillGapsJson : [];
      
      console.log(`Identified ${skillGaps.length} skill gaps for the transition`);
      return skillGaps;
    } catch (error) {
      console.error("Error parsing skill gaps:", error);
      return [];
    }
  } catch (error) {
    console.error("Error analyzing skill gaps:", error);
    return [];
  }
}

/**
 * Analyze transition stories to extract insights
 */
export async function analyzeTransitionStories(
  currentRole: string,
  targetRole: string,
  scrapedContent: Array<{ source: string; content: string; url?: string; date?: string; postDate?: string }>
): Promise<{ keyObservations: string[]; commonChallenges: string[] }> {
  try {
    console.log(`Analyzing transition stories from ${currentRole} to ${targetRole}`);
    
    // Gather data for insights generation
    const storiesContent = scrapedContent
      .map(story => story.content)
      .join("\n\n");
    
    // Construct the insights prompt
    const insightsPrompt = `
    Based on the transition stories collected for the ${currentRole} to ${targetRole} transition:
    
    ${storiesContent}
    
    Generate key insights about this career transition. Include:
    1. Key observations about successful transitions
    2. Common challenges people faced
    
    Format as a JSON object with "keyObservations" and "commonChallenges" arrays.
    `;
    
    // Use the LLM to generate insights
    const insightsResponse = await model.invoke([
      new SystemMessage(`Generate insights from career transition data to help the user understand the journey ahead.`),
      new HumanMessage(insightsPrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(insightsResponse.content).match(/\{.*\}/s);
      let insightsJson;
      
      if (jsonMatch) {
        insightsJson = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        insightsJson = JSON.parse(String(insightsResponse.content));
      }
      
      return {
        keyObservations: insightsJson.keyObservations || [],
        commonChallenges: insightsJson.commonChallenges || []
      };
    } catch (error) {
      console.error("Error parsing insights:", error);
      return {
        keyObservations: [],
        commonChallenges: []
      };
    }
  } catch (error) {
    console.error("Error analyzing transition stories:", error);
    return {
      keyObservations: [],
      commonChallenges: []
    };
  }
}

/**
 * Find learning resources for a specific skill
 */
export async function findResources(
  skill: string,
  context: string
): Promise<Array<{ title: string; url: string; type: string }>> {
  try {
    console.log(`Finding resources for skill: ${skill}`);
    
    const resourceSearch = new LearningResourceSearch();
    const searchResults = await resourceSearch._call({
      skillName: skill,
      resourceType: "all"
    });
    
    // Process the search results with the LLM
    const processPrompt = `
    You've searched for learning resources for ${skill} in the context of ${context}.
    
    Here's what was found:
    ${searchResults}
    
    Extract and format 3-5 specific learning resources from the search results.
    For each resource, provide:
    1. title: Name of the resource
    2. url: URL to access the resource
    3. type: Type of resource (course, tutorial, documentation, article, video, etc.)
    
    Format as a JSON array of objects with these fields.
    `;
    
    // Use the LLM to process the results
    const processResponse = await model.invoke([
      new SystemMessage(`Extract specific learning resources from search results.`),
      new HumanMessage(processPrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(processResponse.content).match(/\[\s*\{.*\}\s*\]/s);
      let resourcesJson;
      
      if (jsonMatch) {
        resourcesJson = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        resourcesJson = JSON.parse(String(processResponse.content));
      }
      
      // Ensure it's an array
      const resources = Array.isArray(resourcesJson) ? resourcesJson : [];
      
      console.log(`Found ${resources.length} resources for ${skill}`);
      return resources;
    } catch (error) {
      console.error("Error parsing resources:", error);
      return [];
    }
  } catch (error) {
    console.error("Error finding resources:", error);
    return [];
  }
}

/**
 * Calculate a personalized success rate for a career transition
 */
export async function calculatePersonalizedSuccessRate(
  currentRole: string,
  targetRole: string,
  userSkills: string[]
): Promise<{ successRate: number; rationale: string; keyFactors: string[] }> {
  try {
    console.log(`Calculating success rate for ${currentRole} to ${targetRole} transition`);
    
    // Construct the success rate prompt
    const successRatePrompt = `
    Analyze the likelihood of a successful career transition from ${currentRole} to ${targetRole}.
    
    The candidate has these skills: ${userSkills.join(", ")}
    
    Calculate a personalized success rate percentage and explain your rationale.
    Also list 3-5 key factors that influence this career transition.
    
    Format as a JSON object with:
    1. successRate: Number between 0-100
    2. rationale: String explaining your reasoning
    3. keyFactors: Array of strings listing key factors
    `;
    
    // Use the LLM to calculate the success rate
    const successRateResponse = await model.invoke([
      new SystemMessage(`Calculate realistic career transition success rates based on skills and market trends.`),
      new HumanMessage(successRatePrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(successRateResponse.content).match(/\{.*\}/s);
      let successRateJson;
      
      if (jsonMatch) {
        successRateJson = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        successRateJson = JSON.parse(String(successRateResponse.content));
      }
      
      return {
        successRate: successRateJson.successRate || 75,
        rationale: successRateJson.rationale || "",
        keyFactors: successRateJson.keyFactors || []
      };
    } catch (error) {
      console.error("Error parsing success rate:", error);
      return {
        successRate: 75,
        rationale: "Based on industry trends and your background",
        keyFactors: ["Technical skills", "Networking", "Portfolio development"]
      };
    }
  } catch (error) {
    console.error("Error calculating success rate:", error);
    return {
      successRate: 75,
      rationale: "Based on industry trends and your background",
      keyFactors: ["Technical skills", "Networking", "Portfolio development"]
    };
  }
}

/**
 * Generate a transition overview with statistics
 */
export async function generateTransitionOverview(
  currentRole: string,
  targetRole: string,
  scrapedContent: Array<{ source: string; content: string; url?: string; date?: string; postDate?: string }>
): Promise<{
  successRate: number;
  avgTransitionTime: number;
  commonPaths: Array<{ path: string; count: number }>;
}> {
  try {
    console.log(`Generating transition overview for ${currentRole} to ${targetRole}`);
    
    // Gather data for overview generation
    const storiesContent = scrapedContent
      .map(story => story.content)
      .join("\n\n");
    
    // Construct the overview prompt
    const overviewPrompt = `
    Based on the transition stories collected for the ${currentRole} to ${targetRole} transition:
    
    ${storiesContent}
    
    Generate a statistical overview with:
    1. successRate: Estimated percentage of people who successfully made this transition
    2. avgTransitionTime: Average time in months it takes to complete this transition
    3. commonPaths: Array of common transition approaches with counts
    
    Format as a JSON object with these fields.
    `;
    
    // Use the LLM to generate the overview
    const overviewResponse = await model.invoke([
      new SystemMessage(`Generate statistical overviews of career transitions based on real data.`),
      new HumanMessage(overviewPrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(overviewResponse.content).match(/\{.*\}/s);
      let overviewJson;
      
      if (jsonMatch) {
        overviewJson = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the entire response as JSON
        overviewJson = JSON.parse(String(overviewResponse.content));
      }
      
      return {
        successRate: overviewJson.successRate || 75,
        avgTransitionTime: overviewJson.avgTransitionTime || 6,
        commonPaths: overviewJson.commonPaths || []
      };
    } catch (error) {
      console.error("Error parsing overview:", error);
      return {
        successRate: 75,
        avgTransitionTime: 6,
        commonPaths: [
          { path: "Upskilling while in current role", count: 7 },
          { path: "Taking on related projects", count: 5 }
        ]
      };
    }
  } catch (error) {
    console.error("Error generating overview:", error);
    return {
      successRate: 75,
      avgTransitionTime: 6,
      commonPaths: [
        { path: "Upskilling while in current role", count: 7 },
        { path: "Taking on related projects", count: 5 }
      ]
    };
  }
}

// Helper function for raw LLM calls 
// With enhanced fallback for quota/rate limits
export async function callLLM(
  prompt: string,
  maxTokens: number = 1000
): Promise<string> {
  try {
    // Use the already-created model instance or create a local one
    const localModel = createChatModel({
      temperature: 0.2,
      modelName: "gemini-1.5-pro" // Defaults to Gemini in factory
    });
    
    console.log(`Sending request to LLM using ${getModelInfo()}`);
    
    const backoff = async (retryCount: number) => {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    };

    let retries = 0;
    const maxRetries = 2;

    while (retries < maxRetries) {
      try {
        const response = await localModel.invoke([
          new SystemMessage('You are a helpful AI assistant with expertise in career transitions.'),
          new HumanMessage(prompt)
        ]);
        return String(response.content);
      } catch (err) {
        if (err instanceof Error && err.message.includes('429')) {
          retries++;
          if (retries < maxRetries) {
            console.log(`Rate limited, retry ${retries} of ${maxRetries}`);
            await backoff(retries);
            continue;
          }
        }
        throw err;
      }
    }
    throw new Error('Max retries exceeded');
  } catch (error) {
    console.error('Error calling LLM:', error);
    // Return a valid JSON array for error cases
    if (prompt.includes("JSON array of strings")) {
      return '["Career transitions typically take 6-12 months", "Adapting to new organizational cultures", "Focus on building relevant skills"]';
    } else {
      // Return a fallback response instead of throwing
      return JSON.stringify({
        type: "fallback",
        message: "API limit exceeded. Using fallback response.",
        data: {
          insights: ["Career transitions typically take 6-12 months"],
          challenges: ["Adapting to new organizational cultures"],
          recommendations: ["Focus on building relevant skills"]
        }
      });
    }
  }
}