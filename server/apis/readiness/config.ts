/**
 * API keys for accessing RapidAPI services
 * Sourced from environment variables for security
 */
export const API_KEYS = {
  RAPIDAPI: process.env.RAPIDAPI_KEY || ''
};

/**
 * API endpoints for various services used in readiness scoring
 */
export const API_ENDPOINTS = {
  ACTIVE_JOBS: {
    SEARCH: 'https://jsearch.p.rapidapi.com/search',
    DETAILS: 'https://jsearch.p.rapidapi.com/job-details'
  }
};

/**
 * API hosts for RapidAPI services
 */
export const API_HOSTS = {
  ACTIVE_JOBS: 'jsearch.p.rapidapi.com'
};

/**
 * Cache Time-To-Live values in seconds
 * Used to avoid excessive API calls and rate limiting
 */
export const CACHE_TTL = {
  SHORT: 60 * 30, // 30 minutes
  MEDIUM: 60 * 60 * 6, // 6 hours
  LONG: 60 * 60 * 24, // 24 hours
  VERY_LONG: 60 * 60 * 24 * 7 // 1 week
};

/**
 * Rate limiting configurations for API calls
 */
export const RATE_LIMITS = {
  ACTIVE_JOBS: {
    REQUESTS_PER_MINUTE: 3,
    REQUESTS_PER_DAY: 300
  }
};

/**
 * Scoring weights for various factors in the readiness score calculation
 * Total adds up to 1 (or 100%)
 */
export const SCORING_WEIGHTS = {
  MARKET_DEMAND: 0.25,
  SKILL_GAP: 0.30,
  EDUCATION_PATH: 0.20,
  INDUSTRY_TREND: 0.15,
  GEOGRAPHICAL_FACTOR: 0.10
};

/**
 * Minimum data requirements for reliable analysis
 */
export const MIN_DATA_REQUIREMENTS = {
  SKILL_GAPS: 3,
  JOB_LISTINGS: 5,
  FORUM_POSTS: 3
};