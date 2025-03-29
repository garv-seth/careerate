import { ActiveJobsService } from './activeJobsService';
import { SCORING_WEIGHTS } from './config';
import { db } from '../../db';
import { 
  insertReadinessScoreSchema, 
  readinessScores, 
  transitions, 
  skillGaps,
  scrapedData
} from '../../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { ReadinessScore, ReadinessRecommendations } from '../../../client/src/types';

/**
 * Service for calculating readiness scores for career transitions
 */
export class ReadinessScoreService {
  private activeJobsService: ActiveJobsService;

  constructor() {
    this.activeJobsService = new ActiveJobsService();
  }

  /**
   * Generate a readiness score for a career transition
   * @param transitionId Transition ID
   */
  async generateReadinessScore(transitionId: number): Promise<ReadinessScore> {
    try {
      console.log(`Generating readiness score for transition ${transitionId}`);
      
      // Fetch transition data
      const transition = await db.query.transitions.findFirst({
        where: eq(transitions.id, transitionId)
      });
      
      if (!transition) {
        throw new Error(`Transition with ID ${transitionId} not found`);
      }
      
      // Fetch skill gaps for this transition
      const transitionSkillGaps = await db.query.skillGaps.findMany({
        where: eq(skillGaps.transitionId, transitionId),
      });
      
      // Fetch insights and scraped data for context
      const transitionData = await db.query.scrapedData.findMany({
        where: eq(scrapedData.transitionId, transitionId)
      });
      
      // Calculate individual scores
      const marketDemandScore = await this.calculateMarketDemandScore(transition.currentRole, transition.targetRole);
      const skillGapScore = this.calculateSkillGapScore(transitionSkillGaps);
      const educationPathScore = this.calculateEducationPathScore(transition.targetRole, transitionSkillGaps);
      const industryTrendScore = this.calculateIndustryTrendScore(transition.targetRole);
      const geographicalFactorScore = this.calculateGeographicalFactorScore(transition.targetRole);
      
      // Calculate overall score with weighted average
      const overallScore = Math.round(
        (marketDemandScore * SCORING_WEIGHTS.MARKET_DEMAND) +
        (skillGapScore * SCORING_WEIGHTS.SKILL_GAP) +
        (educationPathScore * SCORING_WEIGHTS.EDUCATION_PATH) +
        (industryTrendScore * SCORING_WEIGHTS.INDUSTRY_TREND) +
        (geographicalFactorScore * SCORING_WEIGHTS.GEOGRAPHICAL_FACTOR)
      );
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        transition.currentRole,
        transition.targetRole,
        transitionSkillGaps,
        {
          marketDemandScore,
          skillGapScore,
          educationPathScore,
          industryTrendScore,
          geographicalFactorScore
        }
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
        recommendations,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Store the readiness score in the database
      await this.saveReadinessScore(readinessScore);
      
      return readinessScore;
    } catch (error) {
      console.error(`Error generating readiness score for transition ${transitionId}:`, error);
      // Return a default readiness score to prevent the frontend from breaking
      return {
        transitionId,
        overallScore: 65,  // A moderate default score
        marketDemandScore: 65,
        skillGapScore: 65,
        educationPathScore: 65, 
        industryTrendScore: 65,
        geographicalFactorScore: 65,
        recommendations: {
          skillDevelopment: [
            {
              title: "Unable to generate specific recommendations",
              description: "We encountered an issue while analyzing your transition. Please try again later.",
              priority: "medium" as const,
              timeframe: "short-term" as const
            }
          ],
          marketPositioning: [],
          educationPaths: [],
          experienceBuilding: [],
          networkingOpportunities: [],
          nextSteps: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get the readiness score for a transition
   * @param transitionId Transition ID
   * @returns Readiness score or null if not found
   */
  async getReadinessScore(transitionId: number): Promise<ReadinessScore | null> {
    try {
      // Check if the table exists before querying
      const score = await db.query.readinessScores.findFirst({
        where: eq(readinessScores.transitionId, transitionId),
        orderBy: (fields, { desc }) => [desc(fields.updatedAt)]
      });
      
      if (!score) {
        return null;
      }
      
      return {
        id: score.id,
        transitionId: score.transitionId,
        overallScore: Number(score.overallScore),
        marketDemandScore: Number(score.marketDemandScore),
        skillGapScore: Number(score.skillGapScore),
        educationPathScore: Number(score.educationPathScore),
        industryTrendScore: Number(score.industryTrendScore),
        geographicalFactorScore: Number(score.geographicalFactorScore),
        recommendations: score.recommendations as ReadinessRecommendations,
        createdAt: score.createdAt ? score.createdAt.toISOString() : undefined,
        updatedAt: score.updatedAt ? score.updatedAt.toISOString() : undefined
      };
    } catch (error) {
      console.error("Error retrieving readiness score:", error);
      return null; // Return null on error so dashboard won't break
    }
  }
  
  /**
   * Save a readiness score to the database
   * @param score Readiness score to save
   */
  private async saveReadinessScore(score: ReadinessScore): Promise<void> {
    try {
      // Check if an existing score exists
      const existingScore = await db.query.readinessScores.findFirst({
        where: eq(readinessScores.transitionId, score.transitionId)
      });
      
      if (existingScore) {
        // Update the existing score
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
          .where(eq(readinessScores.id, existingScore.id));
      } else {
        // Insert a new score
        await db.insert(readinessScores).values({
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
      }
    } catch (error) {
      console.error("Error saving readiness score:", error);
      // Continue execution instead of throwing, so the front-end still gets a response
    }
  }
  
  /**
   * Calculate market demand score based on job market data
   * @param currentRole Current role
   * @param targetRole Target role
   * @returns Market demand score (0-100)
   */
  private async calculateMarketDemandScore(currentRole: string, targetRole: string): Promise<number> {
    try {
      // Get job market data from ActiveJobsService
      const jobsData = await this.activeJobsService.searchCareerTransitionJobs(currentRole, targetRole, 10);
      
      if (!jobsData || jobsData.length === 0) {
        // If we couldn't get job data, return a moderate score
        return 50;
      }
      
      // Calculate demand score based on number of jobs, salary data, etc.
      const numberOfJobs = jobsData.length;
      let salaryScore = 0;
      let benefitsScore = 0;
      let remoteWorkScore = 0;
      
      // Calculate salary score
      const salaryData = jobsData
        .filter(job => job.salary && job.salary.min && job.salary.max)
        .map(job => ({
          min: parseFloat(String(job.salary.min)),
          max: parseFloat(String(job.salary.max))
        }));
      
      if (salaryData.length > 0) {
        const avgSalary = salaryData.reduce((sum, curr) => sum + (curr.min + curr.max) / 2, 0) / salaryData.length;
        // Score based on average salary (adjust thresholds as needed)
        if (avgSalary > 150000) salaryScore = 100;
        else if (avgSalary > 120000) salaryScore = 90;
        else if (avgSalary > 100000) salaryScore = 80;
        else if (avgSalary > 80000) salaryScore = 70;
        else if (avgSalary > 60000) salaryScore = 60;
        else salaryScore = 50;
      }
      
      // Calculate benefits score based on benefits mentioned
      const benefitsMentioned = jobsData.filter(job => {
        const description = job.description?.toLowerCase() || '';
        return (
          description.includes('health insurance') ||
          description.includes('401k') ||
          description.includes('retirement') ||
          description.includes('paid time off') ||
          description.includes('pto') ||
          description.includes('vacation') ||
          description.includes('benefits package')
        );
      }).length;
      
      benefitsScore = Math.min(100, Math.round((benefitsMentioned / jobsData.length) * 100));
      
      // Calculate remote work score
      const remoteJobs = jobsData.filter(job => job.remote === true).length;
      remoteWorkScore = Math.min(100, Math.round((remoteJobs / jobsData.length) * 100));
      
      // Job quantity score (adjusted for max 10 jobs)
      const jobQuantityScore = Math.min(100, numberOfJobs * 10);
      
      // Weight the different factors for final market demand score
      const marketDemandScore = Math.round(
        jobQuantityScore * 0.5 +
        salaryScore * 0.3 +
        benefitsScore * 0.1 +
        remoteWorkScore * 0.1
      );
      
      return marketDemandScore;
    } catch (error) {
      console.error('Error calculating market demand score:', error);
      return 50; // Default moderate score
    }
  }
  
  /**
   * Calculate skill gap score based on identified skill gaps
   * @param skillGapsData Skill gaps data
   * @returns Skill gap score (0-100)
   */
  private calculateSkillGapScore(skillGapsData: typeof skillGaps.$inferSelect[]): number {
    if (!skillGapsData || skillGapsData.length === 0) {
      return 50; // Default moderate score if no skill gap data
    }
    
    // Count skill gaps by level
    const highGaps = skillGapsData.filter(gap => gap.gapLevel === 'High').length;
    const mediumGaps = skillGapsData.filter(gap => gap.gapLevel === 'Medium').length;
    const lowGaps = skillGapsData.filter(gap => gap.gapLevel === 'Low').length;
    
    // Weight by gap level
    const weightedGapScore = (
      (highGaps * 3) +
      (mediumGaps * 2) +
      (lowGaps * 1)
    );
    
    // Calculate total skills
    const totalSkills = skillGapsData.length;
    
    // Calculate maximum possible gap score (if all gaps were high)
    const maxGapScore = totalSkills * 3;
    
    // Calculate inverse percentage (lower gap = higher score)
    const inverseGapPercentage = maxGapScore > 0
      ? 100 - Math.min(100, Math.round((weightedGapScore / maxGapScore) * 100))
      : 50;
    
    // Adjust for very few skills identified
    if (totalSkills < 3) {
      return Math.min(inverseGapPercentage, 70); // Cap at 70 if very few skills
    }
    
    return inverseGapPercentage;
  }
  
  /**
   * Calculate education path score based on learning resources
   * @param targetRole Target role
   * @param skillGapsData Skill gaps data
   * @returns Education path score (0-100)
   */
  private calculateEducationPathScore(targetRole: string, skillGapsData: typeof skillGaps.$inferSelect[]): number {
    // This would ideally use real education resource data
    // For now, we'll use a synthetic approach
    
    // Extract skills that need development
    const skillsToLearn = skillGapsData
      .filter(gap => gap.gapLevel === 'High' || gap.gapLevel === 'Medium')
      .map(gap => gap.skillName);
    
    // Map common roles to education path scores
    const roleEducationScores: Record<string, number> = {
      'software engineer': 85,
      'software developer': 85,
      'web developer': 90,
      'frontend developer': 85,
      'backend developer': 80,
      'fullstack developer': 85,
      'data scientist': 75,
      'data analyst': 80,
      'data engineer': 75,
      'machine learning engineer': 70,
      'devops engineer': 75,
      'cloud engineer': 75,
      'product manager': 80,
      'project manager': 85,
      'ux designer': 80,
      'ui designer': 85,
      'graphic designer': 85,
      'content writer': 90,
      'digital marketer': 85,
      'marketing manager': 80,
      'sales representative': 90,
      'account manager': 85,
      'business analyst': 80,
      'financial analyst': 75,
      'accountant': 85
    };
    
    // Default score based on target role
    let baseScore = 75; // Default moderate-high score
    
    // Check if we have a predefined score for this role
    const roleLowerCase = targetRole.toLowerCase();
    for (const [role, score] of Object.entries(roleEducationScores)) {
      if (roleLowerCase.includes(role)) {
        baseScore = score;
        break;
      }
    }
    
    // Adjust score based on number of skills to learn
    if (skillsToLearn.length > 10) {
      // Many skills to learn, reduce score
      baseScore = Math.max(50, baseScore - 20);
    } else if (skillsToLearn.length > 5) {
      // Moderate skills to learn, reduce score slightly
      baseScore = Math.max(60, baseScore - 10);
    } else if (skillsToLearn.length === 0) {
      // No skills to learn, increase score
      baseScore = Math.min(95, baseScore + 10);
    }
    
    return baseScore;
  }
  
  /**
   * Calculate industry trend score based on growth and future outlook
   * @param targetRole Target role
   * @returns Industry trend score (0-100)
   */
  private calculateIndustryTrendScore(targetRole: string): number {
    // This would ideally use real industry trend data
    // For now, we'll use a synthetic approach based on common roles and their growth
    
    const roleTrendScores: Record<string, number> = {
      // High growth roles
      'data scientist': 90,
      'machine learning': 95,
      'ai engineer': 95,
      'blockchain': 85,
      'cloud architect': 90,
      'devops': 85,
      'security': 90,
      'cybersecurity': 90,
      'full stack': 85,
      'mobile developer': 80,
      
      // Moderate growth roles
      'software engineer': 80,
      'software developer': 80,
      'web developer': 80,
      'frontend': 80,
      'backend': 75,
      'product manager': 80,
      'ux designer': 75,
      'ui designer': 75,
      
      // Stable roles
      'system administrator': 70,
      'database administrator': 70,
      'it support': 65,
      'qa engineer': 70,
      'quality assurance': 70,
      'project manager': 75,
      
      // Lower growth roles (still in demand)
      'helpdesk': 60,
      'desktop support': 60,
      'manual tester': 60
    };
    
    // Default moderate score
    let trendScore = 70;
    
    // Check if the target role matches any of our defined roles
    const roleLowerCase = targetRole.toLowerCase();
    for (const [role, score] of Object.entries(roleTrendScores)) {
      if (roleLowerCase.includes(role)) {
        // Take the highest matching score
        trendScore = Math.max(trendScore, score);
      }
    }
    
    return trendScore;
  }
  
  /**
   * Calculate geographical factor score based on location flexibility
   * @param targetRole Target role
   * @returns Geographical factor score (0-100)
   */
  private calculateGeographicalFactorScore(targetRole: string): number {
    // This would ideally use real geographical data
    // For now, we'll use a synthetic approach based on remote work trends
    
    const remoteWorkScores: Record<string, number> = {
      // Highly remote-friendly roles
      'software engineer': 90,
      'software developer': 90,
      'web developer': 95,
      'frontend': 95,
      'backend': 95,
      'full stack': 95,
      'data scientist': 85,
      'data analyst': 85,
      'content writer': 95,
      'digital marketer': 90,
      'seo specialist': 95,
      'copywriter': 95,
      'ux designer': 90,
      'ui designer': 90,
      'graphic designer': 90,
      'product manager': 85,
      'project manager': 85,
      
      // Moderately remote-friendly roles
      'devops': 80,
      'system administrator': 80,
      'database administrator': 80,
      'qa engineer': 85,
      'quality assurance': 85,
      'business analyst': 80,
      'financial analyst': 75,
      'sales representative': 75,
      'account manager': 75,
      
      // Less remote-friendly roles
      'hardware engineer': 60,
      'network administrator': 70,
      'it support': 75,
      'helpdesk': 75
    };
    
    // Default moderate score
    let remoteScore = 75;
    
    // Check if the target role matches any of our defined roles
    const roleLowerCase = targetRole.toLowerCase();
    for (const [role, score] of Object.entries(remoteWorkScores)) {
      if (roleLowerCase.includes(role)) {
        // Take the highest matching score
        remoteScore = Math.max(remoteScore, score);
      }
    }
    
    return remoteScore;
  }
  
  /**
   * Generate comprehensive recommendations for the career transition
   * @param currentRole Current role
   * @param targetRole Target role
   * @param skillGapsData Skill gaps data
   * @param scores Individual component scores
   * @returns Comprehensive recommendations
   */
  private async generateRecommendations(
    currentRole: string,
    targetRole: string,
    skillGapsData: typeof skillGaps.$inferSelect[],
    scores: {
      marketDemandScore: number;
      skillGapScore: number;
      educationPathScore: number;
      industryTrendScore: number;
      geographicalFactorScore: number;
    }
  ): Promise<ReadinessRecommendations> {
    // Generate skill development recommendations
    const skillDevelopment = this.generateSkillDevelopmentRecommendations(skillGapsData, targetRole);
    
    // Generate market positioning recommendations
    const marketPositioning = this.generateMarketPositioningRecommendations(
      currentRole,
      targetRole,
      scores.marketDemandScore,
      scores.skillGapScore
    );
    
    // Generate education path recommendations
    const educationPaths = this.generateEducationPathRecommendations(
      targetRole,
      skillGapsData,
      scores.educationPathScore
    );
    
    // Generate experience building recommendations
    const experienceBuilding = this.generateExperienceBuildingRecommendations(
      currentRole,
      targetRole,
      skillGapsData
    );
    
    // Generate networking opportunities recommendations
    const networkingOpportunities = this.generateNetworkingRecommendations(targetRole);
    
    // Generate next steps recommendations
    const nextSteps = this.generateNextStepsRecommendations(
      scores,
      skillGapsData.length
    );
    
    return {
      skillDevelopment,
      marketPositioning,
      educationPaths,
      experienceBuilding,
      networkingOpportunities,
      nextSteps
    };
  }
  
  /**
   * Generate skill development recommendations
   * @param skillGapsData Skill gaps data
   * @param targetRole Target role
   * @returns Skill development recommendations
   */
  private generateSkillDevelopmentRecommendations(
    skillGapsData: typeof skillGaps.$inferSelect[],
    targetRole: string
  ) {
    const recommendations = [];
    
    // Focus on high priority skill gaps
    const highPriorityGaps = skillGapsData.filter(gap => gap.gapLevel === 'High');
    if (highPriorityGaps.length > 0) {
      const topSkills = highPriorityGaps.slice(0, 3).map(gap => gap.skillName).join(', ');
      
      recommendations.push({
        title: 'Close Critical Skill Gaps',
        description: `Focus on developing these high-priority skills: ${topSkills}. These are the most significant barriers to your transition.`,
        priority: 'high' as const,
        timeframe: 'immediate' as const,
        resources: [
          {
            title: 'Udemy Courses',
            url: `https://www.udemy.com/courses/search/?src=ukw&q=${encodeURIComponent(topSkills)}`,
            type: 'course' as const
          },
          {
            title: 'LinkedIn Learning',
            url: `https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(topSkills)}`,
            type: 'course' as const
          }
        ]
      });
    }
    
    // Medium priority skill gaps
    const mediumPriorityGaps = skillGapsData.filter(gap => gap.gapLevel === 'Medium');
    if (mediumPriorityGaps.length > 0) {
      const mediumSkills = mediumPriorityGaps.slice(0, 4).map(gap => gap.skillName).join(', ');
      
      recommendations.push({
        title: 'Strengthen Secondary Skills',
        description: `Develop these medium-priority skills to boost your marketability: ${mediumSkills}.`,
        priority: 'medium' as const,
        timeframe: 'short-term' as const,
        resources: [
          {
            title: 'Coursera Specializations',
            url: `https://www.coursera.org/search?query=${encodeURIComponent(mediumSkills)}`,
            type: 'course' as const
          },
          {
            title: 'YouTube Tutorials',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${mediumSkills} tutorial`)}`,
            type: 'video' as const
          }
        ]
      });
    }
    
    // Recommend practical skill application
    recommendations.push({
      title: 'Build a Portfolio of Projects',
      description: `Create practical ${targetRole} projects that showcase your new skills in action.`,
      priority: 'high' as const,
      timeframe: 'long-term' as const,
      resources: [
        {
          title: 'GitHub Project Ideas',
          url: `https://github.com/search?q=${encodeURIComponent(`${targetRole} projects`)}`,
          type: 'tool' as const
        },
        {
          title: 'Project-Based Courses',
          url: `https://www.codecademy.com/search?query=${encodeURIComponent(targetRole)}`,
          type: 'course' as const
        }
      ]
    });
    
    // Target role specific certification
    recommendations.push({
      title: 'Pursue Relevant Certifications',
      description: `Research and obtain certifications that are valued for ${targetRole} positions.`,
      priority: 'medium' as const,
      timeframe: 'short-term' as const,
      resources: [
        {
          title: 'Industry Certifications',
          url: `https://www.google.com/search?q=${encodeURIComponent(`best certifications for ${targetRole}`)}`,
          type: 'article' as const
        }
      ]
    });
    
    return recommendations;
  }
  
  /**
   * Generate market positioning recommendations
   * @param currentRole Current role
   * @param targetRole Target role
   * @param marketDemandScore Market demand score
   * @param skillGapScore Skill gap score
   * @returns Market positioning recommendations
   */
  private generateMarketPositioningRecommendations(
    currentRole: string,
    targetRole: string,
    marketDemandScore: number,
    skillGapScore: number
  ) {
    const recommendations = [];
    
    // Resume optimization
    recommendations.push({
      title: 'Optimize Your Resume for ATS',
      description: `Tailor your resume to highlight transferable skills from ${currentRole} that apply to ${targetRole} positions.`,
      priority: 'high' as const,
      timeframe: 'immediate' as const,
      resources: [
        {
          title: 'Resume ATS Checker',
          url: 'https://www.jobscan.co/',
          type: 'tool' as const
        },
        {
          title: 'Resume Templates',
          url: 'https://www.resumebuilder.com/',
          type: 'tool' as const
        }
      ]
    });
    
    // LinkedIn profile optimization
    recommendations.push({
      title: 'Optimize Your LinkedIn Profile',
      description: `Update your LinkedIn profile to reflect your career transition goals, highlighting relevant skills for ${targetRole}.`,
      priority: 'high' as const,
      timeframe: 'immediate' as const,
      resources: [
        {
          title: 'LinkedIn Optimization Guide',
          url: 'https://www.linkedin.com/business/talent/blog/talent-acquisition/tips-for-creating-a-great-linkedin-profile',
          type: 'article' as const
        }
      ]
    });
    
    // Job search strategy based on market demand
    if (marketDemandScore < 60) {
      recommendations.push({
        title: 'Target Emerging Opportunities',
        description: `The market for ${targetRole} positions is competitive. Consider targeting adjacent roles or emerging niches to increase your chances.`,
        priority: 'medium' as const,
        timeframe: 'long-term' as const,
        resources: [
          {
            title: 'Job Market Trends',
            url: `https://www.indeed.com/career-advice/finding-a-job/job-market-trends`,
            type: 'article' as const
          }
        ]
      });
    } else {
      recommendations.push({
        title: 'Leverage High Market Demand',
        description: `The strong demand for ${targetRole} positions gives you an advantage. Focus on companies with growth in this area.`,
        priority: 'medium' as const,
        timeframe: 'short-term' as const,
        resources: [
          {
            title: 'High-Growth Companies',
            url: 'https://www.linkedin.com/pulse/top-50-fastest-growing-companies-hire-right-now-linkedin-news/',
            type: 'article' as const
          }
        ]
      });
    }
    
    // Personal branding
    recommendations.push({
      title: 'Develop Your Personal Brand',
      description: `Establish yourself as an emerging professional in the ${targetRole} space through content creation and networking.`,
      priority: 'medium' as const,
      timeframe: 'long-term' as const,
      resources: [
        {
          title: 'Personal Branding Guide',
          url: 'https://www.themuse.com/advice/the-ultimate-guide-to-personal-branding',
          type: 'article' as const
        }
      ]
    });
    
    return recommendations;
  }
  
  /**
   * Generate education path recommendations
   * @param targetRole Target role
   * @param skillGapsData Skill gaps data
   * @param educationPathScore Education path score
   * @returns Education path recommendations
   */
  private generateEducationPathRecommendations(
    targetRole: string,
    skillGapsData: typeof skillGaps.$inferSelect[],
    educationPathScore: number
  ) {
    const recommendations = [];
    
    // Core learning path
    if (educationPathScore < 70) {
      // More structured education needed
      recommendations.push({
        title: 'Enroll in a Comprehensive Program',
        description: `Consider a bootcamp or professional certificate program focused on ${targetRole} skills to accelerate your transition.`,
        priority: 'high' as const,
        timeframe: 'immediate' as const,
        resources: [
          {
            title: 'Bootcamp Rankings',
            url: 'https://www.coursereport.com/best-coding-bootcamps',
            type: 'article' as const
          },
          {
            title: 'Professional Certificates',
            url: `https://www.edx.org/search?q=${encodeURIComponent(targetRole)}`,
            type: 'course' as const
          }
        ]
      });
    } else {
      // Self-directed learning path is sufficient
      recommendations.push({
        title: 'Create a Self-Directed Learning Path',
        description: `Your background positions you well for self-directed learning. Focus on targeted courses to fill specific skill gaps.`,
        priority: 'medium' as const,
        timeframe: 'short-term' as const,
        resources: [
          {
            title: 'Curated Learning Paths',
            url: `https://www.pluralsight.com/search?q=${encodeURIComponent(targetRole)}&categories=course`,
            type: 'course' as const
          }
        ]
      });
    }
    
    // Specialized courses
    const topSkillsToLearn = skillGapsData
      .filter(gap => gap.gapLevel === 'High' || gap.gapLevel === 'Medium')
      .slice(0, 3)
      .map(gap => gap.skillName);
    
    if (topSkillsToLearn.length > 0) {
      recommendations.push({
        title: 'Take Specialized Courses',
        description: `Enroll in courses focused on ${topSkillsToLearn.join(', ')} to close your most critical skill gaps.`,
        priority: 'high' as const,
        timeframe: 'immediate' as const,
        resources: [
          {
            title: 'Udemy Specialized Courses',
            url: `https://www.udemy.com/courses/search/?src=ukw&q=${encodeURIComponent(topSkillsToLearn.join(' '))}`,
            type: 'course' as const
          },
          {
            title: 'Coursera Skills Courses',
            url: `https://www.coursera.org/search?query=${encodeURIComponent(topSkillsToLearn.join(' '))}`,
            type: 'course' as const
          }
        ]
      });
    }
    
    // Advanced education options
    recommendations.push({
      title: 'Consider Advanced Education Options',
      description: `Evaluate whether a degree, certificate, or advanced specialization in ${targetRole}-related fields would significantly benefit your transition.`,
      priority: 'low' as const,
      timeframe: 'long-term' as const,
      resources: [
        {
          title: 'Certificate vs. Degree Guide',
          url: 'https://www.northeastern.edu/graduate/blog/masters-degree-vs-graduate-certificate/',
          type: 'article' as const
        }
      ]
    });
    
    // Hands-on learning
    recommendations.push({
      title: 'Prioritize Hands-On Learning',
      description: `Complement theoretical knowledge with practical application through workshops, hackathons, and real-world projects.`,
      priority: 'medium' as const,
      timeframe: 'long-term' as const,
      resources: [
        {
          title: 'Hackathon Calendar',
          url: 'https://devpost.com/hackathons',
          type: 'community' as const
        },
        {
          title: 'Workshops and Events',
          url: 'https://www.meetup.com/find/?keywords=tech&source=EVENTS',
          type: 'community' as const
        }
      ]
    });
    
    return recommendations;
  }
  
  /**
   * Generate experience building recommendations
   * @param currentRole Current role
   * @param targetRole Target role
   * @param skillGapsData Skill gaps data
   * @returns Experience building recommendations
   */
  private generateExperienceBuildingRecommendations(
    currentRole: string,
    targetRole: string,
    skillGapsData: typeof skillGaps.$inferSelect[]
  ) {
    const recommendations = [];
    
    // Open source contributions
    recommendations.push({
      title: 'Contribute to Open Source Projects',
      description: `Find and contribute to open source projects that use technologies relevant to ${targetRole} positions.`,
      priority: 'medium' as const,
      timeframe: 'short-term' as const,
      resources: [
        {
          title: 'Good First Issues',
          url: 'https://goodfirstissue.dev/',
          type: 'community' as const
        },
        {
          title: 'First Contributions',
          url: 'https://github.com/firstcontributions/first-contributions',
          type: 'community' as const
        }
      ]
    });
    
    // Volunteering
    recommendations.push({
      title: 'Volunteer Your Skills',
      description: `Offer your emerging ${targetRole} skills to nonprofits or community organizations to build real experience.`,
      priority: 'medium' as const,
      timeframe: 'short-term' as const,
      resources: [
        {
          title: 'Catch a Fire',
          url: 'https://www.catchafire.org/',
          type: 'community' as const
        },
        {
          title: 'Code for America',
          url: 'https://www.codeforamerica.org/',
          type: 'community' as const
        }
      ]
    });
    
    // Apprenticeship or mentorship
    recommendations.push({
      title: 'Seek Mentorship or Apprenticeship',
      description: `Find a mentor currently working as a ${targetRole} who can guide your transition and provide insider knowledge.`,
      priority: 'high' as const,
      timeframe: 'immediate' as const,
      resources: [
        {
          title: 'ADPList Mentorship',
          url: 'https://adplist.org/',
          type: 'community' as const
        },
        {
          title: 'MentorCruise',
          url: 'https://mentorcruise.com/',
          type: 'community' as const
        }
      ]
    });
    
    // Hybrid role to leverage current experience
    recommendations.push({
      title: 'Target Hybrid or Transition Roles',
      description: `Look for roles that combine elements of ${currentRole} and ${targetRole} as stepping stones in your transition.`,
      priority: 'high' as const,
      timeframe: 'immediate' as const,
      resources: [
        {
          title: 'LinkedIn Jobs',
          url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`${currentRole} ${targetRole}`)}`,
          type: 'tool' as const
        }
      ]
    });
    
    // Side projects
    recommendations.push({
      title: 'Build Showcase Projects',
      description: `Create portfolio projects that demonstrate your ${targetRole} skills and solve real problems.`,
      priority: 'high' as const,
      timeframe: 'long-term' as const,
      resources: [
        {
          title: 'Portfolio Project Ideas',
          url: `https://www.google.com/search?q=${encodeURIComponent(`${targetRole} portfolio project ideas`)}`,
          type: 'article' as const
        }
      ]
    });
    
    return recommendations;
  }
  
  /**
   * Generate networking recommendations
   * @param targetRole Target role
   * @returns Networking recommendations
   */
  private generateNetworkingRecommendations(targetRole: string) {
    const recommendations = [];
    
    // Industry events
    recommendations.push({
      title: 'Attend Industry Events and Conferences',
      description: `Participate in ${targetRole}-focused conferences, workshops, and meetups to build connections and visibility.`,
      priority: 'medium' as const,
      timeframe: 'short-term' as const,
      resources: [
        {
          title: 'Meetup Groups',
          url: `https://www.meetup.com/find/?keywords=${encodeURIComponent(targetRole)}`,
          type: 'community' as const
        },
        {
          title: 'Eventbrite Tech Events',
          url: `https://www.eventbrite.com/d/online/tech-${encodeURIComponent(targetRole.toLowerCase())}/`,
          type: 'community' as const
        }
      ]
    });
    
    // Online communities
    recommendations.push({
      title: 'Join Online Communities',
      description: `Become an active member of ${targetRole} communities on Slack, Discord, and Reddit to learn from peers and build connections.`,
      priority: 'high' as const,
      timeframe: 'immediate' as const,
      resources: [
        {
          title: 'Slack Communities',
          url: 'https://github.com/ladyleet/tech-community-slacks',
          type: 'community' as const
        },
        {
          title: 'Reddit Communities',
          url: `https://www.reddit.com/search/?q=${encodeURIComponent(targetRole)}`,
          type: 'community' as const
        }
      ]
    });
    
    // Network with professionals
    recommendations.push({
      title: 'Connect with Professionals',
      description: `Reach out to people who have successfully transitioned to ${targetRole} positions for advice and networking.`,
      priority: 'high' as const,
      timeframe: 'immediate' as const,
      resources: [
        {
          title: 'LinkedIn Networking',
          url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(targetRole)}`,
          type: 'tool' as const
        }
      ]
    });
    
    // Engage in relevant discussions
    recommendations.push({
      title: 'Contribute to Professional Discussions',
      description: `Share your insights and ask thoughtful questions in ${targetRole} forums and discussion groups to establish your presence.`,
      priority: 'medium' as const,
      timeframe: 'long-term' as const,
      resources: [
        {
          title: 'Stack Overflow',
          url: 'https://stackoverflow.com/',
          type: 'community' as const
        },
        {
          title: 'Hacker News',
          url: 'https://news.ycombinator.com/',
          type: 'community' as const
        }
      ]
    });
    
    // Informational interviews
    recommendations.push({
      title: 'Conduct Informational Interviews',
      description: `Request brief conversations with ${targetRole} professionals to learn about their career paths and gain insights.`,
      priority: 'medium' as const,
      timeframe: 'short-term' as const,
      resources: [
        {
          title: 'Informational Interview Guide',
          url: 'https://www.themuse.com/advice/how-to-ask-for-an-informational-interview-and-get-a-yes',
          type: 'article' as const
        }
      ]
    });
    
    return recommendations;
  }
  
  /**
   * Generate next steps recommendations
   * @param scores Individual component scores
   * @param skillGapsCount Number of skill gaps
   * @returns Next steps recommendations
   */
  private generateNextStepsRecommendations(
    scores: {
      marketDemandScore: number;
      skillGapScore: number;
      educationPathScore: number;
      industryTrendScore: number;
      geographicalFactorScore: number;
    },
    skillGapsCount: number
  ) {
    const recommendations = [];
    
    // First step based on lowest score
    const lowestScoreName = Object.entries(scores)
      .sort(([, scoreA], [, scoreB]) => scoreA - scoreB)[0][0];
    
    let firstActionTitle = '';
    let firstActionDescription = '';
    let firstActionPriority: 'high' | 'medium' | 'low' = 'high';
    
    switch (lowestScoreName) {
      case 'marketDemandScore':
        firstActionTitle = 'Research Market Opportunities';
        firstActionDescription = 'Identify specific companies and niche roles where your skills can be most competitive, even in a challenging market.';
        break;
      case 'skillGapScore':
        firstActionTitle = 'Create a Skill Development Plan';
        firstActionDescription = 'Develop a detailed plan to address your top priority skill gaps with specific courses and projects.';
        break;
      case 'educationPathScore':
        firstActionTitle = 'Evaluate Education Options';
        firstActionDescription = 'Research and select the most effective learning resources for your specific career transition needs.';
        break;
      case 'industryTrendScore':
        firstActionTitle = 'Stay Current with Industry Trends';
        firstActionDescription = 'Subscribe to industry publications and follow thought leaders to stay ahead of evolving requirements.';
        break;
      case 'geographicalFactorScore':
        firstActionTitle = 'Explore Remote Work Opportunities';
        firstActionDescription = 'Research companies with strong remote work cultures and build skills for effective remote collaboration.';
        break;
      default:
        firstActionTitle = 'Create a Comprehensive Transition Plan';
        firstActionDescription = 'Develop a week-by-week plan covering skill development, networking, and job search activities.';
    }
    
    recommendations.push({
      title: firstActionTitle,
      description: firstActionDescription,
      priority: firstActionPriority,
      timeframe: 'immediate' as const,
      resources: [
        {
          title: 'Career Transition Guide',
          url: 'https://www.coursera.org/articles/career-change',
          type: 'article' as const
        }
      ]
    });
    
    // Build portfolio
    recommendations.push({
      title: 'Build Your Professional Portfolio',
      description: 'Create a professional website showcasing your projects, skills, and transition journey.',
      priority: 'high' as const,
      timeframe: 'short-term' as const,
      resources: [
        {
          title: 'Portfolio Templates',
          url: 'https://github.com/topics/portfolio-template',
          type: 'tool' as const
        }
      ]
    });
    
    // Interview preparation
    recommendations.push({
      title: 'Prepare for Interviews',
      description: 'Research common interview questions for your target role and practice your responses, especially around your career transition.',
      priority: 'medium' as const,
      timeframe: 'short-term' as const,
      resources: [
        {
          title: 'Interview Preparation Guide',
          url: 'https://www.themuse.com/advice/interview-preparation-guide',
          type: 'article' as const
        },
        {
          title: 'Mock Interview Tool',
          url: 'https://www.pramp.com/',
          type: 'tool' as const
        }
      ]
    });
    
    // Regular assessment
    recommendations.push({
      title: 'Schedule Regular Progress Assessments',
      description: 'Set monthly check-ins to evaluate your progress and adjust your transition strategy as needed.',
      priority: 'medium' as const,
      timeframe: 'long-term' as const,
      resources: [
        {
          title: 'Progress Tracking Templates',
          url: 'https://www.notion.so/templates/categories/goals-planning',
          type: 'tool' as const
        }
      ]
    });
    
    // Support network
    recommendations.push({
      title: 'Build a Support Network',
      description: 'Connect with others making similar career transitions to share resources and motivation.',
      priority: 'medium' as const,
      timeframe: 'short-term' as const,
      resources: [
        {
          title: 'Career Change Communities',
          url: 'https://www.reddit.com/r/careerguidance/',
          type: 'community' as const
        }
      ]
    });
    
    return recommendations;
  }
}