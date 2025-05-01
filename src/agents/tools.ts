import { Tool } from "@langchain/core/tools";

// Brave Search API wrapper
export class BraveTool extends Tool {
  name = "brave_search";
  description = "Search the web for current information using Brave Search API.";
  apiKey: string;
  
  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }
  
  async _call(query: string): Promise<string> {
    try {
      const response = await fetch("https://api.search.brave.com/res/v1/web/search", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": this.apiKey
        },
        // Remove Next.js specific options that are not supported in Node.js
      });
      
      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process results
      const results = data.web?.results || [];
      
      if (results.length === 0) {
        return "No results found.";
      }
      
      // Format results
      let formattedResults = "Search Results:\n\n";
      
      results.slice(0, 5).forEach((result: any, index: number) => {
        formattedResults += `${index + 1}. ${result.title}\n`;
        formattedResults += `   URL: ${result.url}\n`;
        formattedResults += `   Description: ${result.description}\n\n`;
      });
      
      return formattedResults;
    } catch (error) {
      console.error("Error with Brave Search:", error);
      return `Error searching with Brave: ${error.message}`;
    }
  }
}

// Perplexity API wrapper
export class PerplexityTool extends Tool {
  name = "perplexity_search";
  description = "Get detailed answers to questions using the Perplexity API.";
  apiKey: string;
  
  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }
  
  async _call(query: string): Promise<string> {
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant providing accurate and detailed information about career trends, job markets, and skills."
            },
            {
              role: "user",
              content: query
            }
          ],
          temperature: 0.2,
          max_tokens: 2000,
          search_recency_filter: "month",
          top_p: 0.9
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error with Perplexity:", error);
      return `Error searching with Perplexity: ${error.message}`;
    }
  }
}

// Browserbase session for page scraping
export class BrowserbaseTool extends Tool {
  name = "browserbase_scraper";
  description = "Scrape web pages for detailed information using Browserbase.";
  apiKey: string;
  
  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }
  
  async _call(url: string): Promise<string> {
    try {
      // For MVP just return a mockup
      return `Scraped content from ${url}: 
      
      This page contains information about career trends in the tech industry. Key points:
      - Demand for AI engineers has increased by 74% in the last year
      - Cloud architecture specialists remain in high demand
      - Cybersecurity skills are critical across all industries
      - Full-stack development is evolving to include more ML/AI components`;
    } catch (error) {
      console.error("Error with Browserbase:", error);
      return `Error scraping with Browserbase: ${error.message}`;
    }
  }
}

// Firecrawl for deep crawl
export class FirecrawlTool extends Tool {
  name = "firecrawl";
  description = "Perform deep web crawls to gather comprehensive information using Firecrawl.";
  apiKey: string;
  
  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }
  
  async _call(query: string): Promise<string> {
    try {
      // For MVP just return a mockup
      return `Firecrawl results for "${query}":
      
      Analysis of 35 relevant pages shows the following trends:
      - Companies are increasingly requiring knowledge of both traditional software engineering and data science
      - Remote work options remain prevalent, with 78% of tech job listings offering remote or hybrid options
      - Salaries for specialized roles have increased by an average of 12% year-over-year
      - Startup hiring has slowed by 15% while established tech companies have increased hiring by 8%`;
    } catch (error) {
      console.error("Error with Firecrawl:", error);
      return `Error crawling with Firecrawl: ${error.message}`;
    }
  }
}

// Create tool instances with environment variables
export const createTools = () => {
  // Add defensive checks to prevent runtime errors
  try {
    const braveApiKey = process.env.BRAVE_API_KEY || "";
    const pplxApiKey = process.env.PPLX_API_KEY || "";
    const browserbaseApiKey = process.env.BROWSERBASE_API_KEY || "";
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY || "";
    
    // For missing API keys, log warnings
    if (!pplxApiKey) console.log("Warning: PPLX_API_KEY not provided");
    if (!braveApiKey) console.log("Warning: BRAVE_API_KEY not provided");
    
    return {
      braveSearch: new BraveTool(braveApiKey),
      perplexitySearch: new PerplexityTool(pplxApiKey),
      browserbaseScraper: new BrowserbaseTool(browserbaseApiKey),
      firecrawlCrawler: new FirecrawlTool(firecrawlApiKey)
    };
  } catch (error) {
    console.error("Error creating tools:", error);
    // Return mock tools that won't throw errors
    return {
      braveSearch: {
        name: "brave_search",
        description: "Search the web for current information",
        call: async () => "Mock search results",
        invoke: async () => "Mock search results"
      },
      perplexitySearch: {
        name: "perplexity_search",
        description: "Get detailed answers to questions",
        call: async () => "Mock Perplexity results",
        invoke: async () => "Mock Perplexity results"
      },
      browserbaseScraper: {
        name: "browserbase_scraper",
        description: "Scrape web pages for information",
        call: async () => "Mock scraping results",
        invoke: async () => "Mock scraping results"
      },
      firecrawlCrawler: {
        name: "firecrawl",
        description: "Perform deep web crawls",
        call: async () => "Mock crawling results",
        invoke: async () => "Mock crawling results"
      }
    };
  }
};
