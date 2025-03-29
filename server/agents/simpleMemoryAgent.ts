/**
 * Simple Memory Agent for Career Transitions
 * 
 * A lightweight agent implementation for career transition analysis with 
 * a focus on resource efficiency and reliable operation.
 */

import { careerTransitionMemory } from './memoryStore';
import type { IStorage } from '../storage';
import { improvedTavilySearch } from '../tools/improvedTavilySearch';
import { calculateAIReadinessScore } from '../tools/aiReadinessScore';
import { safeJsonParse } from '../helpers/jsonParserHelper';

export class SimpleMemoryAgent {
  private storage: IStorage;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Run a career transition analysis using Tavily search
   */
  async analyzeCareerTransition(
    currentRole: string,
    targetRole: string,
    userId: number,
    transitionId: number
  ): Promise<any> {
    // Check if this transition is already being processed
    if (careerTransitionMemory.isTransitionInProgress(transitionId)) {
      // Return the current state from memory
      const memory = careerTransitionMemory.getMemory(transitionId);
      
      if (!memory) {
        return { error: 'Transition not found in memory' };
      }
      
      return {
        ...memory.data,
        complete: memory.state === 'complete',
        failed: memory.state === 'failed'
      };
    }
    
    // If it's not in progress, start processing (unless both roles are empty)
    if (!currentRole && !targetRole) {
      return { error: 'Current and target roles are required' };
    }
    
    // Mark as in progress
    careerTransitionMemory.markTransitionInProgress(transitionId);
    
    // Update initial data
    careerTransitionMemory.updateMemory(transitionId, userId, {
      data: {
        currentRole,
        targetRole,
        userId,
        transitionId,
        startTime: Date.now()
      }
    });
    
    try {
      // Step 1: Create a transition record in storage
      const transition = await this.storage.createTransition({
        userId,
        currentRole,
        targetRole,
        status: 'in_progress'
      });
      
      // Step 2: Research career transition stories
      const stories = await this.researchCareerTransition(currentRole, targetRole, transitionId);
      
      // Update memory with stories
      careerTransitionMemory.updateMemory(transitionId, userId, {
        data: { stories }
      });
      
      // Step 3: Identify skill gaps
      const skillGaps = await this.identifySkillGaps(currentRole, targetRole, stories, transitionId);
      
      // Update memory with skill gaps
      careerTransitionMemory.updateMemory(transitionId, userId, {
        data: { skillGaps }
      });
      
      // Step 4: Calculate AI Readiness Score (if API keys are available)
      let aiReadinessScore = null;
      try {
        aiReadinessScore = await calculateAIReadinessScore(currentRole, targetRole);
        
        // Update memory with AI readiness score
        if (aiReadinessScore) {
          careerTransitionMemory.updateMemory(transitionId, userId, {
            data: { aiReadinessScore }
          });
          
          // Store in database
          await this.storage.addReadinessScore({
            transitionId,
            score: aiReadinessScore.overall,
            breakdown: aiReadinessScore.categories,
            explanation: aiReadinessScore.explanation
          });
        }
      } catch (error) {
        console.error('Error calculating AI readiness score:', error);
        // Continue execution even if this fails
      }
      
      // Step 5: Generate insights
      const insights = await this.generateInsights(currentRole, targetRole, stories, skillGaps, aiReadinessScore);
      
      // Update memory with insights
      careerTransitionMemory.updateMemory(transitionId, userId, {
        data: { insights }
      });
      
      // Step 6: Save results to database
      await this.saveResults(transitionId, stories, skillGaps, insights);
      
      // Mark the transition as complete
      await this.storage.updateTransitionStatus(transition.id, 'complete', new Date());
      
      // Update memory as complete
      careerTransitionMemory.updateMemory(transitionId, userId, {
        state: 'complete',
        data: {
          endTime: Date.now(),
          completionTime: Date.now() - (careerTransitionMemory.getMemory(transitionId)?.data?.startTime || Date.now())
        }
      });
      
      // Return the complete results
      const memory = careerTransitionMemory.getMemory(transitionId);
      return {
        ...memory?.data,
        complete: true,
        failed: false
      };
      
    } catch (error) {
      console.error('Error analyzing career transition:', error);
      
      // Mark as failed in memory
      careerTransitionMemory.updateMemory(transitionId, userId, {
        state: 'failed',
        data: {
          error: error.message || 'Unknown error occurred',
          endTime: Date.now()
        }
      });
      
      // Update the transition status in storage
      try {
        await this.storage.updateTransitionStatus(transitionId, 'failed');
      } catch (dbError) {
        console.error('Error updating transition status in storage:', dbError);
      }
      
      // Return the error
      return {
        error: error.message || 'Unknown error occurred during analysis',
        complete: false,
        failed: true
      };
    }
  }
  
