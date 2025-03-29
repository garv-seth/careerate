/**
 * Forums API Service
 * Provides access to Reddit and Quora APIs for gathering real-world career transition experiences
 * Used for analyzing success patterns and common challenges in career transitions
 */

import { BaseApiService } from './baseApiService';
import { API_KEYS, API_HOSTS, ENDPOINTS, CACHE_EXPIRATION } from './config';

// Type definitions for Reddit API responses
export interface RedditSearchResponse {
  data: RedditPost[];
  pageInfo: {
    endCursor: string;
    hasNextPage: boolean;
  };
}

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string;
  subreddit: string;
  score: number;
  created: number;
  numComments: number;
  upvoteRatio: number;
  isOver18?: boolean;
}

// Type definitions for Quora API responses
export interface QuoraSearchResponse {
  data: QuoraQuestion[];
  pageInfo: {
    endCursor: string;
    hasNextPage: boolean;
  };
}

export interface QuoraQuestion {
  id: string;
  title: string;
  url: string;
  numAnswers: number;
  created?: string;
}

export interface QuoraAnswerResponse {
  data: QuoraAnswer[];
  pageInfo: {
    endCursor: string;
    hasNextPage: boolean;
  };
}

export interface QuoraAnswer {
  id: string;
  content: string;
  url: string;
  author: {
    name: string;
    url: string;
    credentials?: string;
  };
  upvotes: number;
  created?: string;
}

export class ForumsService {
  private redditService: RedditApiService;
  private quoraService: QuoraApiService;

  constructor() {
    this.redditService = new RedditApiService();
    this.quoraService = new QuoraApiService();
  }

