
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

export class MemoryManager {
  private memories: Map<string, Map<string, any>>;
  private pinecone: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private messageQueue: Map<string, Array<{from: string, message: string}>>;

  constructor() {
    this.memories = new Map();
    this.messageQueue = new Map();
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
      environment: process.env.PINECONE_ENVIRONMENT || "us-east1-gcp"
    });
    this.embeddings = new OpenAIEmbeddings();
  }

  getAgentMemory(agentName: string) {
    if (!this.memories.has(agentName)) {
      this.memories.set(agentName, new Map());
      this.messageQueue.set(agentName, []);
    }
    return this.memories.get(agentName);
  }

  async store(agentName: string, key: string, value: any) {
    const memory = this.getAgentMemory(agentName);
    memory?.set(key, value);

    // Store in vector database for long-term memory
    if (this.pinecone) {
      try {
        const embedding = await this.embeddings.embedQuery(
          JSON.stringify({ key, value })
        );
        
        const index = await this.pinecone.Index("agent-memory");
        await index.upsert({
          upsertRequest: {
            vectors: [{
              id: `${agentName}-${key}-${Date.now()}`,
              values: embedding,
              metadata: {
                agentName,
                key,
                value: JSON.stringify(value),
                timestamp: new Date().toISOString()
              }
            }]
          }
        });
      } catch (error) {
        console.error("Error storing in Pinecone:", error);
      }
    }
  }

  async recall(agentName: string, key: string): Promise<any> {
    // Check short-term memory first
    const memory = this.getAgentMemory(agentName);
    if (memory?.has(key)) {
      return memory.get(key);
    }

    // Check long-term memory in Pinecone
    if (this.pinecone) {
      try {
        const query = JSON.stringify({ key });
        const queryEmbedding = await this.embeddings.embedQuery(query);
        
        const index = await this.pinecone.Index("agent-memory");
        const queryResponse = await index.query({
          queryRequest: {
            vector: queryEmbedding,
            filter: { agentName },
            topK: 1
          }
        });

        if (queryResponse.matches?.length) {
          const value = JSON.parse(queryResponse.matches[0].metadata.value);
          // Cache in short-term memory
          memory?.set(key, value);
          return value;
        }
      } catch (error) {
        console.error("Error querying Pinecone:", error);
      }
    }

    return null;
  }

  async broadcastMessage(from: string, message: string, recipients: string[]) {
    for (const recipient of recipients) {
      const queue = this.messageQueue.get(recipient);
      if (queue) {
        queue.push({ from, message });
      }
    }
    return true;
  }

  async getMessages(agentName: string): Promise<Array<{from: string, message: string}>> {
    const queue = this.messageQueue.get(agentName) || [];
    // Clear the queue after reading
    this.messageQueue.set(agentName, []);
    return queue;
  }
}