  /**
   * Research career transition stories using Tavily search
   */
  private async researchCareerTransition(
    currentRole: string,
    targetRole: string,
    transitionId: number
  ): Promise<any[]> {
    // Update memory to show we're in the research phase
    careerTransitionMemory.updateMemory(transitionId, 0, {
      data: { currentPhase: 'researching' }
    });
    
    // Construct search query
    const query = `Success stories and examples of people transitioning from ${currentRole} to ${targetRole}. Include specific skills they needed to develop, challenges they faced, and strategies that worked for their career change.`;
    
    // Perform Tavily search
    try {
      const searchResults = await improvedTavilySearch(query);
      
      // Process and extract stories
      const stories = searchResults.results.map((result: any, index: number) => ({
        id: index + 1,
        transitionId,
        title: result.title || `Story #${index + 1}`,
        content: result.content || '',
        source: result.url || 'Unknown source',
        url: result.url || '',
        relevanceScore: result.score || 0
      }));
      
      // Save stories to database
      for (const story of stories) {
        await this.storage.addStory(story);
      }
      
      return stories;
    } catch (error) {
      console.error('Error researching career transition:', error);
      return [];
    }
  }
  
  /**
   * Identify skill gaps based on the transition and stories
   */
  private async identifySkillGaps(
    currentRole: string,
    targetRole: string,
    stories: any[],
    transitionId: number
  ): Promise<any[]> {
    // Update memory to show we're in the skill gap analysis phase
    careerTransitionMemory.updateMemory(transitionId, 0, {
      data: { currentPhase: 'identifying_skill_gaps' }
    });
    
    try {
      // Compile story content into a single text for analysis
      const storyContent = stories.map(story => story.content).join('\n\n');
      
      // Use Tavily search to research skill gaps
      const query = `What specific technical and soft skills are needed for a ${targetRole} that a ${currentRole} might not have? Provide a structured list of skill gaps organized by importance level (high, medium, low).`;
      
      const searchResults = await improvedTavilySearch(query);
      
      // Extract and format skill gaps from the search results
      const content = searchResults.results.map((r: any) => r.content).join('\n\n');
      
      // Simple extraction logic - in a production system this would use an LLM for better extraction
      const skillGapTypes = ['technical', 'soft', 'domain knowledge', 'certifications'];
      const levels = ['basic', 'intermediate', 'advanced'];
      
      const skillGaps = [];
      
      // For demo purposes, extract at least 3-5 skills from the content
      const lines = content.split('\n');
      let currentSkill = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 10 && !trimmedLine.startsWith('•') && !trimmedLine.startsWith('-')) {
          // Potential skill description
          if (
            skillGapTypes.some(type => trimmedLine.toLowerCase().includes(type)) ||
            levels.some(level => trimmedLine.toLowerCase().includes(level))
          ) {
            currentSkill = trimmedLine;
            
            // Create a skill gap entry
            const level = levels.find(l => trimmedLine.toLowerCase().includes(l)) || 'intermediate';
            
            skillGaps.push({
              transitionId,
              skill: currentSkill.substring(0, 50), // Limit skill name length
              level: level as 'basic' | 'intermediate' | 'advanced',
              description: currentSkill,
              resourceUrls: []
            });
            
            if (skillGaps.length >= 5) break; // Limit to 5 skills for demo
          }
        }
      }
      
      // If we couldn't extract skills from content, add some generic ones
      if (skillGaps.length === 0) {
        skillGaps.push({
          transitionId,
          skill: `${targetRole} Technical Skills`,
          level: 'intermediate',
          description: `Technical skills specific to the ${targetRole} role that a ${currentRole} might need to develop.`,
          resourceUrls: []
        });
        
        skillGaps.push({
          transitionId,
          skill: `${targetRole} Domain Knowledge`,
          level: 'advanced',
          description: `Domain-specific knowledge required for the ${targetRole} position.`,
          resourceUrls: []
        });
        
        skillGaps.push({
          transitionId,
          skill: 'Soft Skills for Transition',
          level: 'basic',
          description: `Communication and collaboration skills needed for the ${targetRole} position.`,
          resourceUrls: []
        });
      }
      
