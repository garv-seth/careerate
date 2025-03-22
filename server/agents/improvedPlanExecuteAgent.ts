import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { createChatModel } from "../helpers/modelFactory";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
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

    // Create a model with appropriate temperature for planning
    const model = createChatModel({
      temperature: 0.2,  // Lower temperature for more consistent results
      modelName: "gpt-4-turbo-preview"
    });

    // Create the agent using prebuilt React agent pattern
    this.agent = createReactAgent({
      llm: model, 
      tools: [searchTool],
      // System message
      agentType: "chat"
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
      
      // Create the initial state with messages
      const initialState = {
        messages: [
          new HumanMessage(`You are a career transition planning and analysis agent.

Your goal is to analyze career transitions between different roles and industries.
For any career transition query:
1. Break down the analysis into clear steps
2. Search for relevant information about the transition
3. Identify skill gaps, challenges, and success factors
4. Provide concrete recommendations
5. Format your final response as JSON with these keys:
   - skillGaps: array of {skillName, gapLevel, confidenceScore, mentionCount, contextSummary}
   - insights: object with key observations about the transition
   - success factors: array of most important factors for success

Always search for accurate and up-to-date information. Do not make up data.

Now analyze this transition: ${query}`)
        ]
      };

      // Invoke the agent with the initial state
      const result = await this.agent.invoke(initialState);
      
      // Process the result
      const finalMessage = result.messages[result.messages.length - 1];
      
      console.log("Agent execution completed successfully");
      return {
        messages: result.messages,
        content: finalMessage.content
      };
    } catch (error: any) {
      console.error("Error in ImprovedPlanExecuteAgent.run:", error);
      throw new Error(`Failed to analyze career transition: ${error.message}`);
    }
  }
}