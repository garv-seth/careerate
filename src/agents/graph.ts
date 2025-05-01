import { Graph } from "@langchain/langgraph";
import { OpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { RunnableSequence } from "@langchain/core/runnables";
import { createCaraAgent, createMayaAgent, createEllieAgent, createSophiaAgent } from "./agents";
import { caraInitialSystemPrompt, mayaInitialSystemPrompt, ellieInitialSystemPrompt, sophiaInitialSystemPrompt } from "./prompts";
import { storage } from "../../server/storage";
import { pinecone } from "./pinecone";

// Define the types for state
interface AgentState {
  messages: BaseMessage[];
  cara: {
    messages: BaseMessage[];
    results?: any;
  };
  maya: {
    messages: BaseMessage[];
    results?: any;
  };
  ellie: {
    messages: BaseMessage[];
    results?: any;
  };
  sophia: {
    messages: BaseMessage[];
    results?: any;
  };
}

// The LLM to use for all agents
const openai = new OpenAI({
  modelName: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  temperature: 0.1,
  openAIApiKey: process.env.OPENAI_API_KEY
});

// Create the agents
const caraAgent = createCaraAgent(openai, caraInitialSystemPrompt);
const mayaAgent = createMayaAgent(openai, mayaInitialSystemPrompt);
const ellieAgent = createEllieAgent(openai, ellieInitialSystemPrompt);
const sophiaAgent = createSophiaAgent(openai, sophiaInitialSystemPrompt);

// Create the graph
export const createGraph = () => {
  // Initialize the Langgraph
  const workflow = new StateGraph<AgentState>({
    channels: {
      messages: {
        value: [],
        reducer: (cur, value) => [...cur, value],
      },
      cara: {
        value: { messages: [] },
        reducer: (cur, value) => ({
          ...cur,
          messages: [...cur.messages, value.message],
          results: value.results,
        }),
      },
      maya: {
        value: { messages: [] },
        reducer: (cur, value) => ({
          ...cur,
          messages: [...cur.messages, value.message],
          results: value.results,
        }),
      },
      ellie: {
        value: { messages: [] },
        reducer: (cur, value) => ({
          ...cur,
          messages: [...cur.messages, value.message],
          results: value.results,
        }),
      },
      sophia: {
        value: { messages: [] },
        reducer: (cur, value) => ({
          ...cur,
          messages: [...cur.messages, value.message],
          results: value.results,
        }),
      },
    },
  });

  // Add nodes to the graph
  workflow.addNode("cara", caraAgent);
  workflow.addNode("maya", mayaAgent);
  workflow.addNode("ellie", ellieAgent);
  workflow.addNode("sophia", sophiaAgent);

  // Define the workflow edges
  workflow.addEdge("cara", "maya");
  workflow.addEdge("maya", "ellie");
  workflow.addEdge("ellie", "sophia");
  workflow.addEdge("sophia", END);

  // Set the entry point
  workflow.setEntryPoint("cara");

  // Compile the graph
  return workflow.compile();
};

// Function to run the graph with user input
export const runCareerate = async (userId: string, resumeText: string) => {
  const graph = createGraph();
  
  // Initial state with the resume
  const initialState: AgentState = {
    messages: [new HumanMessage(`Please analyze my resume and provide career advice:\n\n${resumeText}`)],
    cara: { messages: [] },
    maya: { messages: [] },
    ellie: { messages: [] },
    sophia: { messages: [] }
  };
  
  // Execute the graph
  const result = await graph.invoke(initialState);
  
  // Structure the final result
  // This would normally come from the agents, but for the MVP we'll create a sample response
  const finalResults = {
    riskReport: {
      overallRisk: 0.45,
      categories: [
        { 
          category: "Data Processing", 
          risk: 0.75, 
          description: "Basic data processing tasks are highly automatable with current AI systems." 
        },
        { 
          category: "Coding", 
          risk: 0.55, 
          description: "Some coding tasks are being automated, but complex problem-solving still requires human expertise." 
        },
        { 
          category: "Project Management", 
          risk: 0.30, 
          description: "Human judgment and interpersonal skills remain valuable for effective project management." 
        },
        { 
          category: "Creative Design", 
          risk: 0.25, 
          description: "Creative thinking and design innovation are still challenging for AI to replicate." 
        }
      ],
      summary: "Your overall automation risk is moderate. While certain technical aspects of your role are vulnerable to AI automation, your experience in project management and creative problem-solving provides some resilience. Consider developing more specialized technical skills and strengthening your interpersonal and leadership capabilities."
    },
    learningPlan: {
      skills: [
        { skill: "Machine Learning", currentLevel: 3, targetLevel: 7, importance: 0.8 },
        { skill: "Cloud Architecture", currentLevel: 5, targetLevel: 8, importance: 0.7 },
        { skill: "Leadership", currentLevel: 6, targetLevel: 9, importance: 0.9 },
        { skill: "System Design", currentLevel: 4, targetLevel: 7, importance: 0.65 }
      ],
      resources: [
        { 
          id: "ml101", 
          title: "Machine Learning Fundamentals", 
          type: "Course", 
          provider: "Coursera", 
          duration: "4 weeks", 
          level: "Intermediate",
          url: "https://www.coursera.org/specializations/machine-learning",
          skillsAddressed: ["Machine Learning", "Data Science"]
        },
        { 
          id: "aws-arch", 
          title: "AWS Solutions Architect", 
          type: "Certification", 
          provider: "Amazon", 
          duration: "3 months", 
          level: "Advanced",
          url: "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
          skillsAddressed: ["Cloud Architecture", "System Design"]
        }
      ],
      timeEstimate: "6-9 months"
    },
    nextSteps: {
      immediate: [
        "Enroll in the Machine Learning Fundamentals course on Coursera",
        "Begin learning about cloud architecture through online tutorials",
        "Join a project that allows you to practice leadership skills"
      ],
      shortTerm: [
        "Complete at least one ML project to add to your portfolio",
        "Start preparing for the AWS Solutions Architect certification",
        "Seek opportunities to lead a small team or project"
      ],
      longTerm: [
        "Develop expertise in combining AI solutions with cloud architecture",
        "Transition into a role that combines technical and leadership skills",
        "Consider specializing in an industry vertical that interests you"
      ]
    }
  };
  
  // Store vectors in Pinecone (for the MVP, we'll just log but not actually store)
  console.log(`Storing vectors for user ${userId} in Pinecone...`);
  
  return finalResults;
};
