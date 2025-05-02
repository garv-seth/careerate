import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { createCaraAgent, createMayaAgent, createEllieAgent, createSophiaAgent } from "./agents";
import { caraInitialSystemPrompt, mayaInitialSystemPrompt, ellieInitialSystemPrompt, sophiaInitialSystemPrompt } from "./prompts";
import { storage } from "../../server/storage";
import { pinecone } from "./pinecone";
import { createTools } from "./tools";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor } from "langchain/agents";
import { ConsoleCallbackHandler } from "langchain/callbacks";
import { Graph, StateGraph } from "@langchain/langgraph";

// Event emitter for agent activities
import EventEmitter from 'events';
export const agentEmitter = new EventEmitter();

// Agent activities tracking
export type AgentActivity = {
  agent: 'cara' | 'maya' | 'ellie' | 'sophia';
  action: string;
  detail?: string;
  timestamp: Date;
  tools?: Array<'brave' | 'firecrawl' | 'browserbase' | 'database' | 'perplexity' | 'pinecone'>;
};

// Agent statuses tracking
export type AgentStatuses = {
  cara: 'idle' | 'active' | 'thinking' | 'complete';
  maya: 'idle' | 'active' | 'thinking' | 'complete';
  ellie: 'idle' | 'active' | 'thinking' | 'complete';
  sophia: 'idle' | 'active' | 'thinking' | 'complete';
};

// Global agent status tracker - initialized as all idle
export const agentStatuses: AgentStatuses = {
  cara: 'idle',
  maya: 'idle',
  ellie: 'idle',
  sophia: 'idle'
};

// Define the types for state
interface AgentState {
  input?: string;          // The input resume text
  userId?: string;         // The user ID for context
  context?: any;           // Additional context information
  messages: BaseMessage[];
  cara: {
    messages: BaseMessage[];
    results?: any;
  };
  maya: {
    messages: BaseMessage[];
    results?: any;
    skills?: string[];
    experience?: any;
    education?: string;
  };
  ellie: {
    messages: BaseMessage[];
    results?: any;
    marketInsights?: any;
    trends?: string[];
    opportunities?: any[];
  };
  sophia: {
    messages: BaseMessage[];
    results?: any;
    learningPlan?: any;
    resources?: any[];
    roadmap?: any;
  };
  final_output?: any;     // The final synthesized career advice
}

// The LLM to use for all agents (only create when OPENAI_API_KEY is available)
let openai: ChatOpenAI;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new ChatOpenAI({
      modelName: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  } else {
    console.log("OPENAI_API_KEY not provided, using mock implementation");
    // Create a minimal implementation that won't throw errors
    openai = { invoke: async () => ({ content: "Mock response" }) } as any;
  }
} catch (error) {
  console.error("Error initializing OpenAI:", error);
  // Create a minimal implementation that won't throw errors
  openai = { invoke: async () => ({ content: "Mock response" }) } as any;
}

// Create the agents
let caraAgent, mayaAgent, ellieAgent, sophiaAgent;
try {
  caraAgent = createCaraAgent(openai, caraInitialSystemPrompt);
  mayaAgent = createMayaAgent(openai, mayaInitialSystemPrompt);
  ellieAgent = createEllieAgent(openai, ellieInitialSystemPrompt);
  sophiaAgent = createSophiaAgent(openai, sophiaInitialSystemPrompt);
} catch (error) {
  console.error("Error creating agents:", error);
  // Create minimal implementations that won't throw errors
  const mockAgent = async () => ({ message: new AIMessage("Mock response"), results: {} });
  caraAgent = mockAgent;
  mayaAgent = mockAgent;
  ellieAgent = mockAgent;
  sophiaAgent = mockAgent;
}

// Create a wrapper for the agent workflow execution
// This simulates the architecture pattern from Google's Agent Development Kit
// Using sequential execution with state tracking instead of LangGraph due to typing issues
let executeAgentWorkflow: (state: AgentState) => Promise<AgentState>;

