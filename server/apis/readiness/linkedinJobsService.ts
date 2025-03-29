/**
 * LinkedIn Jobs API Service
 * Provides access to LinkedIn job listings to supplement the Active Jobs DB
 * Secondary API for job market analysis in the Readiness Score module
 */

import { BaseApiService } from './baseApiService';
import { API_KEYS, API_HOSTS, ENDPOINTS, CACHE_EXPIRATION } from './config';

// Type definitions for LinkedIn Jobs API responses
export interface LinkedInJobsResponse {
  jobs: LinkedInJobListing[];
  total: number;
  took: number;
}

export interface LinkedInJobListing {
  id: string;
  title: string;
  description: string;
  url: string;
  location: string;
  date: string;
  remote: boolean;
  source: string;
  company: {
    name: string;
    url: string;
    logo?: string;
    industry?: string;
    description?: string;
    followerCount?: number;
    employeeCount?: string;
    headquartersLocation?: string;
    specialties?: string[];
  };
  recruiter?: {
    name: string;
    title: string;
    url: string;
  };
  ai_employment_type?: string;
  ai_work_arrangement?: string;
  ai_required_skills?: string[];
  ai_preferred_skills?: string[];
  ai_salary_range?: {
    min: number;
    max: number;
    currency: string;
  };
  ai_benefits?: string[];
  ai_experience_level?: string;
  ai_education_requirements?: string[];
}

export class LinkedInJobsService extends BaseApiService {
  constructor() {
    // Initialize with LinkedIn Jobs API configuration
    super(
      API_KEYS.RAPIDAPI_KEY,
      API_HOSTS.LINKEDIN_JOBS,
      ENDPOINTS.LINKEDIN.GET_JOBS_7DAYS,
      CACHE_EXPIRATION.JOBS
    );
  }

  /**
   * Search for LinkedIn jobs with specific skills or roles
   * @param query Job title, skill, or keyword to search for
   * @param location Optional location filter
   * @param remote Whether to include only remote jobs
   * @param limit Maximum number of results to return (1-100)
   * @param useCache Whether to use cached results
   * @returns Job listings matching the search criteria
   */
  async searchJobs(
    query: string,
    location?: string,
    remote?: boolean,
    limit: number = 100,
    useCache: boolean = true
  ): Promise<LinkedInJobListing[]> {
    try {
      // Build search parameters
      const params: Record<string, any> = {
        title_filter: query,
        limit: Math.min(limit, 100), // Ensure limit doesn't exceed API maximum
        include_ai: true // Always include AI-enriched fields for skill analysis
      };

      // Add optional parameters if provided
      if (location) {
        params.location_filter = location;
      }

      if (remote !== undefined) {
        params.remote = remote.toString();
      }

      // Make API request
      const response = await this.makeRequest<LinkedInJobsResponse>(
        ENDPOINTS.LINKEDIN.GET_JOBS_7DAYS,
        params,
        useCache
      );

      console.log(`[LinkedInJobsAPI] Found ${response.jobs.length} job listings for query: ${query}`);
      return response.jobs || [];
    } catch (error) {
      console.error('[LinkedInJobsAPI] Error searching jobs:', error);
      throw new Error(`Failed to search LinkedIn Jobs: ${(error as Error).message}`);
    }
  }

  /**
   * Get industry trends and insights based on LinkedIn job data
   * @param industry Industry to analyze (e.g., "Software Development", "Data Science")
   * @param limit Number of jobs to analyze
   * @returns Analysis of industry trends
   */
  async getIndustryTrends(industry: string, limit: number = 100): Promise<{
    topCompanies: Array<{name: string, jobCount: number}>;
    topSkills: string[];
    averageSalaryRange: {min: number, max: number, currency: string} | null;
    remoteWorkPercentage: number;
    educationRequirements: Record<string, number>;
  }> {
    try {
      // Search for jobs in this industry
      const params = {
        industry_filter: industry,
        limit: Math.min(limit, 100),
        include_ai: true
      };
      
      // Make API request
      const response = await this.makeRequest<LinkedInJobsResponse>(
        ENDPOINTS.LINKEDIN.GET_JOBS_7DAYS,
        params,
        true // Use cache by default for trend analysis
      );
      
      // Process the results to extract industry trends
      
      // Count jobs by company
      const companyJobCounts: Record<string, number> = {};
      response.jobs.forEach(job => {
        if (job.company?.name) {
          companyJobCounts[job.company.name] = (companyJobCounts[job.company.name] || 0) + 1;
        }
      });
      
      // Get top companies by job count
      const topCompanies = Object.entries(companyJobCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, jobCount]) => ({ name, jobCount }));
      
