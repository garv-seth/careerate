/**
 * JSON Parser Helper
 * 
 * Safe utilities for parsing JSON strings, with fallbacks and error handling.
 */

/**
 * Sanitize a JSON string to fix common formatting issues
 * @param jsonString The JSON string to sanitize
 * @returns The sanitized JSON string
 */
export function sanitizeJsonString(jsonString: string): string {
  if (!jsonString || typeof jsonString !== 'string') {
    return '{}';
  }
  
  let sanitized = jsonString;
  
  try {
    // 0. Extract JSON from markdown code blocks (LangGraph and AI models often return JSON in ```json blocks)
    const markdownJsonRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
    const markdownMatch = sanitized.match(markdownJsonRegex);
    if (markdownMatch && markdownMatch[1]) {
      console.log("Successfully extracted JSON from markdown code block");
      sanitized = markdownMatch[1].trim();
    }

    // 1. Remove any BOM or control characters
    sanitized = sanitized.replace(/^\uFEFF/, '');
    
    // 2. Replace JavaScript-style single quotes with JSON-compatible double quotes around keys
    sanitized = sanitized.replace(/'([^']+)'(\s*:)/g, '"$1"$2');
    
    // 3. Replace single quotes around values with double quotes
    sanitized = sanitized.replace(/:(\s*)'([^']*)'/g, ':$1"$2"');
    
    // 4. Fix trailing commas in arrays and objects
    sanitized = sanitized.replace(/,(\s*[\]}])/g, '$1');
    
    // 5. Handle incomplete arrays or objects (truncated output)
    if (sanitized.includes('...')) {
      // Replace truncated parts with valid JSON closure
      sanitized = sanitized.replace(/\.\.\./g, '');
      
      // Count opening and closing braces to ensure balance
      const openCurly = (sanitized.match(/{/g) || []).length;
      const closeCurly = (sanitized.match(/}/g) || []).length;
      const openSquare = (sanitized.match(/\[/g) || []).length;
      const closeSquare = (sanitized.match(/\]/g) || []).length;
      
      // Add missing closing braces and brackets
      for (let i = 0; i < openCurly - closeCurly; i++) {
        sanitized += '}';
      }
      
      for (let i = 0; i < openSquare - closeSquare; i++) {
        sanitized += ']';
      }
    }
    
    // 6. Fix unquoted property names (common in JavaScript but invalid in JSON)
    sanitized = sanitized.replace(/([{,]\s*)([a-zA-Z0-9_$]+)(\s*:)/g, '$1"$2"$3');
    
    // 7. Remove trailing commas from arrays
    sanitized = sanitized.replace(/,\s*]/g, ']');
    
    // 8. Remove trailing commas from objects
    sanitized = sanitized.replace(/,\s*}/g, '}');
    
    // 9. Balance out remaining braces to ensure valid JSON
    const finalOpenCurly = (sanitized.match(/{/g) || []).length;
    const finalCloseCurly = (sanitized.match(/}/g) || []).length;
    const finalOpenSquare = (sanitized.match(/\[/g) || []).length;
    const finalCloseSquare = (sanitized.match(/\]/g) || []).length;
    
    // Add missing closing braces and brackets
    for (let i = 0; i < finalOpenCurly - finalCloseCurly; i++) {
      sanitized += '}';
    }
    
    for (let i = 0; i < finalOpenSquare - finalCloseSquare; i++) {
      sanitized += ']';
    }
    
    return sanitized;
  } catch (error) {
    console.error("Error during JSON sanitization:", error);
    return jsonString; // Return original if sanitization fails
  }
}

/**
 * Safely parse a JSON string, returning a default value if parsing fails
 * @param jsonString The JSON string to parse
 * @param defaultValue The default value to return if parsing fails, or a string identifier for the data
 * @returns The parsed JSON object, or the default value if parsing fails
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T | string): any {
  if (!jsonString || typeof jsonString !== 'string') {
    console.warn("Invalid input to safeJsonParse, returning default value");
    return typeof defaultValue === 'string' ? getDefaultValueForType(defaultValue, jsonString) : defaultValue;
  }

  try {
    // First try direct parsing
    return JSON.parse(jsonString);
  } catch (initialError) {
    try {
      // If direct parsing fails, try sanitizing the JSON first
      const sanitized = sanitizeJsonString(jsonString);
      console.log("Successfully parsed JSON using enhanced parser");
      return JSON.parse(sanitized);
    } catch (error) {
      console.error(`Error parsing JSON${typeof defaultValue === 'string' ? ' for ' + defaultValue : ''}:`, error);
      
      // If we received a string identifier, get an appropriate default value
      if (typeof defaultValue === 'string') {
        return getDefaultValueForType(defaultValue, jsonString);
      }
      
      return defaultValue;
    }
  }
}

/**
 * Generate an appropriate default value based on the type identifier and content
 * @param typeIdentifier String describing the expected data type
 * @param content The original content that failed to parse
 * @returns An appropriate default value
 */
function getDefaultValueForType(typeIdentifier: string, content: string): any {
  // For plan data
  if (typeIdentifier.includes('plan')) {
    return { 
      overview: "Your development plan",
      milestones: []
    };
  } 
  // For skill gap data
  else if (typeIdentifier.includes('skill')) {
    return [];
  } 
  // For insights and observations data
  else if (typeIdentifier.includes('insight') || typeIdentifier.includes('observation')) {
    return {
      observations: [],
      challenges: [],
      stories: []
    };
  }
  // For story analysis data
  else if (typeIdentifier.includes('story') || typeIdentifier.includes('transition story')) {
    return {
      keyObservations: [],
      challengesFaced: [],
      stories: []
    };
  } 
  // For any other data, make an intelligent guess based on content
  else {
    // If content starts with [ probably an array was expected
    const contentStart = content?.trim().charAt(0);
    if (contentStart === '[') {
      return [];
    }
    // If content includes "observations", "challenges", or similar keys, it's likely an insights object
    else if (content && (
      content.includes('"observations"') || 
      content.includes('"challenges"') || 
      content.includes('"stories"')
    )) {
      return {
        observations: [],
        challenges: [],
        stories: []
      };
    }
    // Default to empty object
    return {};
  }
}

/**
 * Safely stringify a JSON object, returning a default string if stringification fails
 * @param value The value to stringify
 * @param defaultValue The default string to return if stringification fails
 * @returns The stringified JSON, or the default value if stringification fails
 */
export function safeJsonStringify(value: any, defaultValue = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Error stringifying object:', error);
    return defaultValue;
  }
}

/**
 * Check if a string is valid JSON
 * @param jsonString The string to check
 * @returns Whether the string is valid JSON
 */
export function isValidJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    try {
      // Try with sanitization as a second attempt
      const sanitized = sanitizeJsonString(jsonString);
      JSON.parse(sanitized);
      return true;
    } catch (sanitizedError) {
      return false;
    }
  }
}