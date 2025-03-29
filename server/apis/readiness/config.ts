/**
 * API Configuration for Readiness Score Services
 * Contains API keys, hosts, endpoints, and cache settings
 * for all external API services used in the Readiness module
 */

import axios from 'axios';

// API Keys
export const API_KEYS = {
  RAPIDAPI: process.env.RAPIDAPI_KEY || ''
};

// API Hosts
export const API_HOSTS = {
  ACTIVE_JOBS: 'active-jobs-db.p.rapidapi.com',
  LINKEDIN_JOBS: 'linkedin-jobs-search.p.rapidapi.com',
  REDDIT: 'reddit-api-scraper.p.rapidapi.com',
  QUORA: 'quora-scraper1.p.rapidapi.com',
  GOOGLE_TRENDS: 'real-time-news-data.p.rapidapi.com',
  YOUTUBE: 'youtube-search-and-download.p.rapidapi.com'
};

// API Endpoints
export const ENDPOINTS = {
  ACTIVE_JOBS: {
    SEARCH: '/search',
    DETAILS: '/job'
  },
  LINKEDIN_JOBS: {
    SEARCH: '/search'
  },
  REDDIT: {
    SEARCH: '/search/reddit',
    COMMENTS: '/comments/reddit'
  },
  QUORA: {
    SEARCH: '/search'
  },
  GOOGLE_TRENDS: {
    NEWS: '/latest-news',
    SEARCH: '/search'
  },
  YOUTUBE: {
    SEARCH: '/search',
    VIDEOS: '/video/info'
  }
};

// Cache expiration in minutes
export const CACHE_EXPIRATION = {
  JOBS: 60 * 24, // 24 hours
  FORUMS: 60 * 12, // 12 hours
  TRENDS: 60 * 6, // 6 hours
  LEARNING: 60 * 24 * 7 // 7 days
};

// Add response interceptor to log API call status
axios.interceptors.response.use(
  response => {
    const url = new URL(response.config.url || '');
    console.log(`[API] ${response.config.method?.toUpperCase()} ${url.pathname} - ${response.status}`);
    return response;
  },
  error => {
    if (axios.isAxiosError(error) && error.response) {
      const url = new URL(error.config?.url || '');
      console.error(`[API] ${error.config?.method?.toUpperCase()} ${url.pathname} - ${error.response.status}`);
    }
    return Promise.reject(error);
  }
);