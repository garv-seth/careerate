/**
 * LangGraph helpers for Cara
 * 
 * These functions replace the Perplexity API functions with LangGraph alternatives
 * that use Tavily for search and Gemini for processing.
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CareerTransitionSearch, SkillGapSearch, LearningResourceSearch } from "../tools/tavilySearch";
import { createChatModel, getModelInfo } from "./modelFactory";

// Create a model instance for all our helpers to use
const model = createChatModel({
  temperature: 0.2,
  modelName: "gemini-2.0-flash-lite"
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
    
    // Parse the response with enhanced error handling
    try {
      const responseText = String(skillGapResponse.content);
      let skillGapsJson;

      // First try: extract JSON array from the response
      const arrayMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/s);
      if (arrayMatch) {
        try {
          skillGapsJson = JSON.parse(arrayMatch[0]);
          console.log("Successfully extracted JSON array from response");
        } catch (arrayParseError) {
          console.error("Found JSON array pattern but failed to parse:", arrayParseError);
          
          // Try to sanitize the JSON before parsing
          let sanitized = arrayMatch[0];
          // Step 1: Normalize property names to have double quotes
          sanitized = sanitized.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
          // Step 2: Replace single quotes around values with double quotes
          sanitized = sanitized.replace(/:(\s*)'([^']*)'/g, ':$1"$2"');
          // Step 3: Fix trailing commas in arrays/objects
          sanitized = sanitized.replace(/,(\s*[\]}])/g, '$1');

          try {
            skillGapsJson = JSON.parse(sanitized);
            console.log("Successfully parsed sanitized JSON array");
          } catch (sanitizeError) {
            console.error("Failed to parse sanitized JSON array:", sanitizeError);
          }
        }
      }
      
      // Second try: if the first try failed, try to parse the entire response
      if (!skillGapsJson) {
        try {
          // Try to parse the entire response as JSON
          skillGapsJson = JSON.parse(responseText);
          console.log("Successfully parsed entire response as JSON");
        } catch (fullParseError) {
          console.error("Failed to parse entire response as JSON:", fullParseError);
        }
      }
      
      // Third try: Search for individual skill objects in case array parsing failed
      if (!skillGapsJson) {
        // Extract individual JSON objects
        const objects = [];
        const objectPattern = /\{[^{}]*"skillName"[^{}]*\}/g;
        let match;
        
        while ((match = objectPattern.exec(responseText)) !== null) {
          try {
            const sanitized = match[0]
              .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3')
              .replace(/:(\s*)'([^']*)'/g, ':$1"$2"')
              .replace(/,(\s*[\]}])/g, '$1');
            
            const obj = JSON.parse(sanitized);
            if (obj.skillName) {
              objects.push(obj);
            }
          } catch (objParseError) {
            // Skip this object if parsing fails
          }
        }
        
        if (objects.length > 0) {
          skillGapsJson = objects;
          console.log(`Extracted ${objects.length} individual skill objects`);
        }
      }
      
      // Ensure result is an array
      const skillGaps = Array.isArray(skillGapsJson) ? skillGapsJson : 
                         (skillGapsJson ? [skillGapsJson] : []);
      
      // Validate entries to ensure they have required fields
      const validSkillGaps = skillGaps.filter(gap => 
        typeof gap === 'object' && 
        gap !== null && 
        gap.skillName && 
        typeof gap.skillName === 'string'
      );
      
      console.log(`Identified ${validSkillGaps.length} valid skill gaps for the transition`);
      return validSkillGaps;
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
): Promise<{ keyObservations: string[]; commonChallenges: string[]; sources: {[key: string]: string} }> {
  try {
    console.log(`Analyzing transition stories from ${currentRole} to ${targetRole}`);
    
    // Verify we have actual content to analyze
    if (!scrapedContent || scrapedContent.length === 0) {
      console.log("No scraped content to analyze, using similar roles as fallback");
      
      // Extract the role part without company and level for more generic search
      const currentRoleParts = currentRole.split(' ');
      const currentRoleTitle = currentRoleParts.length > 2 ? currentRoleParts.slice(1, -1).join(' ') : currentRole;
      
      const targetRoleParts = targetRole.split(' ');
      const targetRoleTitle = targetRoleParts.length > 2 ? targetRoleParts.slice(1, -1).join(' ') : targetRole;
      
      return {
        keyObservations: [
          `Professionals transitioning from ${currentRoleTitle} to ${targetRoleTitle} roles typically focus on developing cross-functional communication skills and strategic thinking.`,
          `Successful transitions often involve building a portfolio of relevant projects that demonstrate capabilities in the target role.`,
          `Networking with professionals in the target role can provide valuable insights and potential opportunities.`
        ],
        commonChallenges: [
          `Adapting to different expectations and metrics in the new role can be challenging initially.`,
          `Developing specific technical skills required in the target role may require dedicated learning time.`,
          `Convincing hiring managers of transferable skills when making a significant role change.`
        ],
        sources: {
          "Analysis": "Based on similar career transitions research"
        }
      };
    }
    
    // Gather data for insights generation with source tracking
    const sourcedContent = scrapedContent.map(story => ({
      source: story.source || (story.url ? new URL(story.url).hostname : "Search Result"),
      content: story.content,
      url: story.url
    }));
    
    // Format content for the LLM
    const storiesFormatted = sourcedContent.map((story, index) => 
      `STORY ${index + 1} (Source: ${story.source}${story.url ? `, URL: ${story.url}` : ''})\n${story.content}`
    ).join("\n\n");
    
    // Construct the insights prompt
    const insightsPrompt = `
    Analyze the following real stories about career transitions from ${currentRole} to ${targetRole}:
    
    ${storiesFormatted}
    
    Extract key insights about this specific career transition. Include:
    1. 3-5 key observations about successful transitions (concrete patterns, not generic advice)
    2. 3-5 common challenges people face during this transition
    3. Sources for each insight (reference the story number)
    
    Format your response as a JSON object with these keys:
    "keyObservations": array of strings without asterisks or bullet points
    "commonChallenges": array of strings without asterisks or bullet points
    "sources": object mapping each observation/challenge to its source story number and URL
    
    Use only information directly found in the transition stories. If there's not enough data, focus on the most reliable insights.
    `;
    
    // Use the LLM to generate insights
    const insightsResponse = await model.invoke([
      new SystemMessage(`Generate factual insights based only on the provided career transition stories. Do not add asterisks or bullet points to the text.`),
      new HumanMessage(insightsPrompt)
    ]);
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = String(insightsResponse.content).match(/\{.*\}/s);
      let insightsJson;
      
      if (jsonMatch) {
        // Try to parse the JSON portion
        insightsJson = JSON.parse(jsonMatch[0]);
      } else {
        // As a fallback, try to parse the entire response
        insightsJson = JSON.parse(String(insightsResponse.content));
      }
      
      // Clean any remaining asterisks or bullets from the text
      const cleanText = (text: string) => text.replace(/^\*+\s*|\•\s*|-\s*/g, '').trim();
      
      // Process and return the insights
      return {
        keyObservations: (insightsJson.keyObservations || []).map(cleanText),
        commonChallenges: (insightsJson.commonChallenges || []).map(cleanText),
        sources: insightsJson.sources || {}
      };
    } catch (error) {
      console.error("Error parsing insights:", error);
      
      // Create a simplified response based on what we can extract
      return {
        keyObservations: [
          `Professionals making this transition need to emphasize relevant transferable skills and experience.`,
          `Building a network in the target role field can significantly improve transition success.`
        ],
        commonChallenges: [
          `Adapting to different expectations and metrics in the new role.`,
          `Developing specific technical skills required for the target position.`
        ],
        sources: {
          "Note": "Based on general transition patterns"
        }
      };
    }
  } catch (error) {
    console.error("Error analyzing transition stories:", error);
    return {
      keyObservations: [],
      commonChallenges: [],
      sources: {}
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
    
    Important: Do not use asterisks (*) or any markdown formatting in your response. Use plain text only.
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