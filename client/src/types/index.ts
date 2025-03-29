// Database models
export interface User {
  id: number;
  username: string;
}

export interface Transition {
  id: number;
  userId: number | null;
  currentRole: string;
  targetRole: string;
  createdAt: string;
  isComplete: boolean;
}

export interface ScrapedData {
  id: number;
  transitionId: number;
  source: string;
  content: string;
  url: string | null;
  postDate: string | null; // Date when the content was originally published
  skillsExtracted: string[];
  createdAt: string;
}

export interface SkillGap {
  id: number;
  transitionId: number;
  skillName: string;
  gapLevel: "Low" | "Medium" | "High";
  confidenceScore: number | null;
  mentionCount: number | null;
}

export interface Plan {
  id: number;
  transitionId: number;
  createdAt: string;
}

export interface Milestone {
  id: number;
  planId: number;
  title: string;
  description: string | null;
  priority: "Low" | "Medium" | "High";
  durationWeeks: number;
  order: number;
  progress: number;
}

export interface Resource {
  id: number;
  milestoneId: number;
  title: string;
  url: string;
  type: string;
}

export interface Insight {
  id: number;
  transitionId: number;
  type: "observation" | "challenge" | "story";
  content: string;
  source: string | null;
  date: string | null;
  experienceYears: number | null;
  url?: string | null;
}

// Extended types
export interface MilestoneWithResources extends Milestone {
  resources: Resource[];
}

// Readiness Score types
export interface ReadinessRecommendationResource {
  title: string;
  url: string;
  type: 'course' | 'article' | 'book' | 'video' | 'community' | 'tool';
}

export interface ReadinessRecommendationItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeframe?: 'immediate' | 'short-term' | 'long-term';
  resources?: ReadinessRecommendationResource[];
}

export interface ReadinessRecommendations {
  skillDevelopment: ReadinessRecommendationItem[];
  marketPositioning: ReadinessRecommendationItem[];
  educationPaths: ReadinessRecommendationItem[];
  experienceBuilding: ReadinessRecommendationItem[];
  networkingOpportunities: ReadinessRecommendationItem[];
  nextSteps: ReadinessRecommendationItem[];
}

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
  createdAt?: string;
  updatedAt?: string;
}

// API response types
export interface DashboardData {
  success: boolean;
  transition: Transition;
  skillGaps: SkillGap[];
  plan?: Plan;
  milestones: MilestoneWithResources[];
  insights: Insight[];
  scrapedCount: number;
  isComplete: boolean;
  readinessScore?: ReadinessScore;
}
