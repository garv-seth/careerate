import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { createChatModel } from "../helpers/modelFactory";

// Tool for career transition search
class CareerTransitionSearch extends StructuredTool {
  name = "career_search";
  description = "Search for career transition information and experiences";

  async _call(query: string) {
    const searcher = new TavilySearchResults({
      apiKey: process.env.TAVILY_API_KEY,
      maxResults: 10
    });
    return await searcher.invoke(query);
  }
}

// Define agent state
interface AgentState {
  messages: any[];
  currentStage: string;
  searchResults: any[];
  plan: any;
  nextAction: string;
}

export class ImprovedPlanExecuteAgent {
  private model: ChatOpenAI;
  private tools: StructuredTool[];
  private graph: any;

  constructor() {
    this.model = createChatModel({
      temperature: 0.7,
      modelName: "gpt-4-turbo-preview"
    });

    this.tools = [new CareerTransitionSearch()];
    this.graph = this.buildGraph();
  }

  private buildGraph() {
    // Define the agent state type
    const AgentStateType = Annotation.object({
      messages: Annotation.array(Annotation.any()),
      currentStage: Annotation.string(),
      searchResults: Annotation.array(Annotation.any()),
      plan: Annotation.any(),
      nextAction: Annotation.string()
    });

    // Create nodes
    const planNode = RunnableSequence.from([
      {
        messages: (state: AgentState) => [
          new SystemMessage("You are a career transition planning agent. Create a detailed plan."),
          ...state.messages
        ]
      },
      this.model,
      (output) => ({
        messages: output.content,
        plan: JSON.parse(output.content),
        nextAction: "execute"
      })
    ]);

    const executeNode = RunnableSequence.from([
      {
        messages: (state: AgentState) => [
          new SystemMessage("Execute the plan step by step. Use tools when needed."),
          new AIMessage(JSON.stringify(state.plan)),
          ...state.messages
        ]
      },
      this.model,
      async (output) => {
        if (output.additional_kwargs?.tool_calls) {
          const toolResults = await Promise.all(
            output.additional_kwargs.tool_calls.map(async (call: any) => {
              const tool = this.tools.find(t => t.name === call.function.name);
              if (tool) {
                return await tool._call(call.function.arguments);
              }
              return null;
            })
          );
          return {
            messages: [...output.content],
            searchResults: toolResults,
            nextAction: "analyze"
          };
        }
        return {
          messages: [...output.content],
          nextAction: "complete"
        };
      }
    ]);

    const analyzeNode = RunnableSequence.from([
      {
        messages: (state: AgentState) => [
          new SystemMessage("Analyze the search results and provide insights."),
          ...state.messages,
          new AIMessage(JSON.stringify(state.searchResults))
        ]
      },
      this.model,
      (output) => ({
        messages: [...output.content],
        nextAction: "complete"
      })
    ]);

    // Build the graph
    const workflow = new StateGraph({
      channels: AgentStateType
    });

    // Add nodes
    workflow.addNode("plan", planNode);
    workflow.addNode("execute", executeNode);
    workflow.addNode("analyze", analyzeNode);

    // Add edges
    workflow.addEdge("plan", "execute");
    workflow.addEdge("execute", "analyze");
    workflow.setFinishCondition((state) => state.nextAction === "complete");

    return workflow.compile();
  }

  // Main method to run the agent
  async run(query: string) {
    try {
      const initialState = {
        messages: [new HumanMessage(query)],
        currentStage: "planning",
        searchResults: [],
        plan: null,
        nextAction: "plan"
      };

      const result = await this.graph.invoke(initialState);
      return result;
    } catch (error) {
      console.error("Error in plan-execute agent:", error);
      throw error;
    }
  }
}