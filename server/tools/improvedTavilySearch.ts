// server/tools/improvedTavilySearch.ts (Updated)

import axios from "axios";
import { validateTavilyApiKey } from "../validateApiKeys";

// Default search parameters
const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_SEARCH_DEPTH = "basic"; // basic or deep

/**
 * Improved Tavily search function with error handling, retries and rate limiting
 * @param query The search query
 * @param maxResults Maximum number of results to return
 * @param searchDepth Search depth (basic or deep)
 * @returns The search results
 */
export async function improvedTavilySearch(
  query: string,
  maxResults: number = DEFAULT_MAX_RESULTS,
  searchDepth: "basic" | "deep" = DEFAULT_SEARCH_DEPTH,
): Promise<{
  results: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
  }>;
  query: string;
}> {
  // Validate the API key
  const apiKey = process.env.TAVILY_API_KEY;
  if (!validateTavilyApiKey(apiKey)) {
    console.warn("Invalid or missing Tavily API key - using fallback search");
    return {
      results: [],
      query,
    };
  }

  // Set up retry logic
  const maxRetries = 3;
  let retryCount = 0;
  let lastError: any = null;

  while (retryCount < maxRetries) {
    try {
      // Add exponential backoff delay on retries
      if (retryCount > 0) {
        const delay = Math.min(100 * Math.pow(2, retryCount), 2000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Make the API request with proper error handling
      const response = await axios.post(
        "https://api.tavily.com/search",
        {
          query,
          search_depth: searchDepth,
          max_results: maxResults,
          include_domains: [],
          exclude_domains: [],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 10000, // 10 second timeout
        },
      );

      // Return the search results
      if (response.data && response.data.results) {
        return {
          results: response.data.results,
          query,
        };
      } else {
        console.warn("Tavily returned empty or malformed results");
        return {
          results: [],
          query,
        };
      }
    } catch (error: any) {
      lastError = error;

      // Check if this is a rate limit error (429)
      if (error.response && error.response.status === 429) {
        console.warn(
          `Tavily rate limit hit, retry ${retryCount + 1}/${maxRetries}`,
        );
        retryCount++;
        continue;
      }

      // Check if this is a temporary error (500, 502, 503, 504)
      if (
        error.response &&
        [500, 502, 503, 504].includes(error.response.status)
      ) {
        console.warn(
          `Tavily server error ${error.response.status}, retry ${retryCount + 1}/${maxRetries}`,
        );
        retryCount++;
        continue;
      }

      // For 400 errors, the query might be invalid - truncate it if it's too long
      if (
        error.response &&
        error.response.status === 400 &&
        query.length > 300
      ) {
        console.warn("Tavily 400 error, trying with truncated query");
        query = query.substring(0, 300);
        retryCount++;
        continue;
      }

      // Log the error details for debugging
      console.error(
        "Tavily search error:",
        error.response ? error.response.status : error.message,
      );

      // Break out of the retry loop for other errors
      break;
    }
  }

  // If we reach here, all retries failed or a non-retryable error occurred
  console.error("All Tavily search attempts failed:", lastError?.message);

  // Return empty results on error
  return {
    results: [],
    query,
  };
}

/**
 * Alternative search function using a different API if Tavily continues to fail
 */
export async function fallbackSearch(
  query: string,
  maxResults: number = DEFAULT_MAX_RESULTS,
): Promise<{
  results: Array<{
    title: string;
    url: string;
    content: string;
  }>;
  query: string;
}> {
  try {
    // This would use an alternative search API or method
    // For now, we'll return a minimal result
    return {
      results: [
        {
          title: `Search results for: ${query}`,
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          content: `Fallback search results for query: ${query}. Please check your Tavily API configuration.`,
        },
      ],
      query,
    };
  } catch (error) {
    console.error("Fallback search error:", error);
    return {
      results: [],
      query,
    };
  }
}
