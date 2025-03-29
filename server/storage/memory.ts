/**
 * In-Memory Storage Implementation
 * 
 * A lightweight in-memory storage implementation for the career transition service.
 * This is used for development and testing purposes.
 */

import type { 
  IStorage, 
  Transition, 
  TransitionStory, 
  SkillGap, 
  Insight, 
  ReadinessScore, 
  MarketData 
} from './index';

export class MemStorage implements IStorage {
  private transitions: Map<number, Transition> = new Map();
  private stories: Map<number, TransitionStory[]> = new Map();
  private skillGaps: Map<number, SkillGap[]> = new Map();
  private insights: Map<number, Insight[]> = new Map();
  private readinessScores: Map<number, ReadinessScore> = new Map();
  private marketData: Map<number, MarketData[]> = new Map();
  
  private nextIds = {
    transition: 1,
    story: 1,
    skillGap: 1,
    insight: 1,
    readinessScore: 1,
    marketData: 1
  };
  
  // Transition management
  async createTransition(transition: Omit<Transition, 'id' | 'createdAt' | 'completedAt'>): Promise<Transition> {
    const id = this.nextIds.transition++;
    const newTransition: Transition = {
      ...transition,
      id,
      createdAt: new Date(),
      status: 'in_progress',
      completedAt: null
    };
    
    this.transitions.set(id, newTransition);
    return newTransition;
  }
  
  async getTransition(id: number): Promise<Transition | null> {
    return this.transitions.get(id) || null;
  }
  
  async updateTransitionStatus(id: number, status: Transition['status'], completedAt?: Date): Promise<void> {
    const transition = this.transitions.get(id);
    if (!transition) {
      throw new Error(`Transition with ID ${id} not found`);
    }
    
    transition.status = status;
    if (status === 'complete' && !transition.completedAt) {
      transition.completedAt = completedAt || new Date();
    }
    
    this.transitions.set(id, transition);
  }
  
  // Stories management
  async addStory(story: Omit<TransitionStory, 'id'>): Promise<TransitionStory> {
    const id = this.nextIds.story++;
    const newStory: TransitionStory = { ...story, id };
    
    const existingStories = this.stories.get(story.transitionId) || [];
    this.stories.set(story.transitionId, [...existingStories, newStory]);
    
    return newStory;
  }
  
  async getStories(transitionId: number): Promise<TransitionStory[]> {
    return this.stories.get(transitionId) || [];
  }
  
  // Skill gaps management
  async addSkillGap(skillGap: Omit<SkillGap, 'id'>): Promise<SkillGap> {
    const id = this.nextIds.skillGap++;
    const newSkillGap: SkillGap = { ...skillGap, id };
    
    const existingSkillGaps = this.skillGaps.get(skillGap.transitionId) || [];
    this.skillGaps.set(skillGap.transitionId, [...existingSkillGaps, newSkillGap]);
    
    return newSkillGap;
  }
  
  async getSkillGaps(transitionId: number): Promise<SkillGap[]> {
    return this.skillGaps.get(transitionId) || [];
  }
  
  async clearSkillGaps(transitionId: number): Promise<void> {
    this.skillGaps.set(transitionId, []);
  }
  
  // Insights management
  async addInsight(insight: Omit<Insight, 'id'>): Promise<Insight> {
    const id = this.nextIds.insight++;
    const newInsight: Insight = { ...insight, id };
    
    const existingInsights = this.insights.get(insight.transitionId) || [];
    this.insights.set(insight.transitionId, [...existingInsights, newInsight]);
    
    return newInsight;
  }
  
  async getInsights(transitionId: number): Promise<Insight[]> {
    return this.insights.get(transitionId) || [];
  }
  
  async clearInsights(transitionId: number): Promise<void> {
    this.insights.set(transitionId, []);
  }
  
  // Readiness Score management
  async addReadinessScore(score: Omit<ReadinessScore, 'id' | 'createdAt'>): Promise<ReadinessScore> {
    const id = this.nextIds.readinessScore++;
    const newScore: ReadinessScore = { 
      ...score,
      id,
      createdAt: new Date()
    };
    
    this.readinessScores.set(score.transitionId, newScore);
    return newScore;
  }
  
  async getReadinessScore(transitionId: number): Promise<ReadinessScore | null> {
    return this.readinessScores.get(transitionId) || null;
  }
  
  // Market data management
  async addMarketData(data: Omit<MarketData, 'id' | 'createdAt'>): Promise<MarketData> {
    const id = this.nextIds.marketData++;
    const newData: MarketData = { 
      ...data,
      id,
      createdAt: new Date()
    };
    
    const existingData = this.marketData.get(data.transitionId) || [];
    this.marketData.set(data.transitionId, [...existingData, newData]);
    
    return newData;
  }
  
  async getMarketData(transitionId: number): Promise<MarketData[]> {
    return this.marketData.get(transitionId) || [];
  }
}