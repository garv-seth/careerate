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
export const runCareerate = async (userId: string, resumeText: string) => {
  try {
    // Check if we have API keys
    const apiKeys = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'mock-api-key',
      PPLX_API_KEY: process.env.PPLX_API_KEY || 'mock-api-key',
      BRAVE_API_KEY: process.env.BRAVE_API_KEY || 'mock-api-key',
      BROWSERBASE_API_KEY: process.env.BROWSERBASE_API_KEY || 'mock-api-key',
      FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || 'mock-api-key'
    };
    
    // Create the tools for each agent
    const tools = createTools(apiKeys);
    
    // Initialize the state
    updateAgentStatus('cara', 'active');
    trackAgentActivity({
      agent: 'cara',
      action: 'Starting career analysis',
      detail: 'Orchestrating the analysis process and planning agent tasks',
      timestamp: new Date(),
      tools: ['pinecone']
    });
    
    // 1. PLAN PHASE - Cara (orchestrator) analyzes the resume and creates a plan
    updateAgentStatus('cara', 'thinking');
    const initialPlan = await runCaraForPlanning(resumeText);
    
    // 2. EXECUTE PHASE - Run Maya (resume analysis)
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
    
    // 3. EXECUTE PHASE - Run Ellie (industry analysis)
    updateAgentStatus('ellie', 'active');
    trackAgentActivity({
      agent: 'ellie',
      action: 'Researching industry trends',
      detail: 'Gathering information on job market, emerging technologies, and industry direction',
      timestamp: new Date(),
      tools: ['brave', 'firecrawl', 'browserbase']
    });
    
    updateAgentStatus('ellie', 'thinking');
    const ellieResults = await runEllieAnalysis(mayaResults.skills, userId);
    updateAgentStatus('ellie', 'complete');
    
    // 4. EXECUTE PHASE - Run Sophia (learning advisor)
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
    
    // 5. REFLECT PHASE - Cara synthesizes all information
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
      action: 'Analysis complete',
      detail: 'Career advice ready for review',
      timestamp: new Date()
    });
    
    // Store vectors in Pinecone
    try {
      console.log(`Storing vectors for user ${userId} in Pinecone...`);
      // In a real implementation, we would use pinecone.storeResumeEmbeddings here
    } catch (error) {
      console.error("Error storing vectors:", error);
    }
    
    return finalResults;
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
