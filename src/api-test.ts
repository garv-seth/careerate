/**
 * API Test Script
 * 
 * This script tests all the external API connections used by the application.
 * Run it to verify that all APIs are properly connected and functioning.
 */
import { queryPerplexity } from './agents/perplexity';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';

async function testAllAPIs() {
  console.log("🔍 Starting API tests...");
  
  // Test OpenAI
  try {
    console.log("\n🧠 Testing OpenAI...");
    if (!process.env.OPENAI_API_KEY) {
      console.log("⚠️ OPENAI_API_KEY not found");
    } else {
      const openai = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      
      const response = await openai.invoke("What is today's date?");
      console.log("✅ OpenAI test successful!");
      console.log("Response:", response.content);
    }
  } catch (error) {
    console.error("❌ OpenAI test failed:", error);
  }
  
  // Test OpenAI Embeddings
  try {
    console.log("\n📊 Testing OpenAI Embeddings...");
    if (!process.env.OPENAI_API_KEY) {
      console.log("⚠️ OPENAI_API_KEY not found");
    } else {
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "text-embedding-3-small",
      });
      
      const embedding = await embeddings.embedQuery("Test embedding");
      console.log("✅ OpenAI Embeddings test successful!");
      console.log(`Generated embedding of length ${embedding.length}`);
    }
  } catch (error) {
    console.error("❌ OpenAI Embeddings test failed:", error);
  }
  
  // Test Pinecone
  try {
    console.log("\n📍 Testing Pinecone...");
    if (!process.env.PINECONE_API_KEY) {
      console.log("⚠️ PINECONE_API_KEY not found");
    } else {
      const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      
      const indexes = await pinecone.listIndexes();
      console.log("✅ Pinecone test successful!");
      console.log(`Found ${indexes.indexes?.length || 0} indexes`);
      if (indexes.indexes && indexes.indexes.length > 0) {
        console.log("Available indexes:", indexes.indexes.map(idx => idx.name).join(", "));
      } else {
        console.log("No indexes found");
      }
    }
  } catch (error) {
    console.error("❌ Pinecone test failed:", error);
  }
  
  // Test Perplexity
  try {
    console.log("\n🔮 Testing Perplexity API...");
    if (!process.env.PERPLEXITY_API_KEY) {
      console.log("⚠️ PERPLEXITY_API_KEY not found");
    } else {
      const response = await queryPerplexity("What is today's date?");
      console.log("✅ Perplexity test successful!");
      console.log("Response:", response.substring(0, 100) + "...");
    }
  } catch (error) {
    console.error("❌ Perplexity test failed:", error);
  }
  
  console.log("\n🏁 API tests completed!");
}

// Run the tests
testAllAPIs().catch(err => console.error("Error running API tests:", err));