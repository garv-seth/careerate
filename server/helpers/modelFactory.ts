/**
 * Model Factory - Provides LLM abstractions for Careerate
 * 
 * This file provides a factory pattern for creating LLM instances
 * with support for different providers (OpenAI or Google Gemini)
 * controlled by an environment variable.
 */
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputToolsParser as OpenAIToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { JsonOutputParser as GeminiJsonParser } from "@langchain/google-genai/output_parsers";

// Read provider from environment or default to OpenAI
const LLM_PROVIDER = process.env.LLM_PROVIDER?.toLowerCase() || "openai";

/**
 * Create a chat model instance based on the configured provider
 * 
 * @param options Configuration options including temperature, etc.
 * @returns A BaseChatModel instance (either ChatOpenAI or ChatGoogleGenerativeAI)
 */
export function createChatModel(options: {
  temperature?: number;
  streaming?: boolean;
  modelName?: string;
}): BaseChatModel {
  const {
    temperature = 0.7,
    streaming = false,
    modelName,
  } = options;

  if (LLM_PROVIDER === "gemini" || LLM_PROVIDER === "google") {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn("GOOGLE_API_KEY is not set. Please set it to use Gemini models.");
    }

    return new ChatGoogleGenerativeAI({
      apiKey,
      temperature,
      streaming,
      model: modelName || "gemini-pro", // Default model
    });
  } else {
    // Default to OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OPENAI_API_KEY is not set. Please set it to use OpenAI models.");
    }

    return new ChatOpenAI({
      openAIApiKey: apiKey,
      temperature,
      streaming,
      modelName: modelName || "gpt-4-turbo-preview", // Default model
    });
  }
}

/**
 * Get the appropriate JSON parser based on the configured provider
 */
export function getJsonParser() {
  if (LLM_PROVIDER === "gemini" || LLM_PROVIDER === "google") {
    return GeminiJsonParser;
  } else {
    return OpenAIToolsParser;
  }
}

/**
 * Helper to get model information for logs
 */
export function getModelInfo(): string {
  if (LLM_PROVIDER === "gemini" || LLM_PROVIDER === "google") {
    return "Google Gemini Pro";
  } else {
    return "OpenAI GPT-4 Turbo";
  }
}