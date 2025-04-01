// server/tools/improvedTavilySearch.ts

import axios from "axios";

// Default search parameters
const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_SEARCH_DEPTH = "basic"; // basic or deep

/**
 * Validate Tavily API key
 * @param apiKey The API key to validate
 * @returns Whether the API key is valid
 */
function validateTavilyApiKey(apiKey?: string): boolean {
  if (!apiKey) {
    return false;
  }
  // Tavily API keys start with tvly- and are 36 characters long
  return apiKey.indexOf("tvly-") === 0 && apiKey.length >= 20;
}

/**
 * Improved Tavily search function with error handling and retries
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
    console.warn("Invalid or missing Tavily API key - using fallback");
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

      // Ensure query isn't too long
      const truncatedQuery =
        query.length > 300 ? query.substring(0, 300) : query;

      // Make the API request with proper error handling
      const response = await axios.post(
        "https://api.tavily.com/search",
        {
          query: truncatedQuery,
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

      // For 400 errors, the query might be invalid - truncate it further
      if (
        error.response &&
        error.response.status === 400 &&
        query.length > 200
      ) {
        console.warn("Tavily 400 error, trying with more truncated query");
        query = query.substring(0, 200);
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
 * Alternative search function when Tavily fails
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
    // Generate a fallback list of resources based on commonly used sites
    const encodedQuery = encodeURIComponent(query);

    return {
      results: [
        {
          title: `${query} - Coursera Courses`,
          url: `https://www.coursera.org/search?query=${encodedQuery}`,
          content: `Find courses, certificates, and degrees related to ${query} on Coursera, a leading online learning platform.`,
        },
        {
          title: `${query} - YouTube Tutorials`,
          url: `https://www.youtube.com/results?search_query=${encodedQuery}+tutorial`,
          content: `Watch video tutorials about ${query} on YouTube.`,
        },
        {
          title: `${query} - GitHub Projects`,
          url: `https://github.com/search?q=${encodedQuery}`,
          content: `Explore open source projects related to ${query} on GitHub.`,
        },
        {
          title: `${query} - Medium Articles`,
          url: `https://medium.com/search?q=${encodedQuery}`,
          content: `Read articles about ${query} on Medium.`,
        },
        {
          title: `${query} - Udemy Courses`,
          url: `https://www.udemy.com/courses/search/?src=ukw&q=${encodedQuery}`,
          content: `Find courses related to ${query} on Udemy.`,
        },
      ].slice(0, maxResults),
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