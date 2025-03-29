/**
 * Google Trends API Service (using NewsNow API)
 * Provides access to realtime Google Trends data to track emerging technology trends
 * Used for validating skill demand predictions in the Readiness Score module
 */

import { BaseApiService } from './baseApiService';
import { API_KEYS, API_HOSTS, ENDPOINTS, CACHE_EXPIRATION } from './config';

// Type definitions for Google Trends (NewsNow) API responses
export interface TrendsResponse {
  total: number;
  articles: TrendArticle[];
}

export interface TrendArticle {
  title: string;
  url: string;
  source: {
    name: string;
    url: string;
  };
  publish_date: string;
  snippet: string;
  thumbnail?: string;
  category?: string;
}

export class GoogleTrendsService extends BaseApiService {
  constructor() {
    super(
      API_KEYS.RAPIDAPI_KEY,
      API_HOSTS.GOOGLE_TRENDS,
      ENDPOINTS.GOOGLE_TRENDS.SEARCH,
      CACHE_EXPIRATION.TRENDS
    );
  }

  /**
   * Search for technology trend articles
   * @param keyword Technology trend or skill to search for
   * @param limit Maximum number of articles to return
   * @returns News articles related to the trend
   */
  async searchTrendArticles(
    keyword: string,
    limit: number = 10
  ): Promise<TrendArticle[]> {
    try {
      const params = {
        query: keyword,
        language: 'en', // English language
        limit
      };
      
      // Make API request
      const response = await this.makeRequest<TrendsResponse>(
        ENDPOINTS.GOOGLE_TRENDS.SEARCH,
        params,
        true
      );
      
      console.log(`[GoogleTrendsAPI] Found ${response.articles.length} articles for keyword: ${keyword}`);
      
      return response.articles;
    } catch (error) {
      console.error('[GoogleTrendsAPI] Error searching trend articles:', error);
      throw new Error(`Failed to search trend articles: ${(error as Error).message}`);
    }
  }
  
  /**
   * Analyze the trend strength of a technology or skill
   * @param skill Technology or skill to analyze
   * @returns Trend analysis with growth score and supporting articles
   */
  async analyzeTrendStrength(skill: string): Promise<{
    trendScore: number; // 0-100 scale
    growth: 'declining' | 'stable' | 'growing' | 'emerging'; 
    articleCount: number;
    topArticles: TrendArticle[];
    relatedKeywords: string[];
  }> {
    try {
      // Get articles about this skill/technology
      const articles = await this.searchTrendArticles(skill, 20);
      
      if (articles.length === 0) {
        return {
          trendScore: 0,
          growth: 'declining',
          articleCount: 0,
          topArticles: [],
          relatedKeywords: []
        };
      }
      
      // Calculate trend score based on:
      // 1. Number of articles (volume)
      // 2. Recency of articles (freshness)
      // 3. Diversity of sources (breadth)
      
      // 1. Volume score (0-40 points)
      const volumeScore = Math.min(articles.length / 20 * 40, 40);
      
      // 2. Freshness score (0-40 points)
      // Calculate average article age in days
      const now = new Date();
      const articleAges = articles.map(article => {
        const pubDate = new Date(article.publish_date);
        const ageInDays = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays;
      });
      
      const avgAgeInDays = articleAges.reduce((sum, age) => sum + age, 0) / articleAges.length;
      // Newer articles get higher scores (inverse relationship)
      // <1 day: 40 points, 7 days: 20 points, 30 days: 5 points, >60 days: 0 points
      const freshnessScore = avgAgeInDays < 1 ? 40 :
        avgAgeInDays < 7 ? 40 - ((avgAgeInDays - 1) / 6 * 20) :
        avgAgeInDays < 30 ? 20 - ((avgAgeInDays - 7) / 23 * 15) :
        avgAgeInDays < 60 ? 5 - ((avgAgeInDays - 30) / 30 * 5) : 0;
      
      // 3. Source diversity score (0-20 points)
      // Count unique sources
      const uniqueSources = new Set(articles.map(article => article.source.name)).size;
      const diversityScore = Math.min(uniqueSources / 10 * 20, 20);
      
      // Calculate overall trend score
      const trendScore = Math.round(volumeScore + freshnessScore + diversityScore);
      
      // Determine growth status
      let growth: 'declining' | 'stable' | 'growing' | 'emerging';
      if (trendScore < 30) {
        growth = 'declining';
      } else if (trendScore < 50) {
        growth = 'stable';
      } else if (trendScore < 75) {
        growth = 'growing';
      } else {
        growth = 'emerging';
      }
      
      // Extract potential related keywords from articles
      // For a more sophisticated implementation, we would use NLP techniques
      // Here we'll just extract common words from titles as a simplification
      const wordCounts: Record<string, number> = {};
      const stopWords = ['a', 'the', 'and', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by'];
      
      articles.forEach(article => {
        const words = article.title.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => 
            word.length > 3 && 
            !stopWords.includes(word) && 
            word !== skill.toLowerCase()
          );
        
        words.forEach(word => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
      });
      
      // Get related keywords (appearing in at least 2 articles)
      const relatedKeywords = Object.entries(wordCounts)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
      
      return {
        trendScore,
        growth,
        articleCount: articles.length,
        topArticles: articles.slice(0, 5), // Return only top 5 articles
        relatedKeywords
      };
    } catch (error) {
      console.error(`[GoogleTrendsAPI] Error analyzing trend strength for ${skill}:`, error);
      throw new Error(`Failed to analyze trend strength: ${(error as Error).message}`);
    }
  }
}