/**
 * Memory Store for Career Transitions
 * 
 * A lightweight memory system to store information about career transition
 * analysis processes and their results.
 */

// Define the types for the memory storage
export interface TransitionMemory {
  state: 'idle' | 'in_progress' | 'complete' | 'failed';
  data: any;
  timestamp: number;
}

// Career transition memory system
export class CareerTransitionMemory {
  private memory: Map<number, TransitionMemory>;
  private inProgress: Set<number>;
  
  constructor() {
    this.memory = new Map();
    this.inProgress = new Set();
  }
  
  /**
   * Check if a transition is in memory and/or in progress
   * @param transitionId The ID of the transition to check
   * @param checkInProgressOnly Only check if the transition is in progress
   * @returns Whether the transition is in memory/in progress
   */
  public isTransitionInProgress(transitionId: number, checkInProgressOnly = true): boolean {
    if (checkInProgressOnly) {
      return this.inProgress.has(transitionId);
    }
    
    return this.memory.has(transitionId);
  }
  
  /**
   * Mark a transition as in progress
   * @param transitionId The ID of the transition to mark
   */
  public markTransitionInProgress(transitionId: number): void {
    this.inProgress.add(transitionId);
    
    if (!this.memory.has(transitionId)) {
      this.memory.set(transitionId, {
        state: 'in_progress',
        data: {},
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Get the memory for a specific transition
   * @param transitionId The ID of the transition to get
   * @returns The memory for the transition, or undefined if not found
   */
  public getMemory(transitionId: number): TransitionMemory | undefined {
    return this.memory.get(transitionId);
  }
  
  /**
   * Update the memory for a specific transition
   * @param transitionId The ID of the transition to update
   * @param userId The ID of the user who owns the transition
   * @param updates Updates to apply to the memory
   */
  public updateMemory(
    transitionId: number,
    userId: number,
    updates: Partial<Omit<TransitionMemory, 'timestamp'>>
  ): void {
    const existing = this.memory.get(transitionId) || {
      state: 'idle',
      data: { userId },
      timestamp: Date.now()
    };
    
    // Update the state if provided
    if (updates.state) {
      existing.state = updates.state;
      
      // If the state is complete or failed, remove from in progress
      if (updates.state === 'complete' || updates.state === 'failed') {
        this.inProgress.delete(transitionId);
      }
    }
    
    // Update the data if provided, merging with existing data
    if (updates.data) {
      existing.data = { ...existing.data, ...updates.data };
    }
    
    // Update the timestamp
    existing.timestamp = Date.now();
    
    // Save the updated memory
    this.memory.set(transitionId, existing);
  }
  
  /**
   * Clear all memory
   */
  public clearAll(): void {
    this.memory.clear();
    this.inProgress.clear();
  }
}

// Create a singleton instance
export const careerTransitionMemory = new CareerTransitionMemory();