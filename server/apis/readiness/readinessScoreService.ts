/**
 * AI Readiness Score Service
 * Core service for calculating a user's readiness for a career transition
 * Integrates data from multiple sources to provide a comprehensive assessment
 */

import { db } from '../../db';
import { storage } from '../../storage';
import { readinessScores } from '../../../shared/schema';
import { ActiveJobsService } from './activeJobsService';

// Interfaces for Readiness score data
export interface ReadinessScore {
  id?: number;
  transitionId: number;
  overallScore: number;
  marketDemandScore: number;
  skillGapScore: number;
  educationPathScore: number;
  industryTrendScore: number;
  geographicalFactorScore: number;
  recommendations: ReadinessRecommendations;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReadinessRecommendations {
  skillDevelopment: RecommendationItem[];
  marketPositioning: RecommendationItem[];
  educationPaths: RecommendationItem[];
  experienceBuilding: RecommendationItem[];
  networkingOpportunities: RecommendationItem[];
  nextSteps: RecommendationItem[];
}

export interface RecommendationItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeframe?: 'immediate' | 'short-term' | 'long-term';
  resources?: {
    title: string;
    url: string;
    type: 'course' | 'article' | 'book' | 'video' | 'community' | 'tool';
  }[];
}

export interface SkillGapAnalysis {
  missingSkills: Array<{
    skill: string;
    importance: number;
    learningDifficulty: number;
  }>;
  partialSkills: Array<{
    skill: string;
    currentLevel: number; // 1-10
    requiredLevel: number; // 1-10
    importance: number;
  }>;
  strongSkills: Array<{
    skill: string;
    relevance: number;
  }>;
}

export class ReadinessScoreService {
  private activeJobsService: ActiveJobsService;

  constructor() {
    this.activeJobsService = new ActiveJobsService();
  }

