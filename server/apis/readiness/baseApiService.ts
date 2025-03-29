/**
 * Base API Service
 * Common functionality for all API services in the Readiness module
 * Includes caching, error handling, and standardized request patterns
 */

import axios, { AxiosRequestConfig } from 'axios';
import { db } from '../../db';
import { apiCache } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export class BaseApiService {
  apiKey: string;
  apiHost: string;
  defaultEndpoint: string;
  cacheExpirationMinutes: number;

  constructor(
    apiKey: string,
    apiHost: string,
    defaultEndpoint: string,
    cacheExpirationMinutes: number = 60
  ) {
    this.apiKey = apiKey;
    this.apiHost = apiHost;
    this.defaultEndpoint = defaultEndpoint;
    this.cacheExpirationMinutes = cacheExpirationMinutes;
  }

  /**
   * Make a request to the API
   * @param endpoint API endpoint to request
   * @param params Parameters to send with the request
   * @param useCache Whether to use cached results if available
   * @returns Response data from the API
   */
  async makeRequest<T>(
    endpoint: string = this.defaultEndpoint,
    params: Record<string, any> = {},
    useCache: boolean = true
  ): Promise<T> {
    // Check for cached response if enabled
    if (useCache) {
      const cachedResponse = await this.getCachedResponse<T>(endpoint, params);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Configure the request
    const options: AxiosRequestConfig = {
      method: 'GET',
      url: `https://${this.apiHost}${endpoint}`,
      params,
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': this.apiHost
      }
    };

    try {
      // Make the request
      const response = await axios.request(options);
      
      // Cache the response for future use
      if (useCache) {
        await this.cacheResponse(endpoint, params, response.data);
      }
      
      return response.data as T;
    } catch (error) {
      console.error(`[BaseApiService] API request failed: ${(error as Error).message}`);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error(`Status: ${error.response.status}`);
          console.error(`Data: ${JSON.stringify(error.response.data)}`);
          console.error(`Headers: ${JSON.stringify(error.response.headers)}`);
        } else if (error.request) {
          // The request was made but no response was received
          console.error(`No response received: ${error.request}`);
        }
      }
      
      throw new Error(`API request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get a cached response if available and not expired
   * @param endpoint API endpoint
   * @param params Request parameters
   * @returns Cached response data or null if not found/expired
   */
  async getCachedResponse<T>(
    endpoint: string,
    params: Record<string, any>
  ): Promise<T | null> {
    try {
      const now = new Date();
      
      // Query for cached response
      const cacheEntries = await db.select()
        .from(apiCache)
        .where(
          and(
            eq(apiCache.endpoint, endpoint),
            eq(apiCache.params, JSON.stringify(params))
          )
        )
        .limit(1);
      
      if (cacheEntries.length === 0) {
        return null;
      }
      
      const cacheEntry = cacheEntries[0];
      
      // Check if cache has expired
      if (now > cacheEntry.expiresAt) {
        // Delete expired cache entry
        await db.delete(apiCache)
          .where(eq(apiCache.id, cacheEntry.id));
        return null;
      }
      
      console.log(`[BaseApiService] Using cached response for ${endpoint}`);
      return cacheEntry.response as T;
    } catch (error) {
      console.error(`[BaseApiService] Error retrieving cache: ${(error as Error).message}`);
      return null; // Proceed with API request on cache error
    }
  }

  /**
   * Cache API response for future use
   * @param endpoint API endpoint
   * @param params Request parameters
   * @param response Response data
   */
  async cacheResponse(
    endpoint: string,
    params: Record<string, any>,
    response: any
  ): Promise<void> {
    try {
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheExpirationMinutes);
      
      // Delete any existing cache for this endpoint+params
      await db.delete(apiCache)
        .where(
          and(
            eq(apiCache.endpoint, endpoint),
            eq(apiCache.params, JSON.stringify(params))
          )
        );
      
      // Store new cache entry
      await db.insert(apiCache)
        .values({
          endpoint,
          params: JSON.stringify(params),
          response,
          expiresAt
        });
      
      console.log(`[BaseApiService] Cached response for ${endpoint} (expires in ${this.cacheExpirationMinutes} minutes)`);
    } catch (error) {
      console.error(`[BaseApiService] Error caching response: ${(error as Error).message}`);
      // Continue anyway, caching failures shouldn't block the API response
    }
  }
}