  /**
   * Search for career transition stories across Reddit and Quora
   * @param currentRole Current career role
   * @param targetRole Target career role
   * @param limit Maximum number of results to return from each platform
   * @returns Combined results from both platforms
   */
  async searchTransitionStories(
    currentRole: string,
    targetRole: string,
    limit: number = 10
  ): Promise<Array<{
    platform: 'reddit' | 'quora';
    title: string;
    content: string;
    url: string;
    author?: string;
    date?: string;
    upvotes?: number;
  }>> {
    try {
      // Search both platforms in parallel
      const [redditResults, quoraResults] = await Promise.all([
        this.redditService.searchCareerPosts(currentRole, targetRole, limit),
        this.quoraService.searchCareerQuestions(currentRole, targetRole, limit)
      ]);

      // Process and merge results
      const redditStories = redditResults.map(post => ({
        platform: 'reddit' as const,
        title: post.title,
        content: post.content,
        url: post.url,
        author: post.author,
        date: new Date(post.created * 1000).toISOString().split('T')[0],
        upvotes: post.score
      }));

      // For Quora, get answers for each question
      const quoraStories = await Promise.all(
        quoraResults.slice(0, 5).map(async question => {
          try {
            const answers = await this.quoraService.getAnswersForQuestion(question.url, 3);
            if (answers.length === 0) {
              return null;
            }
            
            // Use the top answer
            const topAnswer = answers[0];
            return {
              platform: 'quora' as const,
              title: question.title,
              content: topAnswer.content,
              url: topAnswer.url,
              author: topAnswer.author?.name,
              date: topAnswer.created,
              upvotes: topAnswer.upvotes
            };
          } catch (error) {
            console.warn(`Failed to get answers for Quora question ${question.url}:`, error);
            return null;
          }
        })
      );

      // Combine results, filtering out any null values from Quora processing
      const combinedResults = [
        ...redditStories, 
        ...quoraStories.filter(Boolean)
      ] as Array<{
        platform: 'reddit' | 'quora';
        title: string;
        content: string;
        url: string;
        author?: string;
        date?: string;
        upvotes?: number;
      }>;

      // Sort by upvotes/score for relevance
      return combinedResults.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    } catch (error) {
      console.error('[ForumsService] Error searching career transition stories:', error);
      throw new Error(`Failed to search transition stories: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze common challenges mentioned in career transitions
   * @param fromRole Starting role
   * @param toRole Target role
   * @returns List of common challenges with frequencies
   */
  async analyzeTransitionChallenges(
    fromRole: string,
    toRole: string
  ): Promise<Array<{challenge: string, frequency: number}>> {
    try {
      // Get stories first
      const stories = await this.searchTransitionStories(fromRole, toRole, 20);
      
      // For a more sophisticated implementation, we would use LangGraph to analyze
      // challenges from the content. For this example, we'll return a simplified analysis
      // based on keyword counting for common challenges
      
      const challengeKeywords = [
        {keyword: "interview", challenge: "Technical interview preparation"},
        {keyword: "portfolio", challenge: "Building a strong portfolio"},
        {keyword: "experience", challenge: "Getting relevant experience"},
        {keyword: "skill", challenge: "Acquiring necessary skills"},
        {keyword: "impostor", challenge: "Impostor syndrome"},
        {keyword: "imposter", challenge: "Impostor syndrome"},
        {keyword: "confidence", challenge: "Building confidence"},
        {keyword: "salary", challenge: "Salary negotiation"},
        {keyword: "networking", challenge: "Professional networking"},
        {keyword: "time", challenge: "Finding time to prepare"},
        {keyword: "rejection", challenge: "Handling rejection"},
        {keyword: "gap", challenge: "Addressing skill gaps"},
        {keyword: "certification", challenge: "Getting certifications"},
        {keyword: "age", challenge: "Age-related concerns"},
        {keyword: "bias", challenge: "Dealing with bias"}
      ];
      
      // Count mentions of each challenge
      const challengeCounts: Record<string, number> = {};
      
      stories.forEach(story => {
        const lowerContent = (story.content || "").toLowerCase();
        const lowerTitle = (story.title || "").toLowerCase();
        
        challengeKeywords.forEach(({keyword, challenge}) => {
          if (lowerContent.includes(keyword) || lowerTitle.includes(keyword)) {
            challengeCounts[challenge] = (challengeCounts[challenge] || 0) + 1;
          }
        });
      });
      
      // Convert to array and sort by frequency
      return Object.entries(challengeCounts)
        .map(([challenge, frequency]) => ({ challenge, frequency }))
        .sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error('[ForumsService] Error analyzing transition challenges:', error);
      throw new Error(`Failed to analyze transition challenges: ${(error as Error).message}`);
    }
  }
}

/**
 * Reddit API Service
 * Provides access to the Reddit Unofficial API for post searches
 */
class RedditApiService extends BaseApiService {
  constructor() {
    super(
      API_KEYS.RAPIDAPI_KEY,
      API_HOSTS.REDDIT,
      ENDPOINTS.REDDIT.SEARCH_POSTS,
      CACHE_EXPIRATION.FORUMS
    );
  }

  /**
   * Search for career transition posts on Reddit
   * @param currentRole Current career role
   * @param targetRole Target career role
   * @param limit Maximum number of results to return
   * @returns Reddit posts matching the search criteria
   */
  async searchCareerPosts(
    currentRole: string,
    targetRole: string,
    limit: number = 10
  ): Promise<RedditPost[]> {
    try {
      // Create search query combining current and target roles
      const query = `career change ${currentRole} to ${targetRole}`;
      
      const params = {
        query,
        sort: 'RELEVANCE', // Could also use TOP or HOT
        time: 'all',
        limit
      };
      
      // Make API request
      const response = await this.makeRequest<RedditSearchResponse>(
        ENDPOINTS.REDDIT.SEARCH_POSTS,
        params,
        true
      );
      
      console.log(`[RedditAPI] Found ${response.data.length} posts for query: ${query}`);
      
      // Filter out any NSFW content and posts with no content
      return response.data
        .filter(post => !post.isOver18 && post.content?.trim().length > 0);
    } catch (error) {
      console.error('[RedditAPI] Error searching posts:', error);
      throw new Error(`Failed to search Reddit posts: ${(error as Error).message}`);
    }
  }
}

/**
 * Quora API Service
 * Provides access to the Quora Unofficial API for question and answer searches
 */
class QuoraApiService extends BaseApiService {
  constructor() {
    super(
      API_KEYS.RAPIDAPI_KEY,
      API_HOSTS.QUORA,
      ENDPOINTS.QUORA.SEARCH_QUESTIONS,
      CACHE_EXPIRATION.FORUMS
    );
  }

  /**
   * Search for career transition questions on Quora
   * @param currentRole Current career role
   * @param targetRole Target career role
   * @param limit Maximum number of results to return
   * @returns Quora questions matching the search criteria
   */
  async searchCareerQuestions(
    currentRole: string,
    targetRole: string,
    limit: number = 10
  ): Promise<QuoraQuestion[]> {
    try {
      // Create search query combining current and target roles
      const query = `career transition ${currentRole} to ${targetRole}`;
      
      const params = {
        query,
        language: 'en', // English language
        time: 'all_times',
        limit
      };
      
      // Make API request
      const response = await this.makeRequest<QuoraSearchResponse>(
        ENDPOINTS.QUORA.SEARCH_QUESTIONS,
        params,
        true
      );
      
      console.log(`[QuoraAPI] Found ${response.data.length} questions for query: ${query}`);
      
      // Filter questions with answers
      return response.data.filter(question => question.numAnswers > 0);
    } catch (error) {
      console.error('[QuoraAPI] Error searching questions:', error);
      throw new Error(`Failed to search Quora questions: ${(error as Error).message}`);
    }
  }

  /**
   * Get answers for a specific Quora question
   * @param questionUrl The URL of the Quora question
   * @param limit Maximum number of answers to return
   * @returns Answers to the question
   */
  async getAnswersForQuestion(
    questionUrl: string,
    limit: number = 5
  ): Promise<QuoraAnswer[]> {
    try {
      const params = {
        url: questionUrl,
        sort: 'ranking_toggle_upvote', // Get most upvoted answers
        limit
      };
      
      // Make API request
      const response = await this.makeRequest<QuoraAnswerResponse>(
        ENDPOINTS.QUORA.SEARCH_ANSWERS,
        params,
        true
      );
      
      console.log(`[QuoraAPI] Found ${response.data.length} answers for question: ${questionUrl}`);
      
      // Return answers sorted by upvotes
      return response.data.sort((a, b) => b.upvotes - a.upvotes);
    } catch (error) {
      console.error(`[QuoraAPI] Error getting answers for question: ${questionUrl}`, error);
      throw new Error(`Failed to get Quora answers: ${(error as Error).message}`);
    }
  }
}