  /**
   * Generate a readiness score for a career transition
   * @param transitionId The ID of the career transition
   * @returns The readiness score and recommendations
   */
  async generateReadinessScore(transitionId: number): Promise<ReadinessScore> {
    try {
      console.log(`[ReadinessScoreService] Generating readiness score for transition ${transitionId}`);
      
      // Get the transition
      const transition = await storage.getTransition(transitionId);
      if (!transition) {
        throw new Error(`Transition with ID ${transitionId} not found`);
      }
      
      // Get user ID (if available)
      const userId = transition.userId || 1;
      
      // Get insights for this transition
      const insights = await storage.getInsightsByTransitionId(transitionId);
      
      // Get skills for current and target roles
      const currentRoleSkills = await storage.getRoleSkills(transition.currentRole);
      const targetRoleSkills = await storage.getRoleSkills(transition.targetRole);
      
      // Get user skills
      const userSkills = await storage.getUserSkills(userId);
      
      // Search for target role jobs to analyze market demand
      const jobsResponse = await this.activeJobsService.searchJobs(
        transition.targetRole, 
        undefined, // no location filter
        undefined, // no remote filter
        50 // get up to 50 jobs
      );
      
      // Get the jobs array from the response
      const jobs = jobsResponse.jobs || [];
      
      // Calculate scores
      const marketDemandScore = this.calculateMarketDemandScore(jobs, insights);
      const skillGapScore = this.calculateSkillGapScore(userSkills, currentRoleSkills, targetRoleSkills);
      const educationPathScore = this.calculateEducationPathScore(insights);
      const industryTrendScore = this.calculateIndustryTrendScore(insights);
      const geographicalFactorScore = this.calculateGeographicalFactorScore(insights);
      
      // Calculate overall score (weighted average)
      const overallScore = Math.round(
        (marketDemandScore * 0.25) + 
        (skillGapScore * 0.3) + 
        (educationPathScore * 0.15) + 
        (industryTrendScore * 0.2) + 
        (geographicalFactorScore * 0.1)
      );
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        transition,
        userSkills,
        currentRoleSkills,
        targetRoleSkills,
        jobs, // Use the extracted jobs array
        insights
      );
      
      // Create the readiness score object
      const readinessScore: ReadinessScore = {
        transitionId,
        overallScore,
        marketDemandScore,
        skillGapScore,
        educationPathScore,
        industryTrendScore,
        geographicalFactorScore,
        recommendations
      };
      
      // Save to database
      await this.saveReadinessScore(readinessScore);
      
      return readinessScore;
    } catch (error) {
      console.error(`[ReadinessScoreService] Error generating score: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get a previously generated readiness score
   * @param transitionId The ID of the career transition
   * @returns The readiness score or null if not found
   */
  async getReadinessScore(transitionId: number): Promise<ReadinessScore | null> {
    try {
      // Query the database for existing readiness score
      const results = await db.query.readinessScores.findMany({
        where: (fields, { eq }) => eq(fields.transitionId, transitionId),
        orderBy: (fields, { desc }) => [desc(fields.createdAt)],
        limit: 1
      });
      
      if (results.length === 0) {
        return null;
      }
      
      return results[0] as ReadinessScore;
    } catch (error) {
      console.error(`[ReadinessScoreService] Error getting score: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Save a readiness score to the database
   * @param score The readiness score to save
   */
  private async saveReadinessScore(score: ReadinessScore): Promise<void> {
    try {
      // Check if a score already exists for this transition
      const existingScore = await this.getReadinessScore(score.transitionId);
      
      if (existingScore) {
        // Update existing score
        await db.update(readinessScores)
          .set({
            overallScore: score.overallScore,
            marketDemandScore: score.marketDemandScore,
            skillGapScore: score.skillGapScore,
            educationPathScore: score.educationPathScore,
            industryTrendScore: score.industryTrendScore,
            geographicalFactorScore: score.geographicalFactorScore,
            recommendations: score.recommendations,
            updatedAt: new Date()
          })
          .where(readinessScores.id === existingScore.id);
          
        console.log(`[ReadinessScoreService] Updated readiness score ${existingScore.id}`);
      } else {
        // Insert new score
        const result = await db.insert(readinessScores)
          .values({
            transitionId: score.transitionId,
            overallScore: score.overallScore,
            marketDemandScore: score.marketDemandScore,
            skillGapScore: score.skillGapScore,
            educationPathScore: score.educationPathScore,
            industryTrendScore: score.industryTrendScore,
            geographicalFactorScore: score.geographicalFactorScore,
            recommendations: score.recommendations,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
        console.log(`[ReadinessScoreService] Created new readiness score`);
      }
    } catch (error) {
      console.error(`[ReadinessScoreService] Error saving score: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Calculate market demand score based on job listings and insights
   * @param jobs Array of job listings
   * @param insights Career transition insights
   * @returns Market demand score (0-100)
   */
  private calculateMarketDemandScore(
    jobs: any[],
    insights: any[]
  ): number {
    try {
      // Base score on number of job listings (up to 40 points)
      const jobCountScore = Math.min(jobs.length, 40);
      
      // Score based on salary data (up to 20 points)
      let salaryScore = 0;
      const salaryInsights = insights.filter(i => 
        i.category === 'salary' || 
        i.category === 'compensation'
      );
      
      if (salaryInsights.length > 0) {
        salaryScore = 20;
      }
      
      // Score based on growth trends (up to 40 points)
      let growthScore = 0;
      const growthInsights = insights.filter(i => 
        i.category === 'market_growth' || 
        i.category === 'industry_growth'
      );
      
      if (growthInsights.length > 0) {
        // Analyze growth insights for positive indicators
        const positiveGrowth = growthInsights.filter(i => 
          i.content.toLowerCase().includes('growing') ||
          i.content.toLowerCase().includes('increase') ||
          i.content.toLowerCase().includes('expanding') ||
          i.content.toLowerCase().includes('opportunity')
        );
        
        growthScore = Math.min(positiveGrowth.length * 10, 40);
      }
      
      // Calculate total score
      const totalScore = jobCountScore + salaryScore + growthScore;
      
      // Normalize to 0-100 scale
      return Math.min(Math.round(totalScore), 100);
    } catch (error) {
      console.error(`[ReadinessScoreService] Error calculating market demand: ${(error as Error).message}`);
      return 50; // Default to moderate score on error
    }
  }

  /**
   * Calculate skill gap score based on user skills vs. target role requirements
   * @param userSkills User's current skills
   * @param currentRoleSkills Skills for current role
   * @param targetRoleSkills Skills for target role
   * @returns Skill gap score (0-100)
   */
  private calculateSkillGapScore(
    userSkills: any[],
    currentRoleSkills: any[],
    targetRoleSkills: any[]
  ): number {
    try {
      if (targetRoleSkills.length === 0) {
        return 50; // Default to moderate score if no target skills defined
      }
      
      // Extract skill names for easier comparison
      const userSkillNames = userSkills.map(s => s.skillName.toLowerCase());
      const currentRoleSkillNames = currentRoleSkills.map(s => s.skillName.toLowerCase());
      const targetRoleSkillNames = targetRoleSkills.map(s => s.skillName.toLowerCase());
      
      // Combine user skills with current role skills (assumed to be possessed)
      const existingSkills = [...new Set([...userSkillNames, ...currentRoleSkillNames])];
      
      // Count matching skills
      const matchingSkills = targetRoleSkillNames.filter(skill => 
        existingSkills.includes(skill)
      );
      
      // Calculate match percentage
      const matchPercentage = (matchingSkills.length / targetRoleSkillNames.length) * 100;
      
      // Apply scoring curve (skill match % directly correlates to score)
      return Math.round(matchPercentage);
    } catch (error) {
      console.error(`[ReadinessScoreService] Error calculating skill gap: ${(error as Error).message}`);
      return 50; // Default to moderate score on error
    }
  }

  /**
   * Calculate education path score based on insights
   * @param insights Career transition insights
   * @returns Education path score (0-100)
   */
  private calculateEducationPathScore(insights: any[]): number {
    try {
      // Filter for education-related insights
      const educationInsights = insights.filter(i => 
        i.category === 'education' || 
        i.category === 'certification' ||
        i.category === 'training'
      );
      
      if (educationInsights.length === 0) {
        return 50; // Default to moderate score if no education insights
      }
      
      // Count educational resources and paths
      const resourceCount = educationInsights.length;
      
      // Score based on number of educational resources (up to 80 points)
      let resourceScore = Math.min(resourceCount * 10, 80);
      
      // Bonus points for structured learning paths (up to 20 points)
      let pathScore = 0;
      const structuredPaths = educationInsights.filter(i => 
        i.content.toLowerCase().includes('degree') ||
        i.content.toLowerCase().includes('certification') ||
        i.content.toLowerCase().includes('bootcamp') ||
        i.content.toLowerCase().includes('course') ||
        i.content.toLowerCase().includes('program')
      );
      
      pathScore = Math.min(structuredPaths.length * 5, 20);
      
      // Calculate total score
      const totalScore = resourceScore + pathScore;
      
      // Normalize to 0-100 scale
      return Math.min(Math.round(totalScore), 100);
    } catch (error) {
      console.error(`[ReadinessScoreService] Error calculating education path: ${(error as Error).message}`);
      return 50; // Default to moderate score on error
    }
  }

  /**
   * Calculate industry trend score based on insights
   * @param insights Career transition insights
   * @returns Industry trend score (0-100)
   */
  private calculateIndustryTrendScore(insights: any[]): number {
    try {
      // Filter for trend-related insights
      const trendInsights = insights.filter(i => 
        i.category === 'industry_trend' || 
        i.category === 'technology_trend' ||
        i.category === 'market_trend'
      );
      
      if (trendInsights.length === 0) {
        return 50; // Default to moderate score if no trend insights
      }
      
      // Count total trend insights
      const trendCount = trendInsights.length;
      
      // Score based on number of trend insights (up to 60 points)
      let trendScore = Math.min(trendCount * 10, 60);
      
      // Analyze sentiment in trend insights (up to 40 points)
      let sentimentScore = 0;
      const positiveTrends = trendInsights.filter(i => 
        i.content.toLowerCase().includes('growing') ||
        i.content.toLowerCase().includes('emerging') ||
        i.content.toLowerCase().includes('rising') ||
        i.content.toLowerCase().includes('opportunity') ||
        i.content.toLowerCase().includes('promising') ||
        i.content.toLowerCase().includes('demand')
      );
      
      sentimentScore = Math.min(positiveTrends.length * 8, 40);
      
      // Calculate total score
      const totalScore = trendScore + sentimentScore;
      
      // Normalize to 0-100 scale
      return Math.min(Math.round(totalScore), 100);
    } catch (error) {
      console.error(`[ReadinessScoreService] Error calculating industry trends: ${(error as Error).message}`);
      return 50; // Default to moderate score on error
    }
  }

  /**
   * Calculate geographical factor score based on insights
   * @param insights Career transition insights
   * @returns Geographical factor score (0-100)
   */
  private calculateGeographicalFactorScore(insights: any[]): number {
    try {
      // Filter for location-related insights
      const locationInsights = insights.filter(i => 
        i.category === 'location' || 
        i.category === 'region' ||
        i.category === 'geographic'
      );
      
      if (locationInsights.length === 0) {
        return 50; // Default to moderate score if no location insights
      }
      
      // Count total location insights
      const locationCount = locationInsights.length;
      
      // Score based on number of location insights (up to 40 points)
      let locationScore = Math.min(locationCount * 10, 40);
      
      // Analyze sentiment in location insights (up to 30 points)
      let sentimentScore = 0;
      const positiveLocations = locationInsights.filter(i => 
        i.content.toLowerCase().includes('hub') ||
        i.content.toLowerCase().includes('center') ||
        i.content.toLowerCase().includes('capital') ||
        i.content.toLowerCase().includes('remote') ||
        i.content.toLowerCase().includes('opportunity')
      );
      
      sentimentScore = Math.min(positiveLocations.length * 10, 30);
      
      // Remote work bonus (up to 30 points)
      let remoteScore = 0;
      const remoteInsights = locationInsights.filter(i => 
        i.content.toLowerCase().includes('remote') ||
        i.content.toLowerCase().includes('work from home') ||
        i.content.toLowerCase().includes('distributed') ||
        i.content.toLowerCase().includes('virtual')
      );
      
      remoteScore = Math.min(remoteInsights.length * 10, 30);
      
      // Calculate total score
      const totalScore = locationScore + sentimentScore + remoteScore;
      
      // Normalize to 0-100 scale
      return Math.min(Math.round(totalScore), 100);
    } catch (error) {
      console.error(`[ReadinessScoreService] Error calculating geographical factors: ${(error as Error).message}`);
      return 50; // Default to moderate score on error
    }
  }

  /**
   * Generate personalized recommendations based on analysis
   * @param transition Career transition
   * @param userSkills User's current skills
   * @param currentRoleSkills Skills for current role
   * @param targetRoleSkills Skills for target role
   * @param jobs Array of job listings
   * @param insights Career transition insights
   * @returns Structured recommendations
   */
  private async generateRecommendations(
    transition: any,
    userSkills: any[],
    currentRoleSkills: any[],
    targetRoleSkills: any[],
    jobs: any[],
    insights: any[]
  ): Promise<ReadinessRecommendations> {
    try {
      // 1. Skill development recommendations
      const skillDevelopment = this.generateSkillDevelopmentRecommendations(
        userSkills,
        currentRoleSkills,
        targetRoleSkills,
        jobs
      );
      
      // 2. Market positioning recommendations
      const marketPositioning = this.generateMarketPositioningRecommendations(
        transition,
        jobs,
        insights
      );
      
      // 3. Education paths recommendations
      const educationPaths = this.generateEducationPathRecommendations(
        transition,
        insights,
        targetRoleSkills
      );
      
      // 4. Experience building recommendations
      const experienceBuilding = this.generateExperienceBuildingRecommendations(
        transition,
        insights,
        jobs
      );
      
      // 5. Networking opportunities recommendations
      const networkingOpportunities = this.generateNetworkingRecommendations(
        transition,
        insights
      );
      
      // 6. Next steps recommendations
      const nextSteps = this.generateNextStepsRecommendations(
        skillDevelopment,
        marketPositioning,
        educationPaths,
        experienceBuilding
      );
      
      return {
        skillDevelopment,
        marketPositioning,
        educationPaths,
        experienceBuilding,
        networkingOpportunities,
        nextSteps
      };
    } catch (error) {
      console.error(`[ReadinessScoreService] Error generating recommendations: ${(error as Error).message}`);
      
      // Return minimal default recommendations
      return {
        skillDevelopment: [
          {
            title: "Expand your technical skills",
            description: "Focus on developing the core technical skills required for the role.",
            priority: "high"
          }
        ],
        marketPositioning: [
          {
            title: "Update your professional profiles",
            description: "Align your resume and online profiles with your target role.",
            priority: "medium"
          }
        ],
        educationPaths: [
          {
            title: "Consider relevant certifications",
            description: "Research industry-recognized certifications that can validate your skills.",
            priority: "medium"
          }
        ],
        experienceBuilding: [
          {
            title: "Seek relevant projects",
            description: "Look for opportunities to gain hands-on experience with projects related to your target role.",
            priority: "high"
          }
        ],
        networkingOpportunities: [
          {
            title: "Join professional communities",
            description: "Connect with professionals in your target field through online communities and local meetups.",
            priority: "medium"
          }
        ],
        nextSteps: [
          {
            title: "Create a development plan",
            description: "Outline a structured plan with timelines for acquiring necessary skills and experience.",
            priority: "high"
          }
        ]
      };
    }
  }

  /**
   * Generate skill development recommendations
   * @param userSkills User's current skills
   * @param currentRoleSkills Skills for current role
   * @param targetRoleSkills Skills for target role
   * @param jobs Array of job listings
   * @returns Skill development recommendations
   */
  private generateSkillDevelopmentRecommendations(
    userSkills: any[],
    currentRoleSkills: any[],
    targetRoleSkills: any[],
    jobs: any[]
  ): RecommendationItem[] {
    try {
      const recommendations: RecommendationItem[] = [];
      
      // Extract skill names for easier comparison
      const userSkillNames = userSkills.map(s => s.skillName.toLowerCase());
      const currentRoleSkillNames = currentRoleSkills.map(s => s.skillName.toLowerCase());
      const targetRoleSkillNames = targetRoleSkills.map(s => s.skillName.toLowerCase());
      
      // Combine user skills with current role skills (assumed to be possessed)
      const existingSkills = [...new Set([...userSkillNames, ...currentRoleSkillNames])];
      
      // Identify skill gaps
      const missingSkills = targetRoleSkillNames.filter(skill => 
        !existingSkills.includes(skill)
      );
      
      if (missingSkills.length > 0) {
        // Create recommendations for top missing skills
        const topSkills = missingSkills.slice(0, Math.min(5, missingSkills.length));
        
        recommendations.push({
          title: "Focus on acquiring critical skills",
          description: `Prioritize learning these key skills: ${topSkills.join(', ')}`,
          priority: "high",
          timeframe: "immediate"
        });
      }
      
      // Add recommendation for continued development of existing relevant skills
      const relevantExistingSkills = existingSkills.filter(skill => 
        targetRoleSkillNames.includes(skill)
      );
      
      if (relevantExistingSkills.length > 0) {
        recommendations.push({
          title: "Strengthen your existing relevant skills",
          description: `Continue developing your proficiency in: ${relevantExistingSkills.slice(0, 3).join(', ')}`,
          priority: "medium",
          timeframe: "short-term"
        });
      }
      
      // Add recommendation for transferable skills
      const transferableSkills = currentRoleSkillNames.filter(skill => !targetRoleSkillNames.includes(skill));
      
      if (transferableSkills.length > 0) {
        recommendations.push({
          title: "Leverage your transferable skills",
          description: "Highlight how your existing skills can be applied to your target role",
          priority: "medium",
          timeframe: "immediate"
        });
      }
      
      // Extract skills from job listings if target role skills are limited
      if (targetRoleSkillNames.length < 5 && jobs.length > 0) {
        const jobSkills = this.extractSkillsFromJobs(jobs);
        const additionalSkills = jobSkills.filter(skill => 
          !targetRoleSkillNames.includes(skill.toLowerCase()) && 
          !existingSkills.includes(skill.toLowerCase())
        ).slice(0, 3);
        
        if (additionalSkills.length > 0) {
          recommendations.push({
            title: "Develop additional market-relevant skills",
            description: `Consider learning these skills based on job market demand: ${additionalSkills.join(', ')}`,
            priority: "medium",
            timeframe: "short-term"
          });
        }
      }
      
      // Add general skill development strategy
      recommendations.push({
        title: "Create a skill development roadmap",
        description: "Plan a structured approach to acquire and demonstrate new skills",
        priority: "medium",
        timeframe: "immediate",
        resources: [
          {
            title: "LinkedIn Learning",
            url: "https://www.linkedin.com/learning/",
            type: "course"
          },
          {
            title: "Coursera",
            url: "https://www.coursera.org/",
            type: "course"
          },
          {
            title: "Udemy",
            url: "https://www.udemy.com/",
            type: "course"
          }
        ]
      });
      
      return recommendations;
    } catch (error) {
      console.error(`[ReadinessScoreService] Error generating skill recommendations: ${(error as Error).message}`);
      
      // Return default skill recommendations
      return [
        {
          title: "Develop core technical skills",
          description: "Focus on acquiring the fundamental technical skills for your target role",
          priority: "high",
          timeframe: "immediate"
        },
        {
          title: "Create a learning plan",
          description: "Develop a structured approach to skill acquisition with clear milestones",
          priority: "medium",
          timeframe: "immediate"
        }
      ];
    }
  }

  /**
   * Generate market positioning recommendations
   * @param transition Career transition
   * @param jobs Array of job listings
   * @param insights Career transition insights
   * @returns Market positioning recommendations
   */
  private generateMarketPositioningRecommendations(
    transition: any,
    jobs: any[],
    insights: any[]
  ): RecommendationItem[] {
    try {
      const recommendations: RecommendationItem[] = [];
      
      // Recommendation for resume and profile optimization
      recommendations.push({
        title: "Optimize your resume and online profiles",
        description: `Update your professional materials to align with your target role as a ${transition.targetRole}`,
        priority: "high",
        timeframe: "immediate",
        resources: [
          {
            title: "LinkedIn Profile Optimization",
            url: "https://www.linkedin.com/learning/learning-linkedin-2",
            type: "course"
          }
        ]
      });
      
      // Recommendation for portfolio development
      recommendations.push({
        title: "Develop a role-specific portfolio",
        description: "Create demonstrations of your relevant skills and projects",
        priority: "medium",
        timeframe: "short-term"
      });
      
      // Recommendation based on market insights
      const marketInsights = insights.filter(i => 
        i.category === 'market_trend' || 
        i.category === 'industry_trend'
      );
      
      if (marketInsights.length > 0) {
        // Extract key trends
        const trendKeywords = this.extractKeyTerms(marketInsights);
        
        if (trendKeywords.length > 0) {
          recommendations.push({
            title: "Align your brand with industry trends",
            description: `Emphasize your familiarity with current trends like ${trendKeywords.slice(0, 3).join(', ')}`,
            priority: "medium",
            timeframe: "short-term"
          });
        }
      }
      
      // Recommendation for interview preparation
      recommendations.push({
        title: "Prepare role-specific interview materials",
        description: "Research common interview questions and develop compelling responses",
        priority: "medium",
        timeframe: "short-term",
        resources: [
          {
            title: "Glassdoor Interview Questions",
            url: "https://www.glassdoor.com/Interview/",
            type: "article"
          }
        ]
      });
      
      // Recommendation for networking strategy
      recommendations.push({
        title: "Develop a targeted networking strategy",
        description: "Identify and connect with professionals and organizations in your target field",
        priority: "medium",
        timeframe: "ongoing"
      });
      
      return recommendations;
    } catch (error) {
      console.error(`[ReadinessScoreService] Error generating market recommendations: ${(error as Error).message}`);
      
      // Return default market recommendations
      return [
        {
          title: "Update your professional profiles",
          description: "Align your resume and online profiles with your target role",
          priority: "high",
          timeframe: "immediate"
        },
        {
          title: "Research target companies",
          description: "Identify and research companies that offer your target role",
          priority: "medium",
          timeframe: "short-term"
        }
      ];
    }
  }

  /**
   * Generate education path recommendations
   * @param transition Career transition
   * @param insights Career transition insights
   * @param targetRoleSkills Skills for target role
   * @returns Education path recommendations
   */
  private generateEducationPathRecommendations(
    transition: any,
    insights: any[],
    targetRoleSkills: any[]
  ): RecommendationItem[] {
    try {
      const recommendations: RecommendationItem[] = [];
      
      // Filter for education-related insights
      const educationInsights = insights.filter(i => 
        i.category === 'education' || 
        i.category === 'certification' ||
        i.category === 'training'
      );
      
      // Recommendation for certifications
      const certificationInsights = educationInsights.filter(i => 
        i.content.toLowerCase().includes('certification') ||
        i.content.toLowerCase().includes('certificate')
      );
      
      if (certificationInsights.length > 0) {
        // Extract specific certification names
        const certNames = this.extractSpecificTerms(
          certificationInsights, 
          ['certification', 'certificate', 'certified']
        );
        
        if (certNames.length > 0) {
          recommendations.push({
            title: "Pursue relevant certifications",
            description: `Consider obtaining these certifications: ${certNames.slice(0, 3).join(', ')}`,
            priority: "high",
            timeframe: "short-term"
          });
        } else {
          recommendations.push({
            title: "Research industry certifications",
            description: "Identify certifications that will validate your skills for this role",
            priority: "medium",
            timeframe: "short-term"
          });
        }
      }
      
      // Recommendation for formal education
      const degreeInsights = educationInsights.filter(i => 
        i.content.toLowerCase().includes('degree') ||
        i.content.toLowerCase().includes('bachelor') ||
        i.content.toLowerCase().includes('master') ||
        i.content.toLowerCase().includes('phd')
      );
      
      if (degreeInsights.length > 0) {
        recommendations.push({
          title: "Consider formal education options",
          description: "Evaluate if a degree program would enhance your transition prospects",
          priority: "medium",
          timeframe: "long-term"
        });
      }
      
      // Recommendation for online courses
      recommendations.push({
        title: "Take targeted online courses",
        description: "Enroll in courses specifically designed for your target role",
        priority: "high",
        timeframe: "immediate",
        resources: [
          {
            title: "Coursera",
            url: "https://www.coursera.org/",
            type: "course"
          },
          {
            title: "edX",
            url: "https://www.edx.org/",
            type: "course"
          },
          {
            title: "Udemy",
            url: "https://www.udemy.com/",
            type: "course"
          }
        ]
      });
      
      // Recommendation for bootcamps if appropriate
      const bootcampInsights = educationInsights.filter(i => 
        i.content.toLowerCase().includes('bootcamp') ||
        i.content.toLowerCase().includes('intensive') ||
        i.content.toLowerCase().includes('immersive')
      );
      
      if (bootcampInsights.length > 0) {
        recommendations.push({
          title: "Consider intensive bootcamp programs",
          description: "Accelerate your skill development with a focused bootcamp program",
          priority: "medium",
          timeframe: "short-term"
        });
      }
      
      // Add recommendation for continuous learning
      recommendations.push({
        title: "Commit to continuous learning",
        description: "Stay current with industry developments through ongoing education",
        priority: "medium",
        timeframe: "ongoing"
      });
      
      return recommendations;
    } catch (error) {
      console.error(`[ReadinessScoreService] Error generating education recommendations: ${(error as Error).message}`);
      
      // Return default education recommendations
      return [
        {
          title: "Research relevant certifications",
          description: "Identify industry-recognized certifications that validate your skills",
          priority: "high",
          timeframe: "immediate"
        },
        {
          title: "Explore online learning platforms",
          description: "Find courses that teach the specific skills needed for your target role",
          priority: "medium",
          timeframe: "immediate"
        }
      ];
    }
  }

  /**
   * Generate experience building recommendations
   * @param transition Career transition
   * @param insights Career transition insights
   * @param jobs Array of job listings
   * @returns Experience building recommendations
   */
  private generateExperienceBuildingRecommendations(
    transition: any,
    insights: any[],
    jobs: any[]
  ): RecommendationItem[] {
    try {
      const recommendations: RecommendationItem[] = [];
      
      // Recommendation for projects
      recommendations.push({
        title: "Develop portfolio projects",
        description: "Create tangible demonstrations of your skills through relevant projects",
        priority: "high",
        timeframe: "immediate"
      });
      
      // Recommendation for volunteering
      recommendations.push({
        title: "Seek volunteer opportunities",
        description: "Offer your skills to non-profits or open-source projects to gain experience",
        priority: "medium",
        timeframe: "short-term"
      });
      
      // Recommendation for job shadowing or informational interviews
      recommendations.push({
        title: "Arrange job shadowing experiences",
        description: "Connect with professionals in your target role to observe their work",
        priority: "medium",
        timeframe: "short-term"
      });
      
      // Recommendation for freelancing or consulting
      recommendations.push({
        title: "Consider freelance opportunities",
        description: "Take on freelance projects to build practical experience and client references",
        priority: "medium",
        timeframe: "short-term",
        resources: [
          {
            title: "Upwork",
            url: "https://www.upwork.com/",
            type: "community"
          },
          {
            title: "Fiverr",
            url: "https://www.fiverr.com/",
            type: "community"
          }
        ]
      });
      
      // Recommendation for internships or apprenticeships if appropriate
      recommendations.push({
        title: "Explore internship or apprenticeship programs",
        description: "Consider structured programs designed to help career changers",
        priority: "medium",
        timeframe: "short-term"
      });
      
      return recommendations;
    } catch (error) {
      console.error(`[ReadinessScoreService] Error generating experience recommendations: ${(error as Error).message}`);
      
      // Return default experience recommendations
      return [
        {
          title: "Create portfolio projects",
          description: "Develop projects that demonstrate your skills for your target role",
          priority: "high",
          timeframe: "immediate"
        },
        {
          title: "Volunteer your skills",
          description: "Offer your services to non-profits or open-source projects",
          priority: "medium",
          timeframe: "short-term"
        }
      ];
    }
  }

  /**
   * Generate networking recommendations
   * @param transition Career transition
   * @param insights Career transition insights
   * @returns Networking recommendations
   */
  private generateNetworkingRecommendations(
    transition: any,
    insights: any[]
  ): RecommendationItem[] {
    try {
      const recommendations: RecommendationItem[] = [];
      
      // Recommendation for professional associations
      recommendations.push({
        title: "Join professional associations",
        description: "Become a member of industry groups relevant to your target role",
        priority: "medium",
        timeframe: "immediate"
      });
      
      // Recommendation for online communities
      recommendations.push({
        title: "Participate in online communities",
        description: "Engage with professionals in forums, social media groups, and discussion boards",
        priority: "medium",
        timeframe: "immediate",
        resources: [
          {
            title: "LinkedIn Groups",
            url: "https://www.linkedin.com/groups/",
            type: "community"
          },
          {
            title: "Reddit Professional Communities",
            url: "https://www.reddit.com/",
            type: "community"
          }
        ]
      });
      
      // Recommendation for industry events
      recommendations.push({
        title: "Attend industry events and conferences",
        description: "Participate in relevant events to learn and connect with professionals",
        priority: "medium",
        timeframe: "ongoing",
        resources: [
          {
            title: "Meetup",
            url: "https://www.meetup.com/",
            type: "community"
          },
          {
            title: "Eventbrite",
            url: "https://www.eventbrite.com/",
            type: "community"
          }
        ]
      });
      
      // Recommendation for informational interviews
      recommendations.push({
        title: "Conduct informational interviews",
        description: "Reach out to professionals in your target role for career conversations",
        priority: "high",
        timeframe: "immediate"
      });
      
      // Recommendation for mentorship
      recommendations.push({
        title: "Seek mentorship opportunities",
        description: "Find experienced professionals who can guide your transition",
        priority: "high",
        timeframe: "short-term"
      });
      
      return recommendations;
    } catch (error) {
      console.error(`[ReadinessScoreService] Error generating networking recommendations: ${(error as Error).message}`);
      
      // Return default networking recommendations
      return [
        {
          title: "Join industry communities",
          description: "Connect with professionals in online groups and forums",
          priority: "high",
          timeframe: "immediate"
        },
        {
          title: "Attend networking events",
          description: "Participate in relevant industry meetups and conferences",
          priority: "medium",
          timeframe: "ongoing"
        }
      ];
    }
  }

  /**
   * Generate next steps recommendations
   * @param skillRecs Skill development recommendations
   * @param marketRecs Market positioning recommendations
   * @param educationRecs Education path recommendations
   * @param experienceRecs Experience building recommendations
   * @returns Next steps recommendations
   */
  private generateNextStepsRecommendations(
    skillRecs: RecommendationItem[],
    marketRecs: RecommendationItem[],
    educationRecs: RecommendationItem[],
    experienceRecs: RecommendationItem[]
  ): RecommendationItem[] {
    try {
      const recommendations: RecommendationItem[] = [];
      
      // Collect high priority items from other categories
      const highPriorityItems = [
        ...skillRecs,
        ...marketRecs,
        ...educationRecs,
        ...experienceRecs
      ].filter(rec => rec.priority === 'high' && rec.timeframe === 'immediate')
      .slice(0, 3);
      
      if (highPriorityItems.length > 0) {
        const itemTitles = highPriorityItems.map(item => item.title);
        
        recommendations.push({
          title: "Focus on high-impact immediate actions",
          description: `Prioritize these critical steps: ${itemTitles.join('; ')}`,
          priority: "high",
          timeframe: "immediate"
        });
      }
      
      // Add recommendation for creating a transition plan
      recommendations.push({
        title: "Create a comprehensive transition plan",
        description: "Develop a timeline with specific goals, actions, and deadlines",
        priority: "high",
        timeframe: "immediate"
      });
      
      // Add recommendation for tracking progress
      recommendations.push({
        title: "Establish progress tracking measures",
        description: "Set up a system to monitor your advancement toward your career transition",
        priority: "medium",
        timeframe: "immediate"
      });
      
      // Add recommendation for regular assessment
      recommendations.push({
        title: "Schedule regular self-assessments",
        description: "Plan to review your progress and readiness score every 2-3 months",
        priority: "medium",
        timeframe: "ongoing"
      });
      
      // Add recommendation for feedback
      recommendations.push({
        title: "Seek ongoing feedback",
        description: "Regularly consult with mentors and peers to refine your approach",
        priority: "medium",
        timeframe: "ongoing"
      });
      
      return recommendations;
    } catch (error) {
      console.error(`[ReadinessScoreService] Error generating next steps: ${(error as Error).message}`);
      
      // Return default next steps recommendations
      return [
        {
          title: "Create a transition plan",
          description: "Develop a structured timeline with specific milestones",
          priority: "high",
          timeframe: "immediate"
        },
        {
          title: "Set measurable goals",
          description: "Define clear, achievable objectives for your career transition",
          priority: "high",
          timeframe: "immediate"
        }
      ];
    }
  }

  /**
   * Extract skills from job listings
   * @param jobs Array of job listings
   * @returns Array of extracted skills
   */
  private extractSkillsFromJobs(jobs: any[]): string[] {
    try {
      const skills: string[] = [];
      
      // Extract skills from AI-processed job fields
      jobs.forEach(job => {
        if (job.ai_required_skills && Array.isArray(job.ai_required_skills)) {
          skills.push(...job.ai_required_skills);
        }
        
        if (job.ai_preferred_skills && Array.isArray(job.ai_preferred_skills)) {
          skills.push(...job.ai_preferred_skills);
        }
      });
      
      // Remove duplicates and return
      return [...new Set(skills)];
    } catch (error) {
      console.error(`[ReadinessScoreService] Error extracting skills: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Extract key terms from insights
   * @param insights Array of insights
   * @returns Array of extracted key terms
   */
  private extractKeyTerms(insights: any[]): string[] {
    try {
      const terms: string[] = [];
      
      // Extract potentially important terms
      insights.forEach(insight => {
        if (insight.content) {
          // Split by common separators and filter for longer terms
          const contentTerms = insight.content
            .split(/[\s,.;:!?()[\]{}'"\/\\<>-]+/)
            .filter((term: string) => term.length > 4)
            .map((term: string) => term.trim());
          
          terms.push(...contentTerms);
        }
      });
      
      // Count frequency
      const termCount = terms.reduce((acc: Record<string, number>, term: string) => {
        const lowerTerm = term.toLowerCase();
        acc[lowerTerm] = (acc[lowerTerm] || 0) + 1;
        return acc;
      }, {});
      
      // Sort by frequency and return top terms
      return Object.entries(termCount)
        .sort((a, b) => b[1] - a[1])
        .map(([term]) => term)
        .slice(0, 10);
    } catch (error) {
      console.error(`[ReadinessScoreService] Error extracting terms: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Extract specific terms from insights that match certain keywords
   * @param insights Array of insights
   * @param keywords Keywords to look for
   * @returns Array of extracted specific terms
   */
  private extractSpecificTerms(insights: any[], keywords: string[]): string[] {
    try {
      const terms: string[] = [];
      
      // Process each insight
      insights.forEach(insight => {
        if (insight.content) {
          const content = insight.content.toLowerCase();
          
          // Check for each keyword
          keywords.forEach(keyword => {
            const keywordIndex = content.indexOf(keyword.toLowerCase());
            
            if (keywordIndex >= 0) {
              // Extract the full phrase containing the keyword
              const start = Math.max(0, content.lastIndexOf('.', keywordIndex) + 1);
              const end = content.indexOf('.', keywordIndex + keyword.length);
              const phrase = content.substring(
                start,
                end > keywordIndex ? end : content.length
              ).trim();
              
              // Add the phrase if it's not too long
              if (phrase.length > 0 && phrase.length < 100) {
                terms.push(phrase);
              }
            }
          });
        }
      });
      
      // Remove duplicates
      return [...new Set(terms)];
    } catch (error) {
      console.error(`[ReadinessScoreService] Error extracting specific terms: ${(error as Error).message}`);
      return [];
    }
  }
}