/**
 * JSON Parser utility for safely parsing potentially malformed JSON.
 * Provides robust parsing with multiple fallback strategies and type-specific fallbacks.
 */

/**
 * Safely parse JSON with fallback strategies
 * @param text The text to parse as JSON
 * @param fallbackType Optional type hint for specialized fallback data
 * @returns Parsed JSON object or array, or a fallback object if parsing fails
 */
export function safeParseJSON(
  text: string,
  fallbackType?: "skillGaps" | "insights" | "plan" | "stories"
): any {
  if (!text) {
    return fallbackType ? getFallbackObject(fallbackType) : {};
  }

  // First try: standard JSON.parse on the entire string
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log("Initial JSON parse failed, trying fixes...");
  }

  // Second try: Clean up the text and try JSON.parse again
  try {
    const cleaned = prepareJsonText(text);
    return JSON.parse(cleaned);
  } catch (e) {
    console.log("JSON parse failed after cleaning, trying repairs...");
  }

  // Third try: Attempt to repair and extract JSON
  try {
    return repairJson(text, fallbackType);
  } catch (e) {
    console.error("All JSON parse attempts failed:", e);
    
    // Last resort: return type-appropriate fallback
    return fallbackType ? getFallbackObject(fallbackType) : {};
  }
}

/**
 * Prepare JSON text by removing potential markdown formatting and extra characters
 */
function prepareJsonText(text: string): string {
  // Remove markdown code blocks
  text = text.replace(/```json\s+/g, "").replace(/```\s*$/g, "");
  text = text.replace(/```javascript\s+/g, "").replace(/```\s*$/g, "");
  text = text.replace(/```\s+/g, "").replace(/```\s*$/g, "");

  // Normalize line breaks
  text = text.replace(/\r\n/g, "\n");

  // Try to find the actual JSON content within the text
  const jsonObjectMatch = text.match(/(\{[\s\S]*\})/);
  const jsonArrayMatch = text.match(/(\[[\s\S]*\])/);

  if (jsonObjectMatch && jsonObjectMatch[1]) {
    return jsonObjectMatch[1];
  } else if (jsonArrayMatch && jsonArrayMatch[1]) {
    return jsonArrayMatch[1];
  }

  // Remove any text before the first { or [ and after the last } or ]
  let startChar = text.indexOf("{");
  if (startChar === -1) startChar = text.indexOf("[");
  let endChar = text.lastIndexOf("}");
  if (endChar === -1 || (text.lastIndexOf("]") > endChar)) endChar = text.lastIndexOf("]");

  if (startChar !== -1 && endChar !== -1 && endChar > startChar) {
    return text.substring(startChar, endChar + 1);
  }

  return text;
}

/**
 * Attempt to repair malformed JSON with common fixes
 */
function repairJson(text: string, fallbackType?: "skillGaps" | "insights" | "plan" | "stories"): any {
  // Prepare the text first
  text = prepareJsonText(text);
  
  // Common errors to fix
  const fixedText = text
    // Fix missing quotes around property names
    .replace(/(\w+)(?=\s*:)/g, '"$1"')
    // Fix single quotes used instead of double quotes
    .replace(/'/g, '"')
    // Fix trailing commas in arrays and objects
    .replace(/,\s*([}\]])/g, '$1')
    // Fix missing commas between elements
    .replace(/}(\s*){/g, '},$1{')
    .replace(/](\s*)\[/g, '],$1[')
    // Fix extra/missing brackets
    .replace(/}\s*"/, '},\n"')
    .replace(/"\s*{/, '",\n{');
  
  try {
    return JSON.parse(fixedText);
  } catch (e) {
    console.error("Repair attempt failed:", e);
    
    // If we're looking for an array of objects (skill gaps or stories)
    if (fallbackType === "skillGaps" || fallbackType === "stories") {
      // Try to extract individual objects from the text
      const objectMatches = text.match(/\{[^{}]*\}/g);
      if (objectMatches && objectMatches.length > 0) {
        return objectMatches.map(objText => {
          try {
            return JSON.parse(objText);
          } catch {
            return {};
          }
        });
      }
    }
    
    // Return fallback as a last resort
    return getFallbackObject(fallbackType);
  }
}

/**
 * Get appropriate fallback data based on the expected data type
 */
function getFallbackObject(
  fallbackType?: "skillGaps" | "insights" | "plan" | "stories"
): any {
  switch (fallbackType) {
    case "skillGaps":
      return [
        {
          skillName: "Technical Skills", 
          gapLevel: "Medium",
          confidenceScore: 70,
          mentionCount: 1,
          contextSummary: "Core technical skills for the role"
        },
        {
          skillName: "Domain Knowledge",
          gapLevel: "High",
          confidenceScore: 80,
          mentionCount: 1,
          contextSummary: "Specific knowledge required for the industry"
        }
      ];
      
    case "insights":
      return {
        keyObservations: [
          "Building a portfolio of relevant projects is critical",
          "Networking with professionals already in the target role increases success rate"
        ],
        commonChallenges: [
          "Adapting to new technical requirements",
          "Building required domain knowledge"
        ],
        successRate: 65,
        timeframe: "6-12 months",
        successFactors: [
          "Continuously expanding technical skills",
          "Building a professional network"
        ]
      };
      
    case "plan":
      return {
        milestones: [
          {
            title: "Technical Skill Development",
            description: "Learn key technical skills for your target role",
            priority: "High",
            durationWeeks: 6,
            order: 1,
            resources: [
              { 
                title: "Online Course",
                url: "https://www.coursera.org/",
                type: "course"
              }
            ]
          },
          {
            title: "Build Portfolio Projects",
            description: "Create projects demonstrating your new skills",
            priority: "Medium",
            durationWeeks: 8,
            order: 2,
            resources: [
              {
                title: "GitHub Project Ideas",
                url: "https://github.com/topics/portfolio-project",
                type: "website"
              }
            ]
          }
        ]
      };
      
    case "stories":
      return [
        {
          source: "Research",
          content: "This transition typically takes 6-12 months of dedicated effort.",
          url: null
        }
      ];
      
    default:
      return {};
  }
}
import { z } from "zod";

export function safeParseJSON(text: string, fallbackType?: "skillGaps" | "insights" | "plan" | "stories"): any {
  // Remove any markdown code block syntax
  let cleaned = text.replace(/```json\n|\n```|```/g, '');
  
  // Try to extract JSON content if embedded in text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  const normalizeKeys = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(item => normalizeKeys(item));
    }
    
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    const normalized: any = {};
    
    for (const key in obj) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Handle special cases
      const finalKey = camelKey === 'skillName' ? camelKey : 
                      camelKey === 'numberOfMentions' ? 'mentionCount' : 
                      camelKey === 'skillName' ? 'skillName' :
                      camelKey === 'gapLevel' ? 'gapLevel' :
                      camelKey;
      
      normalized[finalKey] = normalizeKeys(obj[key]);
    }
    
    return normalized;
  };

  try {
    const parsed = JSON.parse(cleaned);
    return normalizeKeys(parsed);
  } catch (error) {
    if (fallbackType === "skillGaps") {
      return [];
    } else if (fallbackType === "insights") {
      return {
        successRate: 70,
        avgTransitionTime: 6,
        commonPaths: []
      };
    }
    throw error;
  }
}
