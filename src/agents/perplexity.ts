/**
 * Perplexity AI API integration for enhanced research capabilities
 */
import { Tool } from "@langchain/core/tools";

// Log once to avoid spamming logs
let perplexityStatusLogged = false;

/**
 * Tool that uses Perplexity AI to answer questions and research topics
 */
export class PerplexityTool extends Tool {
  name = "perplexity_search";
  description = "Get detailed answers to questions using the Perplexity API.";
  apiKey: string;
  model: string;
  connectionVerified: boolean = false;

  constructor(apiKey: string = "", model: string = "llama-3.1-sonar-small-128k-online") {
    super();
    this.apiKey = apiKey || process.env.PERPLEXITY_API_KEY || "";
    this.model = model;
    
    // Log API key status but only once
    if (!perplexityStatusLogged) {
      if (this.apiKey) {
        console.log("✅ PERPLEXITY_API_KEY found! Perplexity API will be available");
        // Test the connection
        this.testConnection();
      } else {
        console.log("⚠️ PERPLEXITY_API_KEY not provided, Perplexity features will be unavailable");
      }
      perplexityStatusLogged = true;
    }
  }
  
  async testConnection(): Promise<void> {
    if (!this.apiKey) return;
    
    try {
      console.log("Testing Perplexity API connection...");
      const result = await this._call("What is the current date?");
      if (result && result.length > 0) {
        console.log("✅ Perplexity API test successful!");
        console.log("Sample response:", result.substring(0, 50) + "...");
        this.connectionVerified = true;
      } else {
        console.log("⚠️ Perplexity API test returned empty response");
      }
    } catch (error) {
      console.error("❌ Error testing Perplexity API:", error);
    }
  }

  async _call(query: string): Promise<string> {
    if (!this.apiKey) {
      return "Error: Perplexity API key not provided. Please check your environment variables.";
    }
    
    try {
      console.log(`Querying Perplexity API: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
      
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: "You are a helpful AI research assistant. Provide accurate, detailed information with citations when available."
            },
            {
              role: "user",
              content: query
            }
          ],
          temperature: 0.2,
          max_tokens: 1000,
          top_p: 0.9,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Perplexity API error (${response.status}):`, errorText);
        return `Error querying Perplexity API: ${response.status} ${response.statusText}. Please try again later.`;
      }
      
      const data = await response.json();
      
      // Extract the content and any citations
      const content = data.choices?.[0]?.message?.content || "No response content";
      
      // Add citations if available
      let result = content;
      if (data.citations && data.citations.length > 0) {
        result += "\n\nSources:\n";
        data.citations.forEach((citation: string, index: number) => {
          result += `${index + 1}. ${citation}\n`;
        });
      }
      
      console.log("Perplexity API response received successfully");
      return result;
    } catch (error) {
      console.error("Error querying Perplexity API:", error);
      return `Error querying Perplexity API: ${error}. Please try again later.`;
    }
  }
}

/**
 * Function to perform a direct query to Perplexity AI API
 */
export async function queryPerplexity(
  query: string,
  apiKey: string = process.env.PERPLEXITY_API_KEY || "",
  model: string = "llama-3.1-sonar-small-128k-online"
): Promise<string> {
  const tool = new PerplexityTool(apiKey, model);
  return await tool._call(query);
}