import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_KEYS, CACHE_TTL } from './config';
import { db } from '../../db';
import { apiCache } from '../../../shared/schema';
import { eq, and, gt } from "drizzle-orm";

/**
 * Base API Service class that provides common functionality for all API services
 * Includes caching, rate limiting, error handling, and request management
 */
export abstract class BaseApiService {
  protected axios: AxiosInstance;
  protected serviceName: string;
  protected apiKey: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.apiKey = API_KEYS.RAPIDAPI;
    
    this.axios = axios.create({
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => this.handleApiError(error)
    );
  }
  
  /**
   * Make an API request with caching to avoid rate limiting
   * @param endpoint API endpoint
   * @param config Axios request configuration
   * @param cacheTtl Cache TTL in seconds (optional)
   * @returns API response data
   */
  protected async request<T>(
    endpoint: string,
    config: AxiosRequestConfig,
    cacheTtl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, config);
    
    try {
      // Check if we have a cached response
      const cachedData = await this.getCachedResponse(cacheKey);
      if (cachedData) {
        console.log(`[${this.serviceName}] Using cached response for ${endpoint}`);
        return cachedData as T;
      }
      
      // Make the API request
      console.log(`[${this.serviceName}] Making API request to ${endpoint}`);
      const response = await this.axios.request<T>({
        url: endpoint,
        ...config
      });
      
      // Cache the response
      await this.cacheResponse(cacheKey, response.data, cacheTtl);
      
      return response.data;
    } catch (error) {
      console.error(`[${this.serviceName}] Error making request to ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate a cache key for a request
   * @param endpoint API endpoint
   * @param config Axios request configuration
   * @returns Cache key string
   */
  private getCacheKey(endpoint: string, config: AxiosRequestConfig): string {
    const { method = 'GET', params = {}, data = {} } = config;
    return `${this.serviceName}:${endpoint}:${method}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  }
  
  /**
   * Get a cached response from the database
   * @param cacheKey Cache key
   * @returns Cached response data or null if not found
   */
  private async getCachedResponse(cacheKey: string): Promise<any | null> {
    try {
      const now = new Date();
      const cachedItem = await db.query.apiCache.findFirst({
        where: (fields, { eq, and, gt }) => 
          and(
            eq(fields.endpoint, cacheKey),
            gt(fields.expiresAt, now)
          )
      });
      
      if (cachedItem) {
        return cachedItem.response;
      }
      
      return null;
    } catch (error) {
      console.error(`[${this.serviceName}] Error getting cached response:`, error);
      return null;
    }
  }
  
  /**
   * Cache a response in the database
   * @param cacheKey Cache key
   * @param responseData Response data to cache
   * @param cacheTtl Cache TTL in seconds
   */
  private async cacheResponse(cacheKey: string, responseData: any, cacheTtl: number): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (cacheTtl * 1000));
      
      // Delete any existing cache items for this key
      await db.delete(apiCache).where(eq(apiCache.endpoint, cacheKey));
      
      // Insert the new cache item
      await db.insert(apiCache).values({
        endpoint: cacheKey,
        params: {},
        response: responseData,
        expiresAt
      });
    } catch (error) {
      console.error(`[${this.serviceName}] Error caching response:`, error);
    }
  }
  
  /**
   * Handle API errors and provide meaningful error messages
   * @param error Axios error
   * @returns Rejected promise with error details
   */
  private handleApiError(error: any): Promise<never> {
    let errorMessage = 'An unknown error occurred';
    let statusCode = 500;
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      statusCode = error.response.status;
      const data = error.response.data;
      
      if (data && data.message) {
        errorMessage = data.message;
      } else if (data && data.error) {
        errorMessage = data.error;
      } else {
        errorMessage = `API error with status ${statusCode}`;
      }
      
      // Handle specific status codes
      if (statusCode === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (statusCode === 401 || statusCode === 403) {
        errorMessage = 'API authentication error. Check your API key.';
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from API server';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message || 'Error setting up API request';
    }
    
    const enhancedError = {
      message: `[${this.serviceName}] ${errorMessage}`,
      status: statusCode,
      originalError: error
    };
    
    console.error(enhancedError.message);
    
    return Promise.reject(enhancedError);
  }
  
  /**
   * Check if the API key is valid
   * @returns True if the API key is valid
   */
  public isApiKeyValid(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }
}