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
  try {
    // First try direct parsing
    return JSON.parse(jsonString);
  } catch (initialError) {
    try {
      // If direct parsing fails, try sanitizing the JSON first
      const sanitized = sanitizeJsonString(jsonString);
      return JSON.parse(sanitized);
    } catch (error) {
      console.error(`Error parsing JSON${typeof defaultValue === 'string' ? ' for ' + defaultValue : ''}:`, error);
      // If defaultValue is a string identifier, return an empty object or array
      if (typeof defaultValue === 'string') {
        return [];
      }
      return defaultValue;
    }
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