      // Extract skills from all jobs
      const skillFrequency: Record<string, number> = {};
      response.jobs.forEach(job => {
        [...(job.ai_required_skills || []), ...(job.ai_preferred_skills || [])].forEach(skill => {
          skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
        });
      });
      
      // Get top skills
      const topSkills = Object.entries(skillFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([skill]) => skill);
      
      // Calculate average salary range
      const salaries = response.jobs
        .filter(job => job.ai_salary_range?.min && job.ai_salary_range?.max)
        .map(job => job.ai_salary_range!);
      
      let averageSalaryRange = null;
      if (salaries.length > 0) {
        const avgMin = salaries.reduce((sum, curr) => sum + curr.min, 0) / salaries.length;
        const avgMax = salaries.reduce((sum, curr) => sum + curr.max, 0) / salaries.length;
        // Assuming most salaries are in the same currency, use the most common one
        const currencyCounts: Record<string, number> = {};
        salaries.forEach(salary => {
          currencyCounts[salary.currency] = (currencyCounts[salary.currency] || 0) + 1;
        });
        const mostCommonCurrency = Object.entries(currencyCounts)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        averageSalaryRange = {
          min: Math.round(avgMin),
          max: Math.round(avgMax),
          currency: mostCommonCurrency
        };
      }
      
      // Calculate remote work percentage
      const remoteJobs = response.jobs.filter(job => job.remote || job.ai_work_arrangement === 'Remote').length;
      const remoteWorkPercentage = response.jobs.length > 0 
        ? (remoteJobs / response.jobs.length) * 100 
        : 0;
      
      // Analyze education requirements
      const educationRequirements: Record<string, number> = {};
      response.jobs.forEach(job => {
        if (job.ai_education_requirements) {
          job.ai_education_requirements.forEach(req => {
            educationRequirements[req] = (educationRequirements[req] || 0) + 1;
          });
        }
      });
      
      return {
        topCompanies,
        topSkills,
        averageSalaryRange,
        remoteWorkPercentage,
        educationRequirements
      };
    } catch (error) {
      console.error(`[LinkedInJobsAPI] Error getting industry trends for ${industry}:`, error);
      throw new Error(`Failed to analyze industry trends: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze companies hiring for specific skills or roles
   * @param role Role or job title to analyze
   * @param limit Number of jobs to analyze
   * @returns Analysis of companies hiring for this role
   */
  async analyzeCompaniesHiring(role: string, limit: number = 100): Promise<{
    companies: Array<{
      name: string;
      industry?: string;
      employeeCount?: string;
      jobCount: number;
    }>;
    industriesHiring: Array<{industry: string, count: number}>;
  }> {
    try {
      // Search for jobs with this role
      const params = {
        title_filter: role,
        limit: Math.min(limit, 100),
        include_ai: true
      };
      
      // Make API request
      const response = await this.makeRequest<LinkedInJobsResponse>(
        ENDPOINTS.LINKEDIN.GET_JOBS_7DAYS,
        params,
        true
      );
      
      // Count jobs by company and collect company details
      const companyDetails: Record<string, {
        name: string;
        industry?: string;
        employeeCount?: string;
        jobCount: number;
      }> = {};
      
      // Count industries
      const industriesCounts: Record<string, number> = {};
      
      response.jobs.forEach(job => {
        if (job.company?.name) {
          const companyName = job.company.name;
          
          // Update or create company record
          if (!companyDetails[companyName]) {
            companyDetails[companyName] = {
              name: companyName,
              industry: job.company.industry,
              employeeCount: job.company.employeeCount,
              jobCount: 1
            };
          } else {
            companyDetails[companyName].jobCount++;
          }
          
          // Count industries
          if (job.company.industry) {
            industriesCounts[job.company.industry] = 
              (industriesCounts[job.company.industry] || 0) + 1;
          }
        }
      });
      
      // Convert to arrays and sort
      const companies = Object.values(companyDetails)
        .sort((a, b) => b.jobCount - a.jobCount);
      
      const industriesHiring = Object.entries(industriesCounts)
        .map(([industry, count]) => ({ industry, count }))
        .sort((a, b) => b.count - a.count);
      
      return {
        companies,
        industriesHiring
      };
    } catch (error) {
      console.error(`[LinkedInJobsAPI] Error analyzing companies hiring for ${role}:`, error);
      throw new Error(`Failed to analyze companies hiring: ${(error as Error).message}`);
    }
  }
}