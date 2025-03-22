import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { createChatModel } from "../helpers/modelFactory";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

/**
 * A simplified Plan-Execute agent that uses the createReactAgent from LangGraph
 * This is a more straightforward implementation that avoids the complex StateGraph setup
 */
export class ImprovedPlanExecuteAgent {
  agent: any;

  constructor() {
    // Initialize tools
    const searchTool = new TavilySearchResults({
      maxResults: 5
    });

    // Create a model with appropriate temperature for planning using the factory
    // This will use Gemini instead of OpenAI based on the environment setting
    const model = createChatModel({
      temperature: 0.2,  // Lower temperature for more consistent results
      modelName: "gemini-1.5-pro" // Explicitly use Gemini model
    });

    // Create the agent using prebuilt React agent pattern
    this.agent = createReactAgent({
      llm: model, 
      tools: [searchTool]
    });
  }

  /**
   * Run the agent to analyze a career transition
   * 
   * @param query The career transition query to analyze
   * @returns The agent's response with skill gaps and insights
   */
  async run(query: string): Promise<any> {
    try {
      console.log(`Running ImprovedPlanExecuteAgent with query: ${query}`);
      
      // Create the initial state with system and human messages
      const initialState = {
        messages: [
          new SystemMessage(`You are a career transition planning and analysis agent.

Your goal is to analyze career transitions between different roles and industries.
For any career transition query:
1. Break down the analysis into clear steps
2. Search for relevant information about the transition
3. Identify skill gaps, challenges, and success factors
4. Provide concrete recommendations

Format your final response as valid JSON with these exact keys:
{
  "skillGaps": [
    {
      "skillName": "string",
      "gapLevel": "Low|Medium|High",
      "confidenceScore": number,
      "mentionCount": number,
      "contextSummary": "string"
    }
  ],
  "insights": {
    "keyObservations": ["string"],
    "successRate": number,
    "commonChallenges": ["string"]
  },
  "successFactors": ["string"]
}

Always search for accurate and up-to-date information. Do not make up data.`),
          new HumanMessage(`Analyze this career transition: ${query}`)
        ]
      };

      // Invoke the agent with the initial state
      const result = await this.agent.invoke(initialState);
      
      // Process the result - extract content from final message
      const finalMessage = result.messages[result.messages.length - 1];
      
      console.log("Agent execution completed successfully");
      
      let responseContent;
      try {
        // Try to extract JSON from the content
        const content = finalMessage.content;
        const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
          responseContent = JSON.parse(jsonMatch[0]);
        } else {
          responseContent = { error: "Could not extract JSON from response" };
        }
      } catch (parseError) {
        console.error("Error parsing agent response as JSON:", parseError);
        responseContent = { 
          error: "Failed to parse response", 
          rawContent: finalMessage.content 
        };
      }
      
      return {
        messages: result.messages,
        content: responseContent
      };
    } catch (error: any) {
      console.error("Error in ImprovedPlanExecuteAgent.run:", error);
      throw new Error(`Failed to analyze career transition: ${error.message}`);
    }
  }
}