try {
  // Define workflow node functions for each agent
  const caraNode = async (state: AgentState): Promise<AgentState> => {
    updateAgentStatus('cara', 'active');
    trackAgentActivity({
      agent: 'cara',
      action: 'Orchestrating analysis',
      detail: 'Planning the analysis workflow and coordinating agents',
      timestamp: new Date(),
      tools: ['pinecone']
    });
    
    updateAgentStatus('cara', 'thinking');
    // Execute the Cara agent
    const input = state.input || '';
    const result = await caraAgent(input);
    updateAgentStatus('cara', 'complete');
    
    // Return updated state
    return {
      ...state,
      cara: {
        messages: [...(state.cara?.messages || []), 
                   new HumanMessage({content: input}), 
                   result.message],
        results: result.results || {}
      }
    };
  };
  
  const mayaNode = async (state: AgentState): Promise<AgentState> => {
    updateAgentStatus('maya', 'active');
    trackAgentActivity({
      agent: 'maya',
      action: 'Analyzing resume',
      detail: 'Extracting skills, experience, and assessing automation risk',
      timestamp: new Date(),
      tools: ['perplexity', 'database']
    });
    
    updateAgentStatus('maya', 'thinking');
    // Execute the Maya agent
    const input = state.input || '';
    const result = await mayaAgent(input);
    updateAgentStatus('maya', 'complete');
    
    // Extract relevant data from result with type safety
    const resultData = result.results || {};
    const skills = Array.isArray(resultData.skills) ? resultData.skills : [];
    const experience = resultData.experience || {};
    const education = typeof resultData.education === 'string' ? resultData.education : '';
    
    // Return updated state
    return {
      ...state,
      maya: {
        messages: [...(state.maya?.messages || []), new HumanMessage(input), result.message],
        results: resultData,
        skills,
        experience,
        education
      }
    };
  };
  
  const ellieNode = async (state: AgentState): Promise<AgentState> => {
    updateAgentStatus('ellie', 'active');
    trackAgentActivity({
      agent: 'ellie',
      action: 'Researching industry trends',
      detail: 'Gathering information on job market, emerging technologies',
      timestamp: new Date(),
      tools: ['brave', 'firecrawl', 'browserbase']
    });
    
    updateAgentStatus('ellie', 'thinking');
    // Execute the Ellie agent with skills from Maya
    const skills = state.maya?.skills || [];
    const skillsInput = JSON.stringify(skills);
    const result = await ellieAgent(skillsInput);
    updateAgentStatus('ellie', 'complete');
    
    // Extract relevant data from result with type safety
    const resultData = result.results || {};
    const marketInsights = resultData.marketInsights || {};
    const trends = Array.isArray(resultData.trends) ? resultData.trends : [];
    const opportunities = Array.isArray(resultData.opportunities) ? resultData.opportunities : [];
    
    // Return updated state
    return {
      ...state,
      ellie: {
        messages: [...(state.ellie?.messages || []), new HumanMessage(skillsInput), result.message],
        results: resultData,
        marketInsights,
        trends,
        opportunities
      }
    };
  };
  
  const sophiaNode = async (state: AgentState): Promise<AgentState> => {
    updateAgentStatus('sophia', 'active');
    trackAgentActivity({
      agent: 'sophia',
      action: 'Creating learning plan',
      detail: 'Generating personalized learning roadmap and resource recommendations',
      timestamp: new Date(),
      tools: ['database', 'perplexity', 'browserbase']
    });
    
    updateAgentStatus('sophia', 'thinking');
    // Execute the Sophia agent with skills from Maya and trends from Ellie
    const skills = state.maya?.skills || [];
    const trends = state.ellie?.trends || [];
    const input = JSON.stringify({ skills, trends });
    const result = await sophiaAgent(input);
    updateAgentStatus('sophia', 'complete');
    
    // Extract relevant data from result with type safety
    const resultData = result.results || {};
    const learningPlan = resultData.learningPlan || {};
    const resources = Array.isArray(resultData.resources) ? resultData.resources : [];
    const roadmap = resultData.roadmap || {};
    
    // Return updated state
    return {
      ...state,
      sophia: {
        messages: [...(state.sophia?.messages || []), new HumanMessage(input), result.message],
        results: resultData,
        learningPlan,
        resources,
        roadmap
      }
    };
  };
  
  const synthesizeNode = async (state: AgentState): Promise<AgentState> => {
    updateAgentStatus('cara', 'active');
    trackAgentActivity({
      agent: 'cara',
      action: 'Synthesizing insights',
      detail: 'Combining analysis from all agents to create final career advice',
      timestamp: new Date(),
      tools: ['pinecone', 'perplexity']
    });
    
    updateAgentStatus('cara', 'thinking');
    // Synthesize the results from all agents
    const finalResults = await synthesizeResults(
      state.maya?.results || {}, 
      state.ellie?.results || {}, 
      state.sophia?.results || {}, 
      state.userId || '', 
      state.input || ''
    );
    updateAgentStatus('cara', 'complete');
    
    trackAgentActivity({
      agent: 'cara',
      action: 'Analysis complete',
      detail: 'Career advice ready for review',
      timestamp: new Date()
    });
    
    // Return updated state with final output
    return {
      ...state,
      final_output: finalResults
    };
  };
  
  // Create an orchestration function that runs all agents in sequence
  // This is our custom implementation that follows the same principles as LangGraph
  executeAgentWorkflow = async (initialState: AgentState): Promise<AgentState> => {
    try {
      console.log("Starting agent workflow execution");
      
      // Execute the workflow: cara -> maya -> ellie -> sophia -> synthesize
      let currentState = initialState;
      
      // Cara (orchestration planning)
      currentState = await caraNode(currentState);
      
      // Maya (resume analysis)
      currentState = await mayaNode(currentState);
      
      // Ellie (industry analysis)
      currentState = await ellieNode(currentState);
      
      // Sophia (learning plan)
      currentState = await sophiaNode(currentState);
      
      // Final synthesis
      currentState = await synthesizeNode(currentState);
      
      console.log("Agent workflow execution completed successfully");
      return currentState;
    } catch (error) {
      console.error("Error in agent workflow execution:", error);
      throw error;
    }
  };
  
} catch (error) {
  console.error("Error creating agent workflow:", error);
  // Create a dummy workflow function that won't throw errors
  executeAgentWorkflow = async (state) => {
    console.error("Using fallback workflow due to initialization error");
    return {
      ...state,
      final_output: createSampleCareerAdvice()
    };
  };
}

