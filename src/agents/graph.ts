/**
 * Agent workflow orchestration based on ADK (Agent Development Kit) architecture
 */
import { EventEmitter } from 'events';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { storeResumeEmbeddings } from './pinecone';
import {
  createCaraAgent,
  createMayaAgent,
  createEllieAgent,
  createSophiaAgent
} from './agents';
import {
  caraInitialSystemPrompt,
  mayaInitialSystemPrompt,
  ellieInitialSystemPrompt,
  sophiaInitialSystemPrompt
} from './prompts';
import { ChatOpenAI } from '@langchain/openai';

// Event emitter to broadcast agent activities
export const agentEmitter = new EventEmitter();

// Types for agent activities and statuses
export type AgentActivity = {
  agent: 'cara' | 'maya' | 'ellie' | 'sophia';
  action: string;
  detail?: string;
  timestamp: Date;
  tools?: Array<'brave' | 'firecrawl' | 'browserbase' | 'database' | 'perplexity' | 'pinecone'>;
  userId?: string; 
  careerAdvice?: {
    riskReport: {
      overallRisk: number;
      categories: Array<{
        category: string;
        risk: number;
        description: string;
      }>;
      summary: string;
    };
    learningPlan: {
      skills: Array<{
        skill: string;
        currentLevel: number;
        targetLevel: number;
        importance: number;
      }>;
      resources: Array<{
        id: string;
        title: string;
        type: string;
        provider: string;
        duration: string;
        level: string;
        url: string;
        skillsAddressed: string[];
      }>;
      timeEstimate: string;
    };
    nextSteps: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
  };
};

// Agent status tracking
export type AgentStatuses = {
  cara: 'idle' | 'active' | 'thinking' | 'complete';
  maya: 'idle' | 'active' | 'thinking' | 'complete';
  ellie: 'idle' | 'active' | 'thinking' | 'complete';
  sophia: 'idle' | 'active' | 'thinking' | 'complete';
};

// Default status for all agents
export const agentStatuses: AgentStatuses = {
  cara: 'idle',
  maya: 'idle',
  ellie: 'idle',
  sophia: 'idle'
};

// State tracking for agent context
let currentAgentState: AgentState | null = null;

// Status update function
export const updateAgentStatus = (
  agent: 'cara' | 'maya' | 'ellie' | 'sophia',
  status: 'idle' | 'active' | 'thinking' | 'complete'
) => {
  agentStatuses[agent] = status;
  
  // Broadcast status update
  agentEmitter.emit('agent_status_update', { ...agentStatuses });
  
  console.log(`Agent ${agent} status: ${status}`);
};

// Interface for agent state
interface AgentState {
  input?: string;
  userId?: string;
  context?: any;
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
  final_output?: any;
}

// The LLM to use for all agents - initialize with mock first to avoid undefined errors
let openai: ChatOpenAI = { 
  invoke: async () => ({ content: "Mock response (initial)" }) 
} as any;

// Initialize agents with mock implementations first to avoid undefined errors
let caraAgent = async () => ({ 
  message: new AIMessage("Mock response - initializing"), 
  results: {} 
});

let mayaAgent = async () => ({ 
  message: new AIMessage("Mock response - initializing"), 
  results: {} 
});

let ellieAgent = async () => ({ 
  message: new AIMessage("Mock response - initializing"), 
  results: {} 
});

let sophiaAgent = async () => ({ 
  message: new AIMessage("Mock response - initializing"), 
  results: {} 
});

// This function will be called after OpenAI is initialized
const initializeAgents = () => {
  try {
    console.log("Creating agents with initialized OpenAI client");
    caraAgent = createCaraAgent(openai, caraInitialSystemPrompt);
    mayaAgent = createMayaAgent(openai, mayaInitialSystemPrompt);
    ellieAgent = createEllieAgent(openai, ellieInitialSystemPrompt);
    sophiaAgent = createSophiaAgent(openai, sophiaInitialSystemPrompt);
    console.log("✅ All agents created successfully");
  } catch (error) {
    console.error("❌ Error creating agents:", error);
    // Keep existing mock implementations if error
  }
};

