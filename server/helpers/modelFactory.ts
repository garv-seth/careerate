// server/helpers/modelFactory.ts (Updated)

/**
 * Model Factory - Provides LLM abstractions for Careerate
 * Updated to work in ESM environment with better error handling
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

// Import OpenAI dynamically to avoid require/ESM issues
let ChatOpenAI: any = null;
try {
  // Use dynamic import for OpenAI to avoid ESM/CommonJS conflicts
  import("@langchain/openai").then(module => {
    ChatOpenAI = module.ChatOpenAI;
    console.log("OpenAI ChatModel loaded successfully");
  }).catch(err => {
    console.warn("OpenAI import failed, using Gemini only:", err.message);
  });
} catch (error) {
  console.warn("OpenAI import failed, using Gemini only");
}

/**
 * Create a chat model instance with improved fallbacks
 */
export async function createChatModel(options: {
  temperature?: number;
  streaming?: boolean;
  modelName?: string;
}): Promise<BaseChatModel> {
  const { temperature = 0.7, streaming = false, modelName } = options;

  // Try to use OpenAI if available and API key is set
  if (process.env.OPENAI_API_KEY && ChatOpenAI) {
    try {
      return new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        temperature,
        streaming,
        modelName: modelName || "gpt-4o-mini", // Default to GPT-4o mini
      });
    } catch (error) {
      console.warn(
        "Failed to initialize OpenAI model, falling back to Gemini:",
        error
      );
    }
  }

  // Fall back to Google Gemini
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn(
      "GOOGLE_API_KEY is not set. Using Gemini without API key may fail."
    );
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    temperature,
    streaming,
    modelName: modelName || "gemini-2.0-flash-lite", // Use latest Gemini model
  });
}

/**
 * Helper to get model information for logs
 */
export function getModelInfo(): string {
  if (process.env.OPENAI_API_KEY && ChatOpenAI) {
    return "OpenAI GPT-4o Mini";
  }
  return "Google Gemini 2.0 Flash Lite";
}

/**
 * Check if OpenAI is available
 */
export function isOpenAIAvailable(): boolean {
  return !!(process.env.OPENAI_API_KEY && ChatOpenAI);
}