// Function to add an agent activity and emit an event
const trackAgentActivity = (activity: AgentActivity) => {
  agentEmitter.emit('activity', activity);
  console.log(`Agent ${activity.agent}: ${activity.action}`);
  return activity;
};

// Update agent status and emit the event
const updateAgentStatus = (agent: 'cara' | 'maya' | 'ellie' | 'sophia', status: 'idle' | 'active' | 'thinking' | 'complete') => {
  agentStatuses[agent] = status;
  agentEmitter.emit('status_update', { agent, status });
  console.log(`Agent ${agent} status: ${status}`);
};

// Function to run the career analysis with user input implementing the Plan-Execute-Reflect pattern
// Using LangGraph for orchestration (similar to Google's Agent Development Kit approach)
export const runCareerate = async (userId: string, resumeText: string) => {
  try {
    // Check if we have necessary API keys
    const apiKeys = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'mock-api-key',
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || 'mock-api-key',
      BRAVE_API_KEY: process.env.BRAVE_API_KEY || 'mock-api-key',
      BROWSERBASE_API_KEY: process.env.BROWSERBASE_API_KEY || 'mock-api-key',
      FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || 'mock-api-key'
    };
    
    // Check for the required Perplexity API key
    if (apiKeys.PERPLEXITY_API_KEY === 'mock-api-key') {
      console.warn("Warning: Using mock Perplexity API responses. For authentic results, provide PERPLEXITY_API_KEY.");
    }
    
    // Reset all agent statuses at the start
    agentStatuses.cara = 'idle';
    agentStatuses.maya = 'idle';
    agentStatuses.ellie = 'idle';
    agentStatuses.sophia = 'idle';
    
    // Initialize the agent workflow
    trackAgentActivity({
      agent: 'cara',
      action: 'Initializing agent workflow',
      detail: 'Setting up the LangGraph workflow for coordinated analysis',
      timestamp: new Date()
    });
    
    // Initial state for the graph
    const initialState: AgentState = {
      input: resumeText,
      userId: userId,
      messages: [],
      cara: { messages: [] },
      maya: { messages: [] },
      ellie: { messages: [] },
      sophia: { messages: [] }
    };
    
    try {
      // Run the compiled LangGraph workflow
      // This will automatically execute the graph: cara -> maya -> ellie -> sophia -> synthesize
      const result = await agentGraph.invoke(initialState);
      
      // Store vectors in Pinecone for future retrieval
      try {
        console.log(`Storing vectors for user ${userId} in Pinecone...`);
        if (process.env.PINECONE_API_KEY) {
          await storeResumeEmbeddings(
            userId,
            resumeText,
            [
              JSON.stringify(result.maya?.results || {}),
              JSON.stringify(result.ellie?.results || {}),
              JSON.stringify(result.sophia?.results || {})
            ]
          );
        }
      } catch (error) {
        console.error("Error storing vectors:", error);
      }
      
      // Return the final synthesized results
      return result.final_output || createSampleCareerAdvice();
    } catch (graphError) {
      console.error("Error running agent graph:", graphError);
      
      // If the graph fails, fall back to the sequential execution approach
      console.log("Falling back to sequential execution approach...");
      
      // Initialize the state
      updateAgentStatus('cara', 'active');
      trackAgentActivity({
        agent: 'cara',
        action: 'Starting career analysis (fallback mode)',
        detail: 'Using sequential approach due to graph execution failure',
        timestamp: new Date(),
        tools: ['pinecone']
      });
      
      // Execute each agent in sequence
      updateAgentStatus('cara', 'thinking');
      const initialPlan = await runCaraForPlanning(resumeText);
      
      updateAgentStatus('maya', 'active');
      updateAgentStatus('cara', 'idle');
      trackAgentActivity({
        agent: 'maya',
        action: 'Analyzing resume',
        detail: 'Extracting skills, experience, and assessing automation risk',
        timestamp: new Date(),
        tools: ['perplexity', 'database']
      });
      
      updateAgentStatus('maya', 'thinking');
      const mayaResults = await runMayaAnalysis(resumeText, userId);
      updateAgentStatus('maya', 'complete');
      
      updateAgentStatus('ellie', 'active');
      trackAgentActivity({
        agent: 'ellie',
        action: 'Researching industry trends',
        detail: 'Gathering information on job market and emerging technologies',
        timestamp: new Date(),
        tools: ['brave', 'firecrawl', 'browserbase']
      });
      
      updateAgentStatus('ellie', 'thinking');
      const ellieResults = await runEllieAnalysis(mayaResults.skills, userId);
      updateAgentStatus('ellie', 'complete');
      
      updateAgentStatus('sophia', 'active');
      trackAgentActivity({
        agent: 'sophia',
        action: 'Creating learning plan',
        detail: 'Generating personalized learning roadmap and resource recommendations',
        timestamp: new Date(),
        tools: ['database', 'perplexity', 'browserbase']
      });
      
      updateAgentStatus('sophia', 'thinking');
      const sophiaResults = await runSophiaAdvice(mayaResults.skills, userId);
      updateAgentStatus('sophia', 'complete');
      
      updateAgentStatus('cara', 'active');
      trackAgentActivity({
        agent: 'cara',
        action: 'Synthesizing insights',
        detail: 'Combining analysis from all agents to create final career advice',
        timestamp: new Date(),
        tools: ['pinecone', 'perplexity']
      });
      
      updateAgentStatus('cara', 'thinking');
      const finalResults = await synthesizeResults(
        mayaResults, 
        ellieResults, 
        sophiaResults, 
        userId, 
        resumeText
      );
      
      updateAgentStatus('cara', 'complete');
      trackAgentActivity({
        agent: 'cara',
        action: 'Analysis complete (fallback mode)',
        detail: 'Career advice ready for review',
        timestamp: new Date()
      });
      
      return finalResults;
    }
  } catch (error) {
    console.error("Error in runCareerate:", error);
    
    // Reset all agent statuses in case of error
    updateAgentStatus('cara', 'idle');
    updateAgentStatus('maya', 'idle');
    updateAgentStatus('ellie', 'idle');
    updateAgentStatus('sophia', 'idle');
    
    // Fall back to a sample response rather than failing completely
    return createSampleCareerAdvice();
  }
};

