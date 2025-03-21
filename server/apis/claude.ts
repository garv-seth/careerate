import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "placeholder-key",
});

/**
 * Extract skills from scraped content using Claude API
 * @param text The content to analyze
 * @returns Array of extracted skills
 */
export async function extractSkills(text: string): Promise<string[]> {
  try {
    console.log("Extracting skills with Claude API from text length:", text.length);
    
    // Trim text if it's too long
    const trimmedText = text.length > 8000 ? text.substring(0, 8000) : text;
    
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: `You are a technical career skills extractor. 
        Your task is to analyze text from career transition stories and extract specific technical and soft skills mentioned.
        Return the skills as a JSON array of strings, using standardized skill names.
        Focus on skills that would be relevant for tech career transitions. 
        Example output: ["Python", "System Design", "Leadership"]`,
      max_tokens: 1024,
      messages: [
        { role: 'user', content: trimmedText }
      ],
    });

    try {
      // Parse JSON from response, handle both direct JSON or text containing JSON
      const content = response.content[0].text;
      
      // Try to extract JSON array from text
      const jsonMatch = content.match(/\[.*?\]/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If there's no JSON array in brackets, try parsing the whole response
      return JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);
      
      // Fallback: extract skills by looking for quoted strings
      const skillRegex = /"([^"]+)"/g;
      const matches = content.match(skillRegex);
      
      if (matches && matches.length > 0) {
        return matches.map(match => match.replace(/"/g, ''));
      }
      
      // Worst case: return empty array
      return [];
    }
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return []; // Return empty array on error
  }
}
