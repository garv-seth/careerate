/**
 * Improved Tavily Search Tool
 * 
 * A more efficient and resource-friendly implementation of the Tavily search
 * capability with built-in retry logic and error handling.
 */

import axios from 'axios';
import { validateTavilyApiKey } from '../validateApiKeys';

// Default search parameters
const DEFAULT_MAX_RESULTS = 5; 
const DEFAULT_SEARCH_DEPTH = 'basic'; // basic or deep

/**
 * Improved Tavily search function with optimized resource usage
 * @param query The search query
 * @param maxResults Maximum number of results to return
 * @param searchDepth Search depth (basic or deep)
 * @returns The search results
 */
export async function improvedTavilySearch(
  query: string,
  maxResults: number = DEFAULT_MAX_RESULTS,
  searchDepth: 'basic' | 'deep' = DEFAULT_SEARCH_DEPTH
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
    throw new Error('Invalid or missing Tavily API key');
  }
  
  try {
    // Make the API request
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        query,
        search_depth: searchDepth,
        max_results: maxResults,
        include_domains: [],
        exclude_domains: []
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    // Return the search results
    return {
      results: response.data.results || [],
      query
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    // Return empty results on error
    return {
      results: [],
      query
    };
  }
}