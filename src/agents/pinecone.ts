import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";

// Initialize Pinecone client safely
export let pinecone: Pinecone;
try {
  if (process.env.PINECONE_API_KEY) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  } else {
    console.log("Warning: PINECONE_API_KEY not provided, using mock implementation");
    // Create a minimal implementation that won't throw errors
    pinecone = {
      listIndexes: async () => ({ indexes: [] }) as any,
      createIndex: async () => ({}),
      Index: () => ({
        namespace: () => ({
          upsert: async () => ({}),
          query: async () => ({ matches: [] }),
        }),
      }),
    } as any;
  }
} catch (error) {
  console.error("Error initializing Pinecone:", error);
  // Create a minimal implementation that won't throw errors
  pinecone = {
    listIndexes: async () => ({ indexes: [] }) as any,
    createIndex: async () => ({}),
    Index: () => ({
      namespace: () => ({
        upsert: async () => ({}),
        query: async () => ({ matches: [] }),
      }),
    }),
  } as any;
}

// Initialize OpenAI embeddings safely
let embeddings: OpenAIEmbeddings;
try {
  if (process.env.OPENAI_API_KEY) {
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
    });
  } else {
    console.log("Warning: OPENAI_API_KEY not provided for embeddings, using mock implementation");
    // Create a minimal implementation that won't throw errors
    embeddings = {
      embedDocuments: async () => [[0.1, 0.2, 0.3]], // Return mock embeddings
      embedQuery: async () => [0.1, 0.2, 0.3], // Return mock embeddings
    } as any;
  }
} catch (error) {
  console.error("Error initializing OpenAI embeddings:", error);
  // Create a minimal implementation that won't throw errors
  embeddings = {
    embedDocuments: async () => [[0.1, 0.2, 0.3]], // Return mock embeddings
    embedQuery: async () => [0.1, 0.2, 0.3], // Return mock embeddings
  } as any;
}

// Export Pinecone index to be used by agents
export const getPineconeIndex = async () => {
  try {
    // Check if we have the necessary API keys
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_ENV) {
      console.log("Warning: Missing Pinecone API keys, returning mock index");
      // Return a mock index that won't throw errors
      return {
        namespace: () => ({
          upsert: async () => ({}),
          query: async () => ({ matches: [] }),
        }),
        // Add other required methods
        upsert: async () => ({}),
        query: async () => ({ matches: [] }),
      } as any;
    }

    // Get the index or create if doesn't exist
    const indexName = process.env.PINECONE_INDEX || "careerate";
    
    try {
      const indexList = await pinecone.listIndexes();
      const indexExists = indexList.indexes?.some((index: any) => index.name === indexName) || false;
      
      if (!indexExists) {
        console.log(`Creating new Pinecone index: ${indexName}`);
        // The Pinecone API has changed, so we need to adapt our code
        await pinecone.createIndex({
          name: indexName,
          dimension: 1536, // OpenAI embedding dimensions
          metric: "cosine",
          spec: {} as any // Use empty spec with type assertion
        });
        
        // Wait for index initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return pinecone.Index(indexName);
    } catch (indexError) {
      console.error("Error with Pinecone index operations:", indexError);
      // Return a mock index that won't throw errors
      return {
        namespace: () => ({
          upsert: async () => ({}),
          query: async () => ({ matches: [] }),
        }),
        // Add other required methods
        upsert: async () => ({}),
        query: async () => ({ matches: [] }),
      } as any;
    }
  } catch (error) {
    console.error("Error initializing Pinecone index:", error);
    // Return a mock index that won't throw errors
    return {
      namespace: () => ({
        upsert: async () => ({}),
        query: async () => ({ matches: [] }),
      }),
      // Add other required methods
      upsert: async () => ({}),
      query: async () => ({ matches: [] }),
    } as any;
  }
};

// Function to store a resume in the vector database
export const storeResumeEmbeddings = async (
  userId: string,
  resumeText: string,
  agentAnalyses: string[] = []
): Promise<string[]> => {
  try {
    const index = await getPineconeIndex();
    
    // Split resume into chunks for better retrieval
    const chunks = splitTextIntoChunks(resumeText);
    
    // Create documents with metadata for resume chunks
    const resumeDocuments = chunks.map(
      (chunk, i) => 
        new Document({
          pageContent: chunk,
          metadata: {
            userId,
            source: "resume",
            chunkIndex: i,
          },
        })
    );
    
    // Create documents for agent analyses results
    const analysisDocuments = agentAnalyses.map(
      (analysis, i) => 
        new Document({
          pageContent: analysis,
          metadata: {
            userId,
            source: "agent_analysis",
            agentIndex: i,
            agentType: i === 0 ? "maya" : i === 1 ? "ellie" : "sophia",
          },
        })
    );
    
    // Combine all documents
    const allDocuments = [...resumeDocuments, ...analysisDocuments];
    
    // Create the vector store and add the documents
    const vectorStore = await PineconeStore.fromDocuments(
      allDocuments,
      embeddings,
      {
        pineconeIndex: index,
        namespace: userId,
      }
    );
    
    // Return the vectorIds for reference
    return allDocuments.map((doc, i) => {
      const source = doc.metadata.source as string;
      // Use type assertions to handle the union type correctly
      const metadata = doc.metadata as any;
      const index = source === "resume" ? metadata.chunkIndex : metadata.agentIndex;
      return `${userId}-${source}-${index}`;
    });
  } catch (error) {
    console.error("Error storing resume embeddings:", error);
    return []; // Return empty array instead of throwing to prevent workflow interruption
  }
};

// Function to search for similar text from vector database
export const searchVectorStore = async (
  userId: string,
  query: string,
  k: number = 5
): Promise<any[]> => {
  try {
    const index = await getPineconeIndex();
    
    // Create vector store
    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      {
        pineconeIndex: index,
        namespace: userId,
      }
    );
    
    // Search for similar documents
    const results = await vectorStore.similaritySearch(query, k);
    return results;
  } catch (error) {
    console.error("Error searching vector store:", error);
    throw error;
  }
};

// Helper function to split text into chunks
const splitTextIntoChunks = (text: string, chunkSize: number = 1000, overlap: number = 200): string[] => {
  if (text.length <= chunkSize) {
    return [text];
  }
  
  const chunks: string[] = [];
  let currentIndex = 0;
  
  while (currentIndex < text.length) {
    let chunk = text.substring(currentIndex, currentIndex + chunkSize);
    
    // Adjust chunk to break at a better point if possible
    if (currentIndex + chunkSize < text.length) {
      const lastPeriod = chunk.lastIndexOf(".");
      const lastNewline = chunk.lastIndexOf("\n");
      
      // Prefer sentence boundaries or paragraph breaks
      const breakPoint = 
        lastPeriod > chunkSize * 0.7 ? lastPeriod + 1 : 
        lastNewline > chunkSize * 0.7 ? lastNewline + 1 : 
        chunkSize;
      
      chunk = text.substring(currentIndex, currentIndex + breakPoint);
      currentIndex += breakPoint - overlap;
    } else {
      // Last chunk doesn't need overlap adjustment
      currentIndex += chunkSize;
    }
    
    chunks.push(chunk);
  }
  
  return chunks;
};
