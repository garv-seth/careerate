/**
 * Storage Interface for Career Transitions
 * 
 * Defines a common interface for storing and retrieving data related to
 * career transitions, whether in-memory or in a database.
 */

// Interface for transition data
export interface Transition {
  id: number;
  userId: number;
  currentRole: string;
  targetRole: string;
  status: 'in_progress' | 'complete' | 'failed';
  createdAt: Date;
  completedAt?: Date | null;
}

// Interface for transition story
export interface TransitionStory {
  id: number;
  transitionId: number;
  title: string;
  content: string;
  source: string;
  url?: string;
  relevanceScore?: number;
}

// Interface for skill gap
export interface SkillGap {
  id: number;
  transitionId: number;
  skill: string;
  level: 'basic' | 'intermediate' | 'advanced';
  description: string;
  resourceUrls?: string[];
}

// Interface for insights
export interface Insight {
  id: number;
  transitionId: number;
  category: string;
  content: string;
  importance: 'low' | 'medium' | 'high';
}

// Interface for readiness score
export interface ReadinessScore {
  id: number;
  transitionId: number;
  score: number;
  breakdown: Record<string, number>;
  explanation: string;
  createdAt: Date;
}

// Interface for market data
export interface MarketData {
  id: number;
  transitionId: number;
  category: string;
  data: any;
  source: string;
  createdAt: Date;
}

// Main storage interface
export interface IStorage {
  // Transition management
  createTransition(transition: Omit<Transition, 'id' | 'createdAt' | 'completedAt'>): Promise<Transition>;
  getTransition(id: number): Promise<Transition | null>;
  updateTransitionStatus(id: number, status: Transition['status'], completedAt?: Date): Promise<void>;
  
  // Stories management
  addStory(story: Omit<TransitionStory, 'id'>): Promise<TransitionStory>;
  getStories(transitionId: number): Promise<TransitionStory[]>;
  
  // Skill gaps management
  addSkillGap(skillGap: Omit<SkillGap, 'id'>): Promise<SkillGap>;
  getSkillGaps(transitionId: number): Promise<SkillGap[]>;
  clearSkillGaps(transitionId: number): Promise<void>;
  
  // Insights management
  addInsight(insight: Omit<Insight, 'id'>): Promise<Insight>;
  getInsights(transitionId: number): Promise<Insight[]>;
  clearInsights(transitionId: number): Promise<void>;
  
  // Readiness Score management
  addReadinessScore(score: Omit<ReadinessScore, 'id' | 'createdAt'>): Promise<ReadinessScore>;
  getReadinessScore(transitionId: number): Promise<ReadinessScore | null>;
  
  // Market data management
  addMarketData(data: Omit<MarketData, 'id' | 'createdAt'>): Promise<MarketData>;
  getMarketData(transitionId: number): Promise<MarketData[]>;
}