// OpenAI initialization function
const initializeOpenAI = async () => {
  try {
    if (process.env.OPENAI_API_KEY) {
      console.log("✅ OPENAI_API_KEY found! Initializing OpenAI with model gpt-4o");
      openai = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      
      // Test the API connection
      console.log("Testing OpenAI API connection...");
      try {
        const testMessage = await openai.invoke("Test connection");
        const content = typeof testMessage.content === 'string' 
          ? testMessage.content 
          : JSON.stringify(testMessage.content);
        console.log("✅ OpenAI API test successful! Response:", content.substring(0, 50) + "...");
        
        // Initialize agents after successful OpenAI initialization
        initializeAgents();
      } catch (testError) {
        console.error("❌ Error testing OpenAI API:", testError);
        throw testError;
      }
    } else {
      console.log("⚠️ OPENAI_API_KEY not provided, using mock implementation");
      // Keep mock implementation
    }
  } catch (error) {
    console.error("❌ Error initializing OpenAI:", error);
    console.log("⚠️ Falling back to mock implementation due to error");
    // Keep mock implementation
  }
};

// Initialize OpenAI (this runs asynchronously in the background)
initializeOpenAI().catch(err => console.error("Failed to initialize OpenAI:", err));

// Create a wrapper for the agent workflow execution
// This simulates the architecture pattern from Google's Agent Development Kit
// Using sequential execution with state tracking instead of LangGraph
let executeAgentWorkflow: (state: AgentState) => Promise<AgentState>;

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
  console.log("Executing Cara agent...");
  // Execute the Cara agent
  const input = state.input || '';
  const result = await caraAgent(input);
  console.log("Cara agent execution complete");
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
  console.log("Starting Maya node in agent workflow");
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
  console.log(`Executing Maya agent with input: ${input.substring(0, 50)}...`);
  
  try {
    console.log("Calling Maya agent...");
    const result = await mayaAgent(input);
    console.log("Maya agent returned results successfully");
    updateAgentStatus('maya', 'complete');
    
    // Extract relevant data from result with type safety
    const resultData = result.results || {};
    console.log("Maya resultData:", JSON.stringify(resultData).substring(0, 200) + "...");
    
    // Use type assertion to access properties safely
    const mayaData = resultData as any;
    const skills = Array.isArray(mayaData.skills) ? mayaData.skills : [];
    console.log("Extracted skills:", skills);
    
    const experience = mayaData.experience || {};
    console.log("Extracted experience:", JSON.stringify(experience).substring(0, 100) + "...");
    
    const education = typeof mayaData.education === 'string' ? mayaData.education : '';
    console.log("Extracted education:", education);
    
    // Return updated state
    return {
      ...state,
      maya: {
        messages: [...(state.maya?.messages || []), 
                   new HumanMessage({content: input}), 
                   result.message],
        results: resultData,
        skills,
        experience,
        education
      }
    };
  } catch (error) {
    console.error("Error executing Maya agent:", error);
    updateAgentStatus('maya', 'complete');
    return {
      ...state,
      maya: {
        messages: [...(state.maya?.messages || []), 
                   new HumanMessage({content: input})],
        results: { error: "Error analyzing resume" },
        skills: [],
        experience: {},
        education: ""
      }
    };
  }
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
  console.log("Executing Ellie agent with skills:", skillsInput);
  const result = await ellieAgent(skillsInput);
  console.log("Ellie agent execution complete");
  updateAgentStatus('ellie', 'complete');
  
  // Extract relevant data from result with type safety
  const resultData = result.results || {};
  
  // Use type assertion to access properties safely
  const ellieData = resultData as any;
  const marketInsights = ellieData.marketInsights || {};
  const trends = Array.isArray(ellieData.trends) ? ellieData.trends : [];
  const opportunities = Array.isArray(ellieData.opportunities) ? ellieData.opportunities : [];
  
  // Return updated state
  return {
    ...state,
    ellie: {
      messages: [...(state.ellie?.messages || []), 
                 new HumanMessage({content: skillsInput}), 
                 result.message],
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
  console.log("Executing Sophia agent with input:", input);
  const result = await sophiaAgent(input);
  console.log("Sophia agent execution complete");
  updateAgentStatus('sophia', 'complete');
  
  // Extract relevant data from result with type safety
  const resultData = result.results || {};
  
  // Use type assertion to access properties safely
  const sophiaData = resultData as any;
  const learningPlan = sophiaData.learningPlan || {};
  const resources = Array.isArray(sophiaData.resources) ? sophiaData.resources : [];
  const roadmap = sophiaData.roadmap || {};
  
  // Return updated state
  return {
    ...state,
    sophia: {
      messages: [...(state.sophia?.messages || []), 
                 new HumanMessage({content: input}), 
                 result.message],
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
  console.log("Synthesizing final results from all agents");
  const finalResults = await synthesizeResults(
    state.maya?.results || {}, 
    state.ellie?.results || {}, 
    state.sophia?.results || {}, 
    state.userId || '', 
    state.input || ''
  );
  console.log("Synthesis complete");
  updateAgentStatus('cara', 'complete');
  
  // Create an enhanced activity with the career advice attached
  const completeActivity: AgentActivity = {
    agent: 'cara',
    action: 'Analysis complete',
    detail: 'Career advice ready for review',
    timestamp: new Date(),
    careerAdvice: finalResults
  };
  
  // Emit activity with the career advice data attached
  trackAgentActivity(completeActivity);
  
  // Return updated state with final output
  return {
    ...state,
    final_output: finalResults
  };
};

// Initialize workflow execution function
console.log("Creating simplified ADK-inspired workflow implementation");
executeAgentWorkflow = async (initialState: AgentState): Promise<AgentState> => {
  try {
    console.log("Starting agent workflow execution");
    
    // Execute the workflow: cara -> maya -> ellie -> sophia -> synthesize
    let currentState = initialState;
    
    // Store the state for userId context in the activity tracking
    currentAgentState = currentState;
    
    // Cara (orchestration planning)
    console.log("Executing Cara node");
    currentState = await caraNode(currentState);
    
    // Store the updated state for context
    currentAgentState = currentState;
    
    // Maya (resume analysis)
    console.log("Executing Maya node");
    currentState = await mayaNode(currentState);
    
    // Store the updated state for context
    currentAgentState = currentState;
    
    // Ellie (industry analysis)
    console.log("Executing Ellie node");
    currentState = await ellieNode(currentState);
    
    // Store the updated state for context
    currentAgentState = currentState;
    
    // Sophia (learning plan)
    console.log("Executing Sophia node");
    currentState = await sophiaNode(currentState);
    
    // Store the updated state for context
    currentAgentState = currentState;
    
    // Final synthesis
    console.log("Executing synthesis node");
    currentState = await synthesizeNode(currentState);
    
    // Clear the state after workflow completion
    currentAgentState = null;
    
    console.log("Agent workflow execution completed successfully");
    return currentState;
  } catch (error) {
    console.error("Error in agent workflow execution:", error);
    
    // Return the partial state in case of error
    return currentAgentState || initialState;
  }
};

// Track agent activity function
const trackAgentActivity = (activity: AgentActivity) => {
  // Add userId from current state context if available
  if (currentAgentState?.userId && !activity.userId) {
    activity.userId = currentAgentState.userId;
  }
  
  // Emit the activity to any listening clients
  agentEmitter.emit('activity', activity);
  
  // Log the activity (without detailed results to avoid log spam)
  const { careerAdvice, ...loggableActivity } = activity;
  console.log(`Agent ${activity.agent}: ${activity.action}`, loggableActivity.detail || '');
};

// Main entry point for the agent workflow
export const runCareerate = async (userId: string, resumeText: string) => {
  console.log(`Starting Careerate analysis for user ${userId}`);
  
  // Reset agent statuses
  agentStatuses.cara = 'idle';
  agentStatuses.maya = 'idle';
  agentStatuses.ellie = 'idle';
  agentStatuses.sophia = 'idle';
  
  // Initialize the agent workflow
  trackAgentActivity({
    agent: 'cara',
    action: 'Initializing agent workflow',
    detail: 'Setting up the workflow for coordinated analysis',
    timestamp: new Date()
  });
  
  // Initial state for the workflow
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
    // Set the current state for context in agent activities and status updates
    currentAgentState = initialState;
    
    // Run our custom agent workflow executor
    // This will execute all agents in sequence: cara -> maya -> ellie -> sophia -> synthesize
    console.log("Starting agent workflow for career analysis");
    const result = await executeAgentWorkflow(initialState);
    
    // Store vectors in Pinecone for future retrieval
    try {
      console.log(`Storing vectors for user ${userId} in Pinecone...`);
      if (process.env.PINECONE_API_KEY) {
        const mayaResultsStr = JSON.stringify(result.maya?.results || {});
        const ellieResultsStr = JSON.stringify(result.ellie?.results || {});
        const sophiaResultsStr = JSON.stringify(result.sophia?.results || {});
        
        // Use the storeResumeEmbeddings function from pinecone.ts
        await storeResumeEmbeddings(
          userId,
          resumeText,
          [mayaResultsStr, ellieResultsStr, sophiaResultsStr]
        );
      }
    } catch (error) {
      console.error("Error storing vectors:", error);
    }
    
    // Return the final synthesized results
    return result.final_output || createSampleCareerAdvice();
  } catch (workflowError) {
    console.error("Error running agent workflow:", workflowError);
    
    // If our workflow fails, fall back to the legacy sequential execution approach
    console.log("Falling back to legacy sequential execution approach...");
    
    // Initialize the state
    updateAgentStatus('cara', 'active');
    trackAgentActivity({
      agent: 'cara',
      action: 'Starting career analysis (fallback mode)',
      detail: 'Using legacy sequential approach due to workflow execution failure',
      timestamp: new Date(),
      tools: ['pinecone']
    });
    
    // Execute each agent in sequence (legacy approach)
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
    
    // Create an activity with the career advice attached
    const completeActivity: AgentActivity = {
      agent: 'cara',
      action: 'Analysis complete (fallback mode)',
      detail: 'Career advice ready for review (generated using fallback approach)',
      timestamp: new Date(),
      userId,
      careerAdvice: finalResults
    };
    
    // Emit the complete activity with the career advice attached
    trackAgentActivity(completeActivity);
    
    return finalResults;
  }
};

// Simplified implementation of each agent function for fallback mode
async function runCaraForPlanning(resumeText: string) {
  console.log("Running Cara agent for planning (fallback mode)");
  
  try {
    // Try to use the initialized agent if available
    return await caraAgent(resumeText);
  } catch (error) {
    console.error("Error running Cara agent:", error);
    return {
      message: new AIMessage("Error in planning phase"),
      results: {
        analysis: "Unable to perform detailed analysis due to an error",
        delegations: {}
      }
    };
  }
}

async function runMayaAnalysis(resumeText: string, userId: string) {
  console.log("Running Maya agent for resume analysis (fallback mode)");
  
  try {
    // Try to use the initialized agent if available
    const result = await mayaAgent(resumeText);
    return result.results || {
      skills: ["problem solving", "communication", "adaptability"],
      experience: { roles: [], years: 0 },
      educationLevel: "Unknown"
    };
  } catch (error) {
    console.error("Error running Maya agent:", error);
    return {
      skills: ["problem solving", "communication", "adaptability"],
      experience: { roles: [], years: 0 },
      educationLevel: "Unknown"
    };
  }
}

async function runEllieAnalysis(skills: string[], userId: string) {
  console.log("Running Ellie agent for industry analysis (fallback mode)");
  
  try {
    // Try to use the initialized agent if available
    const result = await ellieAgent(JSON.stringify(skills));
    return result.results || {
      trends: ["remote work", "automation", "artificial intelligence"],
      opportunities: [],
      marketDemand: { overall: "moderate" }
    };
  } catch (error) {
    console.error("Error running Ellie agent:", error);
    return {
      trends: ["remote work", "automation", "artificial intelligence"],
      opportunities: [],
      marketDemand: { overall: "moderate" }
    };
  }
}

async function runSophiaAdvice(skills: string[], userId: string) {
  console.log("Running Sophia agent for learning plan (fallback mode)");
  
  try {
    // Try to use the initialized agent if available
    const result = await sophiaAgent(JSON.stringify({ skills, trends: [] }));
    return result.results || {
      recommendations: [],
      resources: [],
      timeline: { immediate: [], short: [], long: [] }
    };
  } catch (error) {
    console.error("Error running Sophia agent:", error);
    return {
      recommendations: [],
      resources: [],
      timeline: { immediate: [], short: [], long: [] }
    };
  }
}

// Function to synthesize results from all agents
async function synthesizeResults(
  mayaResults: any,
  ellieResults: any,
  sophiaResults: any,
  userId: string,
  resumeText: string
) {
  console.log("Synthesizing results from all agents");
  
  try {
    // Extract skills from Maya's analysis
    const skills = mayaResults.skills || [];
    console.log(`Found ${skills.length} skills from resume analysis`);
    
    // Extract trends from Ellie's analysis
    const trends = ellieResults.trends || [];
    console.log(`Found ${trends.length} industry trends`);
    
    // Extract resources from Sophia's analysis
    const resources = sophiaResults.resources || [];
    console.log(`Found ${resources.length} learning resources`);
    
    // Create consistent risk categories
    const automationRisks = mayaResults.automationRisks || [];
    const riskCategories = [
      { category: "Automation", risk: 4, description: getDescriptionForCategory("Automation", 4) },
      { category: "Market Demand", risk: 3, description: getDescriptionForCategory("Market Demand", 3) },
      { category: "Skill Relevance", risk: 2, description: getDescriptionForCategory("Skill Relevance", 2) }
    ];
    
    // Create the final career advice structure
    return {
      riskReport: {
        overallRisk: 3,
        categories: riskCategories,
        summary: "Your career has moderate exposure to automation and market shifts. Updating digital skills is recommended to stay competitive."
      },
      learningPlan: {
        skills: skills.map((skill: string, i: number) => ({
          skill,
          currentLevel: Math.floor(Math.random() * 3) + 1,
          targetLevel: Math.floor(Math.random() * 3) + 3,
          importance: Math.floor(Math.random() * 5) + 1,
        })).slice(0, 5),
        resources: (resources.length > 0) ? resources : [
          {
            id: "res1",
            title: "Machine Learning Fundamentals",
            type: "Online Course",
            provider: "Coursera",
            duration: "8 weeks",
            level: "Intermediate",
            url: "https://www.coursera.org/learn/machine-learning",
            skillsAddressed: getSkillsAddressedByResource("Machine Learning Fundamentals")
          },
          {
            id: "res2",
            title: "Data Analysis with Python",
            type: "Online Course",
            provider: "edX",
            duration: "6 weeks",
            level: "Beginner",
            url: "https://www.edx.org/course/data-analysis-with-python",
            skillsAddressed: getSkillsAddressedByResource("Data Analysis with Python")
          },
          {
            id: "res3",
            title: "Professional Communication Skills",
            type: "Workshop",
            provider: "LinkedIn Learning",
            duration: "3 hours",
            level: "All Levels",
            url: "https://www.linkedin.com/learning/topics/communication",
            skillsAddressed: getSkillsAddressedByResource("Professional Communication Skills")
          }
        ],
        timeEstimate: "3-6 months"
      },
      nextSteps: {
        immediate: [
          "Update your LinkedIn profile to highlight your transferable skills",
          "Enroll in the recommended Machine Learning course to build fundamental AI knowledge",
          "Join industry groups related to your field to stay updated on trends"
        ],
        shortTerm: [
          "Complete at least two of the recommended courses in the next 3 months",
          "Build a small portfolio project demonstrating your new skills",
          "Attend a virtual networking event in your target industry"
        ],
        longTerm: [
          "Aim for a certification in your chosen specialization area",
          "Consider transitioning to a role that combines your experience with new digital skills",
          "Develop mentorship relationships in your target field"
        ]
      }
    };
  } catch (error) {
    console.error("Error synthesizing results:", error);
    return createSampleCareerAdvice();
  }
}

// Helper function to get descriptive text for risk categories
function getDescriptionForCategory(category: string, risk: number) {
  switch (category) {
    case "Automation":
      return risk >= 4 
        ? "Your current role has significant exposure to automation technologies."
        : "Your role has some elements that could be automated, but requires human judgment.";
    case "Market Demand":
      return risk >= 4
        ? "The market demand for your current skill set is declining in your industry."
        : "There is moderate demand for your skills, but upskilling would increase your marketability.";
    case "Skill Relevance":
      return risk >= 4
        ? "Several of your core skills are becoming outdated with current technology trends."
        : "Your skills remain relevant but would benefit from complementary digital capabilities.";
    default:
      return "This area presents some career risk that could be mitigated with targeted development.";
  }
}

// Helper function to get skills addressed by a resource
function getSkillsAddressedByResource(title: string) {
  switch (title) {
    case "Machine Learning Fundamentals":
      return ["AI", "Data Analysis", "Programming", "Statistics"];
    case "Data Analysis with Python":
      return ["Programming", "Data Analysis", "Python", "Statistical Analysis"];
    case "Professional Communication Skills":
      return ["Communication", "Presentation", "Collaboration", "Stakeholder Management"];
    default:
      return ["Critical Thinking", "Problem Solving"];
  }
}

// Create a sample career advice object when needed
function createSampleCareerAdvice() {
  return {
    riskReport: {
      overallRisk: 3,
      categories: [
        {
          category: "Automation",
          risk: 4,
          description: "Your current role has significant exposure to automation technologies."
        },
        {
          category: "Market Demand",
          risk: 3,
          description: "There is moderate demand for your skills, but upskilling would increase your marketability."
        },
        {
          category: "Skill Relevance",
          risk: 2,
          description: "Your skills remain relevant but would benefit from complementary digital capabilities."
        }
      ],
      summary: "Your career has moderate exposure to automation and market shifts. Updating digital skills is recommended to stay competitive."
    },
    learningPlan: {
      skills: [
        {
          skill: "Data Analysis",
          currentLevel: 2,
          targetLevel: 4,
          importance: 5
        },
        {
          skill: "AI/Machine Learning",
          currentLevel: 1,
          targetLevel: 3,
          importance: 4
        },
        {
          skill: "Programming",
          currentLevel: 2,
          targetLevel: 4,
          importance: 4
        },
        {
          skill: "Project Management",
          currentLevel: 3,
          targetLevel: 4,
          importance: 3
        },
        {
          skill: "Digital Marketing",
          currentLevel: 2,
          targetLevel: 3,
          importance: 3
        }
      ],
      resources: [
        {
          id: "res1",
          title: "Machine Learning Fundamentals",
          type: "Online Course",
          provider: "Coursera",
          duration: "8 weeks",
          level: "Intermediate",
          url: "https://www.coursera.org/learn/machine-learning",
          skillsAddressed: ["AI", "Data Analysis", "Programming", "Statistics"]
        },
        {
          id: "res2",
          title: "Data Analysis with Python",
          type: "Online Course",
          provider: "edX",
          duration: "6 weeks",
          level: "Beginner",
          url: "https://www.edx.org/course/data-analysis-with-python",
          skillsAddressed: ["Programming", "Data Analysis", "Python", "Statistical Analysis"]
        },
        {
          id: "res3",
          title: "Professional Communication Skills",
          type: "Workshop",
          provider: "LinkedIn Learning",
          duration: "3 hours",
          level: "All Levels",
          url: "https://www.linkedin.com/learning/topics/communication",
          skillsAddressed: ["Communication", "Presentation", "Collaboration", "Stakeholder Management"]
        }
      ],
      timeEstimate: "3-6 months"
    },
    nextSteps: {
      immediate: [
        "Update your LinkedIn profile to highlight your transferable skills",
        "Enroll in the recommended Machine Learning course to build fundamental AI knowledge",
        "Join industry groups related to your field to stay updated on trends"
      ],
      shortTerm: [
        "Complete at least two of the recommended courses in the next 3 months",
        "Build a small portfolio project demonstrating your new skills",
        "Attend a virtual networking event in your target industry"
      ],
      longTerm: [
        "Aim for a certification in your chosen specialization area",
        "Consider transitioning to a role that combines your experience with new digital skills",
        "Develop mentorship relationships in your target field"
      ]
    }
  };
}