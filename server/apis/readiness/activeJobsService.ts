import { BaseApiService } from './baseApiService';
import { API_ENDPOINTS, API_HOSTS, CACHE_TTL } from './config';

/**
 * Interface for job search parameters
 */
interface JobSearchParams {
  query: string;
  page?: number;
  num_pages?: number;
  date_posted?: 'all' | 'today' | '3days' | 'week' | 'month';
  remote_jobs_only?: boolean;
  employment_types?: string;
  job_requirements?: string;
  radius?: number;
  location?: string;
}

/**
 * Interface for job details parameters
 */
interface JobDetailsParams {
  job_id: string;
  extended_publisher_details?: boolean;
}

/**
 * Active Jobs Service for retrieving job data from RapidAPI
 */
export class ActiveJobsService extends BaseApiService {
  constructor() {
    super('ActiveJobsAPI');
  }
  
  /**
   * Search for jobs based on query parameters
   * @param params Job search parameters
   * @returns Job search results
   */
  async searchJobs(params: JobSearchParams) {
    if (!this.isApiKeyValid()) {
      throw new Error('API key is missing or invalid');
    }
    
    return this.request(API_ENDPOINTS.ACTIVE_JOBS.SEARCH, {
      method: 'GET',
      params,
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': API_HOSTS.ACTIVE_JOBS
      }
    }, CACHE_TTL.LONG);
  }
  
  /**
   * Get detailed information about a specific job
   * @param params Job details parameters
   * @returns Job details
   */
  async getJobDetails(params: JobDetailsParams) {
    if (!this.isApiKeyValid()) {
      throw new Error('API key is missing or invalid');
    }
    
    return this.request(API_ENDPOINTS.ACTIVE_JOBS.DETAILS, {
      method: 'GET',
      params,
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': API_HOSTS.ACTIVE_JOBS
      }
    }, CACHE_TTL.LONG);
  }
  
  /**
   * Search for jobs related to a career transition
   * @param currentRole Current role
   * @param targetRole Target role
   * @param limit Maximum number of results
   * @returns Job search results
   */
  async searchCareerTransitionJobs(currentRole: string, targetRole: string, limit: number = 10) {
    // Craft a specific query to find jobs that might represent a transition path
    const query = `${targetRole} skills experience ${currentRole}`;
    
    const results = await this.searchJobs({
      query,
      num_pages: 1,
      page: 1
    });
    
    // Process and filter results to ensure relevance
    return this.processTransitionJobResults(results, targetRole, limit);
  }
  
  /**
   * Process job search results for career transition relevance
   * @param results Raw job search results
   * @param targetRole Target role to filter for
   * @param limit Maximum number of results to return
   * @returns Processed job results
   */
  private processTransitionJobResults(results: any, targetRole: string, limit: number) {
    if (!results || !results.data || !Array.isArray(results.data)) {
      console.warn('[ActiveJobsAPI] Invalid results format:', results);
      return [];
    }
    
    // Extract relevant jobs, ensure they match the target role
    let relevantJobs = results.data
      .filter((job: any) => {
        const title = job.job_title?.toLowerCase() || '';
        const description = job.job_description?.toLowerCase() || '';
        const targetRoleLower = targetRole.toLowerCase();
        
        // Check if the job title or description contains the target role
        return title.includes(targetRoleLower) || description.includes(targetRoleLower);
      })
      .slice(0, limit)
      .map((job: any) => ({
        id: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        location: job.job_city ? `${job.job_city}, ${job.job_country}` : job.job_country,
        remote: job.job_is_remote,
        url: job.job_apply_link,
        description: job.job_description,
        highlights: job.job_highlights || {},
        posted_at: job.job_posted_at_datetime_utc,
        required_skills: this.extractSkills(job),
        salary: job.job_min_salary || job.job_max_salary ? {
          min: job.job_min_salary,
          max: job.job_max_salary,
          currency: job.job_salary_currency
        } : null
      }));
    
    return relevantJobs;
  }
  
  /**
   * Extract skills from a job posting
   * @param job Job data
   * @returns Array of extracted skills
   */
  private extractSkills(job: any): string[] {
    const skills: string[] = [];
    
    // Extract skills from job highlights if available
    if (job.job_highlights && Array.isArray(job.job_highlights.Qualifications)) {
      job.job_highlights.Qualifications.forEach((qual: string) => {
        // Common patterns for skills in qualifications
        const skillMatches = qual.match(/\b(?:experience|knowledge|proficiency|expertise)\s+(?:in|with)\s+([^.]+)/i);
        if (skillMatches && skillMatches[1]) {
          skills.push(skillMatches[1].trim());
        }
        
        // Look for specific technologies or tools
        const techMatches = qual.match(/\b(?:JavaScript|Python|AWS|React|Node\.js|SQL|TypeScript|Azure|Docker|Kubernetes|Machine Learning|AI|Data Science|Cloud|DevOps)(?:\s+\w+)?\b/gi);
        if (techMatches) {
          skills.push(...techMatches);
        }
      });
    }
    
    // Extract skills from job description if available
    if (job.job_description) {
      const descriptionSkills = this.extractSkillsFromText(job.job_description);
      skills.push(...descriptionSkills);
    }
    
    // Remove duplicates and return
    return [...new Set(skills)];
  }
  
  /**
   * Extract skills from a text
   * @param text Text to extract skills from
   * @returns Array of extracted skills
   */
  private extractSkillsFromText(text: string): string[] {
    const skills: string[] = [];
    
    // Common patterns for required skills in job descriptions
    const requiredSkillsPatterns = [
      /required skills[:\s]+([^.]+)/i,
      /skills required[:\s]+([^.]+)/i,
      /you must have[:\s]+([^.]+)/i,
      /requirements[:\s]+([^.]+)/i,
      /qualifications[:\s]+([^.]+)/i,
      /we are looking for[:\s]+([^.]+)/i
    ];
    
    requiredSkillsPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches && matches[1]) {
        const skillText = matches[1].trim();
        // Split by common separators (commas, bullets, etc.)
        const splitSkills = skillText.split(/[,•\n]+/).map(s => s.trim()).filter(s => s.length > 0);
        skills.push(...splitSkills);
      }
    });
    
    // Look for specific technologies or tools
    const techMatches = text.match(/\b(?:JavaScript|Python|AWS|React|Node\.js|SQL|TypeScript|Azure|Docker|Kubernetes|Machine Learning|AI|Data Science|Cloud|DevOps)(?:\s+\w+)?\b/gi);
    if (techMatches) {
      skills.push(...techMatches);
    }
    
    return skills;
  }
}