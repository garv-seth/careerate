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
  // Add more logging to trace JSON parsing issues
  console.log(`Parsing JSON with type: ${fallbackType || 'unknown'}`);
  
  if (!text || text.trim() === '') {
    console.log("Empty text received for JSON parsing");
    return fallbackType ? getFallbackObject(fallbackType) : {};
  }

  // Function to normalize field keys (convert snake_case to camelCase)
  const normalizeKeys = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(item => normalizeKeys(item));
    }
    
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    const normalized: any = {};
    
    for (const key in obj) {
      // Skip invalid keys
      if (typeof key !== 'string') continue;
        
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Handle special cases for our application's fields
      let finalKey = camelKey;
      
      // Skill gaps related mappings
      if (camelKey === 'skillName' || camelKey === 'skill' || camelKey === 'name') finalKey = 'skillName';
      else if (camelKey === 'numberOfMentions' || camelKey === 'mentions') finalKey = 'mentionCount';
      else if (camelKey === 'confidenceScore' || camelKey === 'confidence') finalKey = 'confidenceScore';
      else if (camelKey === 'gapLevel' || camelKey === 'level') finalKey = 'gapLevel';
      else if (camelKey === 'contextSummary' || camelKey === 'context' || camelKey === 'summary') finalKey = 'contextSummary';
      
      // Resource related mappings
      else if (camelKey === 'resourceType' || camelKey === 'type') finalKey = 'type';
      else if (camelKey === 'resourceUrl' || camelKey === 'url' || camelKey === 'link') finalKey = 'url';
      else if (camelKey === 'resourceTitle' || camelKey === 'title') finalKey = 'title';
      
      // Other common mappings
      else if (camelKey === 'timeframe' || camelKey === 'avgTransitionTime') finalKey = 'timeframe';
      
      normalized[finalKey] = normalizeKeys(obj[key]);
    }
    
    return normalized;
  };

  // First try: standard JSON.parse on the entire string
  try {
    // Try to parse JSON and normalize keys
    const parsed = JSON.parse(text);
    console.log("Successfully parsed JSON directly");
    return normalizeKeys(parsed);
  } catch (e) {
    console.log("First JSON parse attempt failed, trying with sanitization");
  }

  // Second try: Clean up the text and try JSON.parse again
  try {
    const cleaned = prepareJsonText(text);
    console.log("Sanitized JSON:", cleaned.substring(0, 200) + (cleaned.length > 200 ? "..." : ""));
    // Try to parse JSON and normalize keys
    const parsed = JSON.parse(cleaned);
    console.log("Successfully parsed JSON after cleaning");
    return normalizeKeys(parsed);
  } catch (e: any) {
    console.log("JSON sanitization failed:", e.message);
  }

  // Third try: Attempt to repair and extract JSON
  try {
    console.log("Attempting to repair JSON with advanced methods");
    const repaired = repairJson(text, fallbackType);
    return normalizeKeys(repaired);
  } catch (e) {
    console.error("All JSON parse attempts failed:", e);
    
    // Last resort: return type-appropriate fallback
    if (fallbackType) {
      console.log(`Using fallback data for ${fallbackType}`);
    }
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
  
  // Remove any explanation or AI text above or below the JSON
  text = text.replace(/^[\s\S]*?(\{[\s\S]*\}|\[[\s\S]*\])[\s\S]*$/, "$1");
  
  // Handle cases where there are nested JSON structures and we want the outermost one
  const jsonObjectMatch = text.match(/(\{[\s\S]*\})/);
  const jsonArrayMatch = text.match(/(\[[\s\S]*\])/);

  // Find the most complete JSON structure
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
  
  // Fix incomplete arrays - add missing brackets
  if (text.includes('"path":') && !text.trim().startsWith('[') && !text.trim().startsWith('{')) {
    text = `[${text}]`;
  }
  
  // Fix trailing commas and missing commas
  text = text
    // Replace trailing commas in arrays and objects with proper syntax
    .replace(/,(\s*[}\]])/g, '$1')
    // Add missing commas between array elements
    .replace(/}(\s*){/g, '},$1{')
    // Add missing commas between array items
    .replace(/](\s*)\[/g, '],$1[');
  
  // Common errors to fix
  const fixedText = text
    // Fix missing quotes around property names
    .replace(/(\w+)(?=\s*:)/g, '"$1"')
    // Fix single quotes used instead of double quotes (but not inside content)
    .replace(/'([^']*)'(?=\s*:)/g, '"$1"')
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    // Fix malformed arrays with missing brackets
    .replace(/commonPaths"?\s*:\s*\{/g, 'commonPaths": [{')
    .replace(/}\s*(?=,\s*"(successRate|avgTransitionTime))/g, '}]')
    // Fix missing closing brackets based on context
    .replace(/("path"\s*:\s*"[^"]+")\s*$/g, '$1}]');
  
  try {
    return JSON.parse(fixedText);
  } catch (e: any) {
    console.log(`Repair attempt failed: ${e.message}`);
    
    // Try to extract valid JSON substructures
    if (fallbackType === "insights") {
      try {
        // Build a valid structure from fragments if possible
        const successRateMatch = text.match(/"successRate"\s*:\s*(\d+)/);
        const avgTimeMatch = text.match(/"avgTransitionTime"\s*:\s*(\d+)/);
        
        const reconstructed: {
          successRate: number | null;
          avgTransitionTime: number | null;
          commonPaths: Array<{path: string}>;
          keyObservations: string[];
          commonChallenges: string[];
        } = {
          successRate: successRateMatch ? parseInt(successRateMatch[1]) : null,
          avgTransitionTime: avgTimeMatch ? parseInt(avgTimeMatch[1]) : null,
          commonPaths: [],
          keyObservations: [],
          commonChallenges: []
        };
        
        // Extract path information if available
        const pathMatches = text.match(/"path"\s*:\s*"([^"]+)"/g);
        if (pathMatches && pathMatches.length > 0) {
          for (const match of pathMatches) {
            const pathMatch = match.match(/"path"\s*:\s*"([^"]+)"/);
            if (pathMatch && pathMatch[1]) {
              reconstructed.commonPaths.push({ path: pathMatch[1] });
            }
          }
        }
        
        return reconstructed;
      } catch (innerError) {
        console.log("Reconstruction attempt failed");
      }
    }
    
    // Try to extract individual objects for array types
    if (fallbackType === "skillGaps" || fallbackType === "stories") {
      const objectMatches = text.match(/\{[^{}]*\}/g);
      if (objectMatches && objectMatches.length > 0) {
        const validObjects = [];
        for (const objText of objectMatches) {
          try {
            validObjects.push(JSON.parse(objText));
          } catch (parseError) {
            // Skip invalid objects
          }
        }
        if (validObjects.length > 0) {
          return validObjects;
        }
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