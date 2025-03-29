/**
 * API Key Validation Utilities
 * 
 * Functions to validate various API keys required for tools and services.
 * Helps ensure we have valid credentials before making external API calls.
 */

/**
 * Validate a Tavily API key format
 * @param apiKey The Tavily API key to validate
 * @returns Whether the key appears to be valid
 */
export function validateTavilyApiKey(apiKey?: string): boolean {
  // Tavily API keys are usually in a specific format
  if (!apiKey) return false;
  
  // Check if it matches the expected format (alphanumeric string of sufficient length)
  return apiKey.length >= 25 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
}

/**
 * Validate an OpenAI API key format
 * @param apiKey The OpenAI API key to validate
 * @returns Whether the key appears to be valid
 */
export function validateOpenAIApiKey(apiKey?: string): boolean {
  // OpenAI API keys typically start with "sk-" and are followed by a long string
  if (!apiKey) return false;
  
  return apiKey.startsWith('sk-') && apiKey.length >= 30;
}

/**
 * Validate a Google AI API key format
 * @param apiKey The Google AI API key to validate
 * @returns Whether the key appears to be valid
 */
export function validateGoogleAIApiKey(apiKey?: string): boolean {
  // Google API keys are typically long alphanumeric strings
  if (!apiKey) return false;
  
  return apiKey.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
}

/**
 * Validate a RapidAPI key format
 * @param apiKey The RapidAPI key to validate
 * @returns Whether the key appears to be valid
 */
export function validateRapidApiKey(apiKey?: string): boolean {
  // RapidAPI keys are typically alphanumeric strings
  if (!apiKey) return false;
  
  return apiKey.length >= 20 && /^[a-zA-Z0-9]+$/.test(apiKey);
}

/**
 * Check all required API keys at once
 * @returns An object indicating which API keys are valid
 */
export function validateAPIKeys(): {
  tavily: boolean;
  openai: boolean;
  google: boolean;
  rapidapi: boolean;
} {
  return {
    tavily: validateTavilyApiKey(process.env.TAVILY_API_KEY),
    openai: validateOpenAIApiKey(process.env.OPENAI_API_KEY),
    google: validateGoogleAIApiKey(process.env.GOOGLE_API_KEY),
    rapidapi: validateRapidApiKey(process.env.RAPID_API_KEY)
  };
}