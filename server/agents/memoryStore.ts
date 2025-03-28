/**
 * Memory Store for Career Transition Agent State Management
 * 
 * This module provides a memory storage system for tracking agent state
 * between API calls and preventing redundant operations.
 */

interface AgentMemoryEntry {
  transitionId: number;
  userId: number;
  lastUpdated: Date;
  state: 'initializing' | 'scraping' | 'analyzing' | 'planning' | 'complete';
  data: {
    scrapedData?: any[];
    skillGaps?: any[];
    insights?: any;
    plan?: any;
  };
}

class CareerTransitionMemoryStore {
  // Using instance variables instead of 'private' keyword to avoid TypeScript issues
  memory: Map<number, AgentMemoryEntry>;
  inProgressTransitions: Set<number>;
  
  constructor() {
    this.memory = new Map();
    this.inProgressTransitions = new Set();
    
    // Auto-cleanup of in-progress states after 10 minutes
    setInterval(() => this.cleanupStalledTransitions(), 10 * 60 * 1000);
  }
  
  /**
   * Check if a transition is currently being processed
   * @param transitionId The ID of the transition to check
   * @param force Optional parameter to override the in-progress state
   */
  isTransitionInProgress(transitionId: number, force?: boolean): boolean {
    if (force) {
      return false;
    }
    return this.inProgressTransitions.has(transitionId);
  }
  
  /**
   * Mark a transition as in-progress
   * @param transitionId The ID of the transition to mark as in-progress
   */
  markTransitionInProgress(transitionId: number): void {
    this.inProgressTransitions.add(transitionId);
    
    // Auto-clear in-progress flag after 5 minutes to prevent deadlocks
    setTimeout(() => {
      this.inProgressTransitions.delete(transitionId);
    }, 5 * 60 * 1000);
  }
  
  /**
   * Mark a transition as completed
   */
  markTransitionComplete(transitionId: number): void {
    this.inProgressTransitions.delete(transitionId);
  }
  
  /**
   * Get memory for a transition
   */
  getMemory(transitionId: number): AgentMemoryEntry | undefined {
    return this.memory.get(transitionId);
  }
  
  /**
   * Update memory for a transition
   */
  updateMemory(transitionId: number, userId: number, updates: Partial<AgentMemoryEntry>): void {
    const existing = this.memory.get(transitionId);
    
    if (existing) {
      this.memory.set(transitionId, {
        ...existing,
        ...updates,
        lastUpdated: new Date(),
      });
    } else {
      this.memory.set(transitionId, {
        transitionId,
        userId,
        lastUpdated: new Date(),
        state: 'initializing',
        data: {},
        ...updates,
      });
    }
  }
  
  /**
   * Clear memory for a transition
   */
  clearMemory(transitionId: number): void {
    this.memory.delete(transitionId);
    this.inProgressTransitions.delete(transitionId);
  }
  
  /**
   * Clean up stalled transitions (those in progress for more than 10 minutes)
   */
  cleanupStalledTransitions(): void {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    for (const [id, entry] of this.memory.entries()) {
      if (this.inProgressTransitions.has(id) && entry.lastUpdated < tenMinutesAgo) {
        console.log(`Cleaning up stalled transition ${id} that was in progress for >10 minutes`);
        this.inProgressTransitions.delete(id);
        
        // Update memory to mark as incomplete
        this.updateMemory(id, entry.userId, { 
          state: 'complete',
          data: { ...entry.data }
        });
      }
    }
  }
}

// Create a singleton instance of the memory store
export const careerTransitionMemory = new CareerTransitionMemoryStore();