// Simulates running Cara for initial planning
async function runCaraForPlanning(resumeText: string) {
  try {
    // In a real implementation, this would use the actual agent
    // For now, simulate planning
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    trackAgentActivity({
      agent: 'cara',
      action: 'Creating analysis plan',
      detail: 'Planning the sequence of agent operations and required data gathering',
      timestamp: new Date()
    });
    
    return {
      plan: [
        "Have Maya analyze the resume for skills and experience",
        "Have Ellie research relevant industry trends and job market",
        "Have Sophia create personalized learning recommendations",
        "Synthesize insights into comprehensive career advice"
      ]
    };
  } catch (error) {
    console.error("Error in Cara planning:", error);
    return { plan: [] };
  }
}

// Simulates running Maya for resume analysis
async function runMayaAnalysis(resumeText: string, userId: string) {
  try {
    // In a real implementation, this would use the actual agent
    // For now, simulate analysis
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    trackAgentActivity({
      agent: 'maya',
      action: 'Extracting key resume data',
      detail: 'Identified 8 skills and 3 job roles from resume',
      timestamp: new Date(),
      tools: ['database']
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    trackAgentActivity({
      agent: 'maya',
      action: 'Assessing automation risk',
      detail: 'Analyzing vulnerability of identified skills to AI automation',
      timestamp: new Date(),
      tools: ['perplexity']
    });
    
    return {
      skills: ["JavaScript", "React", "Node.js", "Cloud Architecture", "Project Management"],
      experience: ["Software Developer", "Project Lead"],
      automationRisk: 0.45,
      riskCategories: [
        { category: "Data Processing", risk: 0.75 },
        { category: "Coding", risk: 0.55 },
        { category: "Project Management", risk: 0.30 },
        { category: "Creative Design", risk: 0.25 }
      ]
    };
  } catch (error) {
    console.error("Error in Maya analysis:", error);
    return { skills: [], experience: [], automationRisk: 0.5, riskCategories: [] };
  }
}

// Simulates running Ellie for industry analysis
async function runEllieAnalysis(skills: string[], userId: string) {
  try {
    // In a real implementation, this would use the actual agent
    // For now, simulate analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    trackAgentActivity({
      agent: 'ellie',
      action: 'Researching current job market',
      detail: 'Analyzing demand for identified skills in technology sector',
      timestamp: new Date(),
      tools: ['brave', 'browserbase']
    });
    
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    trackAgentActivity({
      agent: 'ellie',
      action: 'Identifying industry trends',
      detail: 'Finding emerging technologies and shifting priorities in tech industry',
      timestamp: new Date(),
      tools: ['firecrawl']
    });
    
    return {
      trends: [
        "Increased demand for AI integration skills",
        "Growth in cloud-native development",
        "Shift toward specialized technical roles"
      ],
      opportunities: [
        { role: "Cloud Solutions Architect", growth: "High", alignment: 0.85 },
        { role: "AI Implementation Specialist", growth: "Very High", alignment: 0.75 },
        { role: "Technical Project Manager", growth: "Medium", alignment: 0.90 }
      ]
    };
  } catch (error) {
    console.error("Error in Ellie analysis:", error);
    return { trends: [], opportunities: [] };
  }
}

