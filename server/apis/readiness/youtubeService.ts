/**
 * YouTube API Service
 * Provides access to YouTube video search API for finding relevant learning resources
 * Used for skill development recommendations in the Readiness Score module
 */

import { BaseApiService } from './baseApiService';
import { API_KEYS, API_HOSTS, ENDPOINTS, CACHE_EXPIRATION } from './config';

// Type definitions for YouTube API responses
export interface YouTubeSearchResponse {
  kind: string;
  nextPageToken?: string;
  prevPageToken?: string;
  regionCode?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeVideo[];
}

export interface YouTubeVideo {
  kind: string;
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: YouTubeThumbnail;
      medium: YouTubeThumbnail;
      high: YouTubeThumbnail;
    };
    channelTitle: string;
    liveBroadcastContent: string;
    publishTime: string;
  };
}

export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

export class YouTubeService extends BaseApiService {
  constructor() {
    super(
      API_KEYS.RAPIDAPI_KEY,
      API_HOSTS.YOUTUBE,
      ENDPOINTS.YOUTUBE.SEARCH,
      CACHE_EXPIRATION.TRENDS
    );
  }

  /**
   * Search for YouTube videos related to learning a specific skill
   * @param skill Skill or technology to search learning resources for
   * @param limit Maximum number of videos to return
   * @returns YouTube videos matching the search criteria
   */
  async searchLearningVideos(
    skill: string,
    limit: number = 10
  ): Promise<Array<{
    title: string;
    description: string;
    videoId: string;
    thumbnailUrl: string;
    channelTitle: string;
    publishedAt: string;
    url: string;
  }>> {
    try {
      // Create a search query focused on learning resources
      const query = `learn ${skill} tutorial beginner`;
      
      const params = {
        part: 'snippet',
        maxResults: Math.min(limit, 50), // API limit is 50
        q: query,
        type: 'video',
        order: 'relevance'
      };
      
      // Make API request
      const response = await this.makeRequest<YouTubeSearchResponse>(
        ENDPOINTS.YOUTUBE.SEARCH,
        params,
        true
      );
      
      console.log(`[YouTubeAPI] Found ${response.items.length} videos for query: ${query}`);
      
      // Process results into a simpler format
      return response.items.map(item => ({
        title: item.snippet.title,
        description: item.snippet.description,
        videoId: item.id.videoId,
        thumbnailUrl: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
    } catch (error) {
      console.error('[YouTubeAPI] Error searching learning videos:', error);
      throw new Error(`Failed to search YouTube videos: ${(error as Error).message}`);
    }
  }

  /**
   * Find career transition advice videos
   * @param currentRole Current career role
   * @param targetRole Target career role
   * @param limit Maximum number of videos to return
   * @returns YouTube videos about career transitions
   */
  async findCareerTransitionVideos(
    currentRole: string,
    targetRole: string,
    limit: number = 10
  ): Promise<Array<{
    title: string;
    description: string;
    videoId: string;
    thumbnailUrl: string;
    channelTitle: string;
    publishedAt: string;
    url: string;
  }>> {
    try {
      // Create a search query for career transition advice
      const query = `career change ${currentRole} to ${targetRole} advice`;
      
      const params = {
        part: 'snippet',
        maxResults: Math.min(limit, 50),
        q: query,
        type: 'video',
        order: 'relevance'
      };
      
      // Make API request
      const response = await this.makeRequest<YouTubeSearchResponse>(
        ENDPOINTS.YOUTUBE.SEARCH,
        params,
        true
      );
      
      console.log(`[YouTubeAPI] Found ${response.items.length} career transition videos for query: ${query}`);
      
      // Process results into a simpler format
      return response.items.map(item => ({
        title: item.snippet.title,
        description: item.snippet.description,
        videoId: item.id.videoId,
        thumbnailUrl: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
    } catch (error) {
      console.error('[YouTubeAPI] Error finding career transition videos:', error);
      throw new Error(`Failed to find career transition videos: ${(error as Error).message}`);
    }
  }

  /**
   * Find related videos based on a specific video ID
   * @param videoId Base video ID to find related content
   * @param limit Maximum number of videos to return
   * @returns YouTube videos related to the specified video
   */
  async findRelatedVideos(
    videoId: string,
    limit: number = 10
  ): Promise<Array<{
    title: string;
    description: string;
    videoId: string;
    thumbnailUrl: string;
    channelTitle: string;
    publishedAt: string;
    url: string;
  }>> {
    try {
      const params = {
        part: 'snippet',
        maxResults: Math.min(limit, 50),
        relatedToVideoId: videoId,
        type: 'video'
      };
      
      // Make API request
      const response = await this.makeRequest<YouTubeSearchResponse>(
        ENDPOINTS.YOUTUBE.SEARCH,
        params,
        true
      );
      
      console.log(`[YouTubeAPI] Found ${response.items.length} videos related to video ID: ${videoId}`);
      
      // Process results into a simpler format
      return response.items.map(item => ({
        title: item.snippet.title,
        description: item.snippet.description,
        videoId: item.id.videoId,
        thumbnailUrl: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
    } catch (error) {
      console.error(`[YouTubeAPI] Error finding videos related to video ID: ${videoId}`, error);
      throw new Error(`Failed to find related videos: ${(error as Error).message}`);
    }
  }
}