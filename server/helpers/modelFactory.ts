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
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { BaseOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

// Read provider from environment or default to OpenAI
const LLM_PROVIDER = process.env.LLM_PROVIDER?.toLowerCase() || "gemini"; // Default to Gemini now that we have the API key

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
 * Simple JSON parser that can be used with Gemini
 * This is a simpler alternative to the built-in parsers
 */
export class SimpleJsonOutputParser<T extends z.ZodTypeAny> extends BaseOutputParser<z.infer<T>> {
  private schema: T;

  constructor(schema: T) {
    super();
    this.schema = schema;
  }

  async parse(text: string): Promise<z.infer<T>> {
    try {
      // Try to extract JSON from text
      const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      
      // Parse JSON
      const json = JSON.parse(jsonText);
      
      // Validate with schema
      return this.schema.parse(json);
    } catch (e) {
      console.error("Error parsing JSON:", e);
      throw new Error(`Failed to parse JSON: ${e}`);
    }
  }

  getFormatInstructions(): string {
    return `Return a JSON object that matches the following schema:
${JSON.stringify(this.schema.safeParse({}), null, 2)}

Always use proper JSON format with double quotes around keys and string values.
`;
  }
}

/**
 * Get the appropriate JSON parser based on the configured provider
 */
export function getJsonParser<T extends z.ZodTypeAny>(schema: T) {
  if (LLM_PROVIDER === "gemini" || LLM_PROVIDER === "google") {
    return new SimpleJsonOutputParser(schema);
  } else {
    return JsonOutputToolsParser.fromZodSchema(schema);
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