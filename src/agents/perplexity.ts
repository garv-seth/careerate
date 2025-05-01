/**
 * Perplexity AI API integration for enhanced research capabilities
 */
import { Tool } from "langchain/tools";

/**
 * Tool that uses Perplexity AI to answer questions and research topics
 */
export class PerplexityTool extends Tool {
  name = "perplexity_search";
  description = "Get detailed answers to questions using the Perplexity API.";
  apiKey: string;
  model: string;

  constructor(apiKey: string, model: string = "llama-3.1-sonar-small-128k-online") {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  async _call(query: string): Promise<string> {
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: "You are a helpful research assistant providing factual, up-to-date information."
            },
            {
              role: "user",
              content: query
            }
          ],
          max_tokens: 500,
          temperature: 0.2,
          top_p: 0.9,
          search_domain_filter: [],
          return_images: false,
          return_related_questions: false,
          search_recency_filter: "month",
          top_k: 0,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Perplexity API error:", errorData);
        return `Error with Perplexity API: ${response.status} ${response.statusText}`;
      }

      const data = await response.json();
      
      // Format the citations as footnotes if they exist
      let result = data.choices[0].message.content;
      
      if (data.citations && data.citations.length > 0) {
        result += "\n\nSources:";
        data.citations.forEach((citation: string, index: number) => {
          result += `\n[${index + 1}] ${citation}`;
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error using Perplexity API:", error);
      return `Error with Perplexity API: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

/**
 * Function to perform a direct query to Perplexity AI API
 */
export async function queryPerplexity(
  query: string, 
  apiKey: string,
  model: string = "llama-3.1-sonar-small-128k-online"
): Promise<{content: string, citations?: string[]}> {
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a helpful research assistant providing factual, up-to-date information."
          },
          {
            role: "user",
            content: query
          }
        ],
        max_tokens: 500,
        temperature: 0.2,
        top_p: 0.9,
        search_domain_filter: [],
        return_images: false,
        return_related_questions: false,
        search_recency_filter: "month",
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Perplexity API error:", errorData);
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      citations: data.citations || []
    };
  } catch (error) {
    console.error("Error querying Perplexity:", error);
    throw error;
  }
}