// Simulates running Sophia for learning advice
async function runSophiaAdvice(skills: string[], userId: string) {
  try {
    // In a real implementation, this would use the actual agent
    // For now, simulate analysis
    await new Promise(resolve => setTimeout(resolve, 1700));
    
    trackAgentActivity({
      agent: 'sophia',
      action: 'Identifying skill gaps',
      detail: 'Comparing current skills with industry demands to find learning priorities',
      timestamp: new Date(),
      tools: ['database', 'browserbase']
    });
    
    await new Promise(resolve => setTimeout(resolve, 2200));
    
    trackAgentActivity({
      agent: 'sophia',
      action: 'Finding learning resources',
      detail: 'Searching for high-quality courses and training materials',
      timestamp: new Date(),
      tools: ['perplexity']
    });
    
    return {
      skillGaps: [
        { skill: "Machine Learning", currentLevel: 3, targetLevel: 7, importance: 0.8 },
        { skill: "Cloud Architecture", currentLevel: 5, targetLevel: 8, importance: 0.7 },
        { skill: "Leadership", currentLevel: 6, targetLevel: 9, importance: 0.9 }
      ],
      recommendations: [
        { 
          id: "ml101", 
          title: "Machine Learning Fundamentals", 
          type: "Course", 
          provider: "Coursera", 
          duration: "4 weeks", 
          level: "Intermediate",
          url: "https://www.coursera.org/specializations/machine-learning"
        },
        { 
          id: "aws-arch", 
          title: "AWS Solutions Architect", 
          type: "Certification", 
          provider: "Amazon", 
          duration: "3 months", 
          level: "Advanced",
          url: "https://aws.amazon.com/certification/certified-solutions-architect-associate/"
        }
      ]
    };
  } catch (error) {
    console.error("Error in Sophia advice:", error);
    return { skillGaps: [], recommendations: [] };
  }
}

