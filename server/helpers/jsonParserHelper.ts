/**
 * JSON Parser Helper
 * 
 * Safe utilities for parsing JSON strings, with fallbacks and error handling.
 */

/**
 * Safely parse a JSON string, returning a default value if parsing fails
 * @param jsonString The JSON string to parse
 * @param defaultValue The default value to return if parsing fails
 * @returns The parsed JSON object, or the default value if parsing fails
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}

/**
 * Safely stringify a JSON object, returning a default string if stringification fails
 * @param value The value to stringify
 * @param defaultValue The default string to return if stringification fails
 * @returns The stringified JSON, or the default value if stringification fails
 */
export function safeJsonStringify(value: any, defaultValue: string = '{}'): string {
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
    return false;
  }
}