// server/helpers/modelFactory.ts

/**
 * Model Factory - Provides LLM abstractions for Careerate
 */
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { BaseOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

// Read provider from environment or default to Gemini
const LLM_PROVIDER = process.env.LLM_PROVIDER?.toLowerCase() || "gemini";

/**
 * Create a chat model instance based on the configured provider
 */
export function createChatModel(options: {
  temperature?: number;
  streaming?: boolean;
  modelName?: string;
}): BaseChatModel {
  const { temperature = 0.7, streaming = false, modelName } = options;

  if (LLM_PROVIDER === "gemini" || LLM_PROVIDER === "google") {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn(
        "GOOGLE_API_KEY is not set. Please set it to use Gemini models.",
      );
    }

    return new ChatGoogleGenerativeAI({
      apiKey,
      temperature,
      streaming,
      model: modelName || "gemini-2.0-flash-lite", // Always use Gemini 2.0 Flash Lite as default
    });
  } else {
    // Default to OpenAI if needed for fallback
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn(
        "OPENAI_API_KEY is not set. Please set it to use OpenAI models.",
      );
    }

    return new ChatOpenAI({
      openAIApiKey: apiKey,
      temperature,
      streaming,
      modelName: modelName || "gpt-4o-mini", // Default model
    });
  }
}

/**
 * Helper to get model information for logs
 */
export function getModelInfo(): string {
  if (LLM_PROVIDER === "gemini" || LLM_PROVIDER === "google") {
    return "Google Gemini 2.0 Flash Lite"; // Always return 2.0 Flash Lite
  } else {
    return "OpenAI GPT-4o Mini";
  }
}