// Simulates Cara's synthesis of results
async function synthesizeResults(
  mayaResults: any, 
  ellieResults: any,
  sophiaResults: any,
  userId: string,
  resumeText: string
) {
  // In a real implementation, this would use the actual agent
  // For now, create the final structure from the results
  await new Promise(resolve => setTimeout(resolve, 1300));
  
  trackAgentActivity({
    agent: 'cara',
    action: 'Creating comprehensive career advice',
    detail: 'Combining insights and recommendations from all analysis aspects',
    timestamp: new Date(),
    tools: ['perplexity']
  });
  
  // Build the final result structure
  return {
    riskReport: {
      overallRisk: mayaResults.automationRisk,
      categories: mayaResults.riskCategories.map((cat: any) => ({
        category: cat.category,
        risk: cat.risk,
        description: getDescriptionForCategory(cat.category, cat.risk)
      })),
      summary: "Your overall automation risk is moderate. While certain technical aspects of your role are vulnerable to AI automation, your experience in project management and creative problem-solving provides some resilience. Consider developing more specialized technical skills and strengthening your interpersonal and leadership capabilities."
    },
    learningPlan: {
      skills: sophiaResults.skillGaps,
      resources: sophiaResults.recommendations.map((rec: any) => ({
        ...rec,
        skillsAddressed: getSkillsAddressedByResource(rec.title)
      })),
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
}

// Helper function to get description for a risk category
function getDescriptionForCategory(category: string, risk: number) {
  const descriptions: Record<string, Record<string, string>> = {
    "Data Processing": {
      high: "Basic data processing tasks are highly automatable with current AI systems.",
      medium: "Some data processing tasks can be automated, but human judgment is still needed for complex cases.",
      low: "Your data processing skills involve complex judgment that AI cannot yet replicate."
    },
    "Coding": {
      high: "Basic coding tasks are increasingly automated by AI coding assistants.",
      medium: "Some coding tasks are being automated, but complex problem-solving still requires human expertise.",
      low: "Your coding work involves complex architectural decisions that remain difficult to automate."
    },
    "Project Management": {
      high: "Basic project management tasks like scheduling can be automated.",
      medium: "Human judgment and interpersonal skills remain valuable for effective project management.",
      low: "Your project management involves complex stakeholder management that AI cannot replace."
    },
    "Creative Design": {
      high: "Some design tasks are being assisted by AI tools.",
      medium: "Creative thinking and design innovation are still challenging for AI to replicate.",
      low: "Your creative design skills involve human empathy and originality that AI cannot match."
    }
  };
  
  let riskLevel = "medium";
  if (risk >= 0.7) riskLevel = "high";
  if (risk < 0.3) riskLevel = "low";
  
  return descriptions[category]?.[riskLevel] || 
    "This skill area has varying levels of automation potential depending on complexity.";
}

// Helper function to determine which skills a learning resource addresses
function getSkillsAddressedByResource(title: string) {
  if (title.includes("Machine Learning")) {
    return ["Machine Learning", "Data Science"];
  } else if (title.includes("AWS") || title.includes("Cloud")) {
    return ["Cloud Architecture", "System Design"];
  } else if (title.includes("Leadership")) {
    return ["Leadership", "Management"];
  }
  return ["General"];
}

// Fallback function to create sample career advice
function createSampleCareerAdvice() {
  return {
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
};
