/**
 * Test script for Google Gemini integration
 * 
 * This script tests the Gemini integration using our model factory abstraction
 */
import { createChatModel, getJsonParser } from "./helpers/modelFactory";
import { z } from "zod";

async function testGeminiIntegration() {
  console.log("Testing Google Gemini integration...");

  try {
    // Create a model using our factory
    const model = createChatModel({
      temperature: 0.7
    });

    console.log("Model initialized successfully");

    // Test a simple completion
    console.log("Testing simple completion...");
    const completion = await model.invoke("What are the key skills needed for a software engineer?");
    console.log("Simple completion response:", completion.content.toString().substring(0, 150) + "...");

    // Test structured output with our parser
    console.log("Testing structured output...");
    const skillSchema = z.object({
      skills: z.array(z.object({
        name: z.string().describe("Name of the skill"),
        importance: z.enum(["Low", "Medium", "High"]).describe("Importance level"),
        description: z.string().describe("Brief description")
      })).describe("List of key skills")
    });

    const parser = getJsonParser(skillSchema);
    
    const structuredPrompt = `List the top 5 skills needed for a software engineer in 2025.
${parser.getFormatInstructions()}`;

    const structuredResponse = await model.invoke(structuredPrompt);
    const parsedSkills = await parser.parse(structuredResponse.content.toString());
    
    console.log("Structured output successfully parsed:");
    console.log(JSON.stringify(parsedSkills, null, 2));

    console.log("Gemini integration test completed successfully!");
  } catch (error) {
    console.error("Error testing Gemini integration:", error);
  }
}

// Run the test
testGeminiIntegration();