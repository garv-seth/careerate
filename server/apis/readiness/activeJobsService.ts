/**
 * Active Jobs API Service
 * Provides access to real-time job listings from the Active Jobs DB
 * Primary API for job market analysis in the Readiness Score module
 */

import { BaseApiService } from './baseApiService';
import { API_KEYS, API_HOSTS, ENDPOINTS, CACHE_EXPIRATION } from './config';

export interface JobsResponse {
  jobs: JobListing[];
  total?: number;
  took?: number;
}

export interface JobListing {
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

export interface JobDetailsResponse {
  job: JobDetails;
}

export interface JobDetails extends JobListing {
  ai_role_summary?: string;
  ai_qualifications_summary?: string;
  ai_responsibilities?: string[];
  ai_similar_roles?: string[];
  ai_industry?: string;
  ai_role_category?: string;
}

export class ActiveJobsService extends BaseApiService {
  constructor() {
    super(
      API_KEYS.RAPIDAPI,
      API_HOSTS.ACTIVE_JOBS,
      ENDPOINTS.ACTIVE_JOBS.SEARCH,
      CACHE_EXPIRATION.JOBS
    );
  }

  /**
   * Search for job listings based on keywords
   * @param query Job title, skill, or keyword to search for
   * @param location Optional location for filtering jobs
   * @param remote Filter by remote work option (true/false/undefined)
   * @param limit Maximum number of results to return
   * @param useCache Whether to use cached results
   * @returns Job listings matching the search criteria
   */
  async searchJobs(
    query: string,
    location?: string,
    remote?: boolean,
    limit: number = 20,
    useCache: boolean = true
  ): Promise<JobsResponse> {
    // Build query parameters
    const params: Record<string, any> = {
      query,
      limit
    };

    // Add optional parameters if provided
    if (location) {
      params.location = location;
    }

    if (remote !== undefined) {
      params.remote = remote;
    }

    try {
      // Make the API request
      const response = await this.makeRequest<JobsResponse>(
        ENDPOINTS.ACTIVE_JOBS.SEARCH,
        params,
        useCache
      );

      return response;
    } catch (error) {
      console.error(`[ActiveJobsService] Search jobs error: ${(error as Error).message}`);
      // Return empty response on error
      return { jobs: [] };
    }
  }

  /**
   * Search for jobs that require specific skills
   * @param skills Array of skills to search for
   * @param location Optional location for filtering jobs
   * @param remote Filter by remote work option
   * @param limit Maximum number of results to return
   * @returns Job listings requiring the specified skills
   */
  async searchJobsBySkills(
    skills: string[],
    location?: string,
    remote?: boolean,
    limit: number = 20
  ): Promise<JobsResponse> {
    try {
      // Combine skills into a single query string with OR operator
      const skillQuery = skills.join(' OR ');
      return await this.searchJobs(skillQuery, location, remote, limit);
    } catch (error) {
      console.error(`[ActiveJobsService] Search by skills error: ${(error as Error).message}`);
      return { jobs: [] };
    }
  }

  /**
   * Get detailed information about a specific job listing
   * @param jobId ID of the job to get details for
   * @returns Detailed job information
   */
  async getJobDetails(jobId: string): Promise<JobDetails> {
    try {
      const response = await this.makeRequest<JobDetailsResponse>(
        ENDPOINTS.ACTIVE_JOBS.DETAILS,
        { id: jobId }
      );

      return response.job;
    } catch (error) {
      console.error(`[ActiveJobsService] Get job details error: ${(error as Error).message}`);
      throw new Error(`Failed to get job details: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze required skills from job listings
   * @param jobListings Array of job listings to analyze
   * @returns Analysis of skills including frequency and importance
   */
  async analyzeRequiredSkills(jobListings: JobListing[]): Promise<Array<{
    skill: string;
    frequency: number;
    importance: number;
  }>> {
    try {
      // Create a map to count skill frequencies
      const skillMap = new Map<string, number>();
      
      // Process each job listing
      jobListings.forEach(job => {
        // Add required skills with higher weight
        if (job.ai_required_skills) {
          job.ai_required_skills.forEach(skill => {
            const current = skillMap.get(skill.toLowerCase()) || 0;
            skillMap.set(skill.toLowerCase(), current + 2); // Higher weight for required skills
          });
        }
        
        // Add preferred skills with lower weight
        if (job.ai_preferred_skills) {
          job.ai_preferred_skills.forEach(skill => {
            const current = skillMap.get(skill.toLowerCase()) || 0;
            skillMap.set(skill.toLowerCase(), current + 1); // Lower weight for preferred skills
          });
        }
      });
      
      // Convert to array and sort by frequency
      const skillArray = Array.from(skillMap.entries()).map(([skill, frequency]) => ({
        skill,
        frequency,
        importance: frequency / jobListings.length * 10 // Scale importance from 0-10
      }));
      
      // Sort by frequency descending
      return skillArray.sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error(`[ActiveJobsService] Analyze skills error: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Analyze salary distributions from job listings
   * @param jobListings Array of job listings to analyze
   * @returns Analysis of salary distributions
   */
  async analyzeSalaryDistribution(jobListings: JobListing[]): Promise<{
    averageMin: number;
    averageMax: number;
    medianMin: number;
    medianMax: number;
    currency: string;
    count: number;
  }> {
    try {
      // Filter jobs that have salary information
      const jobsWithSalary = jobListings.filter(job => 
        job.ai_salary_range && 
        job.ai_salary_range.min > 0 &&
        job.ai_salary_range.max > 0
      );
      
      if (jobsWithSalary.length === 0) {
        return {
          averageMin: 0,
          averageMax: 0,
          medianMin: 0,
          medianMax: 0,
          currency: 'USD',
          count: 0
        };
      }
      
      // Extract min and max salaries
      const minSalaries = jobsWithSalary.map(job => job.ai_salary_range!.min);
      const maxSalaries = jobsWithSalary.map(job => job.ai_salary_range!.max);
      
      // Calculate averages
      const averageMin = minSalaries.reduce((sum, val) => sum + val, 0) / minSalaries.length;
      const averageMax = maxSalaries.reduce((sum, val) => sum + val, 0) / maxSalaries.length;
      
      // Sort arrays for median calculation
      minSalaries.sort((a, b) => a - b);
      maxSalaries.sort((a, b) => a - b);
      
      // Calculate medians
      const midIndex = Math.floor(minSalaries.length / 2);
      const medianMin = minSalaries.length % 2 === 0
        ? (minSalaries[midIndex - 1] + minSalaries[midIndex]) / 2
        : minSalaries[midIndex];
      
      const medianMax = maxSalaries.length % 2 === 0
        ? (maxSalaries[midIndex - 1] + maxSalaries[midIndex]) / 2
        : maxSalaries[midIndex];
      
      // Use the first available currency or default to USD
      const currency = (jobsWithSalary[0].ai_salary_range?.currency) || 'USD';
      
      return {
        averageMin,
        averageMax,
        medianMin,
        medianMax,
        currency,
        count: jobsWithSalary.length
      };
    } catch (error) {
      console.error(`[ActiveJobsService] Analyze salary error: ${(error as Error).message}`);
      return {
        averageMin: 0,
        averageMax: 0,
        medianMin: 0,
        medianMax: 0,
        currency: 'USD',
        count: 0
      };
    }
  }
}