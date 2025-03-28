// server/helpers/modelFactory.ts

/**
 * Model Factory - Provides LLM abstractions for Careerate
 * This version eliminates all OpenAI dependencies and uses only Gemini 2.0 Flash Lite
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

/**
 * Create a chat model instance - always uses Gemini
 */
export function createChatModel(options: {
  temperature?: number;
  streaming?: boolean;
  modelName?: string;
}): BaseChatModel {
  const { temperature = 0.7, streaming = false, modelName } = options;

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
    modelName: modelName || "gemini-2.0-flash-lite", // Always use Gemini 2.0 Flash Lite as default
  });
}

/**
 * Helper to get model information for logs
 */
export function getModelInfo(): string {
  return "Google Gemini 2.0 Flash Lite";
}