      // Save skill gaps to database
      await this.storage.clearSkillGaps(transitionId); // Clear existing skill gaps
      
      for (const skillGap of skillGaps) {
        await this.storage.addSkillGap(skillGap);
      }
      
      return skillGaps;
    } catch (error) {
      console.error('Error identifying skill gaps:', error);
      return [];
    }
  }
  
  /**
   * Generate insights based on all collected data
   */
  private async generateInsights(
    currentRole: string,
    targetRole: string,
    stories: any[],
    skillGaps: any[],
    aiReadinessScore: any
  ): Promise<any[]> {
    try {
      // Define insight categories
      const categories = [
        'Transition Difficulty',
        'Time Investment',
        'Market Demand',
        'Salary Expectations',
        'Key Success Factors'
      ];
      
      // Generate insights based on collected data
      const insights = categories.map((category, index) => {
        // In a real implementation, these would be generated by an LLM based on the data
        let content = '';
        let importance = 'medium' as 'low' | 'medium' | 'high';
        
        switch (category) {
          case 'Transition Difficulty':
            content = `The transition from ${currentRole} to ${targetRole} appears to be ${
              skillGaps.length > 4 ? 'challenging' : 'moderate'
            } in difficulty, requiring ${skillGaps.length} key skill developments.`;
            importance = skillGaps.length > 4 ? 'high' : 'medium';
            break;
            
          case 'Time Investment':
            content = `Based on similar transitions, expect to invest ${
              skillGaps.filter(sg => sg.level === 'advanced').length > 2 ? '6-12 months' : '3-6 months'
            } to develop the necessary skills for this career change.`;
            importance = skillGaps.filter(sg => sg.level === 'advanced').length > 2 ? 'high' : 'medium';
            break;
            
          case 'Market Demand':
            content = `Market demand for ${targetRole} positions appears to be ${
              aiReadinessScore?.overall > 70 ? 'strong' : 'moderate'
            } based on current industry trends.`;
            importance = aiReadinessScore?.overall > 70 ? 'high' : 'medium';
            break;
            
          case 'Salary Expectations':
            content = `Transitioning to a ${targetRole} role may result in a ${
              currentRole.toLowerCase().includes('manager') && !targetRole.toLowerCase().includes('manager') ? 'slight decrease' : 'slight increase'
            } in compensation initially, with growth potential over time.`;
            importance = 'medium';
            break;
            
          case 'Key Success Factors':
            content = `Successful transitions from ${currentRole} to ${targetRole} often emphasize ${
              skillGaps[0]?.skill || 'specialized skills'
            } and ${skillGaps[1]?.skill || 'industry connections'}.`;
            importance = 'high';
            break;
        }
        
        return {
          id: index + 1,
          transitionId: stories[0]?.transitionId || 0,
          category,
          content,
          importance
        };
      });
      
      // Save insights to database
      const transitionId = stories[0]?.transitionId || 0;
      await this.storage.clearInsights(transitionId); // Clear existing insights
      
      for (const insight of insights) {
        await this.storage.addInsight(insight);
      }
      
      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }
  
  /**
   * Save the analysis results to storage
   */
  private async saveResults(
    transitionId: number,
    stories: any[],
    skillGaps: any[],
    insights: any[]
  ): Promise<void> {
    try {
      // In a real implementation, additional processing and data structuring would happen here
      // For this demo, most saving is done in the individual methods
      
      // Update market data if needed
      await this.storage.addMarketData({
        transitionId,
        category: 'demand_analysis',
        data: { 
          timestamp: Date.now(),
          demandLevel: stories.length > 3 ? 'high' : 'medium',
          sourcesCount: stories.length
        },
        source: 'tavily_search'
      });
      
    } catch (error) {
      console.error('Error saving results:', error);
    }
  }
}

/**
 * Create a singleton instance
 */
let simpleMemoryAgentInstance: SimpleMemoryAgent | null = null;

export function getSimpleMemoryAgent(storage: IStorage): SimpleMemoryAgent {
  if (!simpleMemoryAgentInstance) {
    simpleMemoryAgentInstance = new SimpleMemoryAgent(storage);
  }
  return simpleMemoryAgentInstance;
}