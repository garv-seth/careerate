/**
 * Memory Store for Career Transition Agents
 * 
 * This module provides a memory storage system for the agents to
 * remember important details between sessions or agent runs.
 * It uses an in-memory vector store with embedding capabilities
 * to store and retrieve relevant memories based on semantic search.
 */
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatGoogleGenerativeAIEmbeddings } from "@langchain/google-genai/embeddings";
import { Document } from "@langchain/core/documents";
import { InMemoryVectorStore } from "@langchain/community/vectorstores/memory";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Class for storing and retrieving memories about career transitions
 */
export class CareerTransitionMemory {
  private vectorStore: InMemoryVectorStore;
  
  constructor() {
    // Determine which embeddings to use based on available API keys
    const embeddings = process.env.GOOGLE_API_KEY 
      ? new ChatGoogleGenerativeAIEmbeddings({
          apiKey: process.env.GOOGLE_API_KEY,
          modelName: "embedding-001"
        }) 
      : new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY
        });
    
    // Initialize the vector store with the chosen embeddings
    this.vectorStore = new InMemoryVectorStore(embeddings);
    
    console.log("Career transition memory store initialized");
  }
  
  /**
   * Save a memory about a career transition
   * 
   * @param memory The text memory to save
   * @param metadata Additional information about the memory
   * @returns The ID of the stored memory
   */
  async saveMemory(
    memory: string, 
    metadata: { 
      transitionId: number; 
      currentRole: string; 
      targetRole: string; 
      memoryType: "skill_gap" | "story" | "insight" | "resource" | "general";
    }
  ): Promise<string> {
    try {
      // Generate a unique memory ID
      const memoryId = `memory-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create a document with the memory text and metadata
      const doc = new Document({
        pageContent: memory,
        metadata: {
          id: memoryId,
          ...metadata,
          timestamp: new Date().toISOString(),
        }
      });
      
      // Add the document to the vector store
      await this.vectorStore.addDocuments([doc]);
      
      console.log(`Memory saved: ${memoryId} for transition ${metadata.transitionId} (${metadata.memoryType})`);
      return memoryId;
    } catch (error) {
      console.error("Error saving memory:", error);
      throw error;
    }
  }
  
  /**
   * Retrieve memories relevant to a specific transition or query
   * 
   * @param query The query text to search for
   * @param transitionId Optional transition ID to filter by
   * @param memoryType Optional memory type to filter by
   * @param limit Maximum number of memories to retrieve
   * @returns Array of relevant memory documents
   */
  async retrieveMemories(
    query: string,
    transitionId?: number,
    memoryType?: "skill_gap" | "story" | "insight" | "resource" | "general",
    limit: number = 5
  ): Promise<Document[]> {
    try {
      // Create a filter function based on the provided parameters
      const filterFunction = (doc: Document) => {
        if (transitionId !== undefined && doc.metadata.transitionId !== transitionId) {
          return false;
        }
        if (memoryType !== undefined && doc.metadata.memoryType !== memoryType) {
          return false;
        }
        return true;
      };
      
      // Perform a similarity search on the vector store
      const results = await this.vectorStore.similaritySearch(
        query, 
        limit,
        filterFunction
      );
      
      console.log(`Retrieved ${results.length} memories for query: ${query}`);
      return results;
    } catch (error) {
      console.error("Error retrieving memories:", error);
      return [];
    }
  }
  
  /**
   * Get all memories for a specific transition ID
   * 
   * @param transitionId The transition ID to retrieve memories for
   * @returns Array of memory documents
   */
  async getMemoriesByTransitionId(transitionId: number): Promise<Document[]> {
    try {
      // Filter memories by transition ID
      // Note: This is not efficient with the current InMemoryVectorStore implementation
      // and would be better with a database-backed vector store
      const allDocs = await this.vectorStore.similaritySearch(
        "", // Empty query to get all documents (not ideal, but works for in-memory)
        100, // Higher limit to get most or all documents
        (doc) => doc.metadata.transitionId === transitionId
      );
      
      console.log(`Retrieved ${allDocs.length} memories for transition ID: ${transitionId}`);
      return allDocs;
    } catch (error) {
      console.error("Error retrieving memories by transition ID:", error);
      return [];
    }
  }
  
  /**
   * Clear all memories for a specific transition ID
   * 
   * @param transitionId The transition ID to clear memories for
   * @returns Whether the operation was successful
   */
  async clearMemoriesByTransitionId(transitionId: number): Promise<boolean> {
    try {
      // Currently InMemoryVectorStore doesn't support deletion
      // This would be implemented with a database-backed vector store
      console.log(`Memory clearing not supported for transition ID: ${transitionId}`);
      return false;
    } catch (error) {
      console.error("Error clearing memories by transition ID:", error);
      return false;
    }
  }
}

// Singleton instance of the memory store
export const careerMemory = new CareerTransitionMemory();

/**
 * Function to save a transition-related memory (for use with agents)
 * 
 * @param memory The memory text to save
 * @param config Runtime configuration for context
 * @returns Confirmation message
 */
export async function saveTransitionMemory(
  memory: string,
  memoryType: "skill_gap" | "story" | "insight" | "resource" | "general",
  config: RunnableConfig
): Promise<string> {
  // Extract transition information from the config
  const transition = config.configurable?.transition;
  if (!transition) {
    throw new Error("Transition information not found in config");
  }
  
  const { transitionId, currentRole, targetRole } = transition;
  
  // Save the memory
  await careerMemory.saveMemory(memory, {
    transitionId,
    currentRole,
    targetRole,
    memoryType
  });
  
  return `Memory saved: ${memory.substring(0, 50)}...`;
}

/**
 * Function to retrieve transition-related memories (for use with agents)
 * 
 * @param query The query text to search for
 * @param config Runtime configuration for context
 * @returns Array of memory text content
 */
export async function retrieveTransitionMemories(
  query: string,
  memoryType: "skill_gap" | "story" | "insight" | "resource" | "general" | "all",
  config: RunnableConfig
): Promise<string[]> {
  // Extract transition information from the config
  const transition = config.configurable?.transition;
  if (!transition) {
    throw new Error("Transition information not found in config");
  }
  
  const { transitionId } = transition;
  
  // Retrieve memories
  const memories = await careerMemory.retrieveMemories(
    query,
    transitionId,
    memoryType === "all" ? undefined : memoryType,
    5
  );
  
  // Extract the page content from each memory
  return memories.map(memory => memory.pageContent);
}