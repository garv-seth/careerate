import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createTools } from "./tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { storeResumeEmbeddings, searchVectorStore } from "./pinecone";

// Create tools
const tools = createTools();

// Cara - Orchestration Agent
export function createCaraAgent(llm: ChatOpenAI, systemPrompt: string) {
  // Create an agent with tools
  const caraPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("messages"),
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // Define the tools for the agent
  const caraTools = [tools.perplexitySearch, tools.braveSearch];

  // Create the agent
  const agent = createOpenAIFunctionsAgent({
    llm,
    tools: caraTools,
    prompt: caraPrompt
  });

  // Create executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools: caraTools,
    verbose: true,
  });

  // Create a runnable that executes the agent and returns both the message and results
  return async (state: any) => {
    const { messages } = state;
    
    // Execute the agent
    const result = await agentExecutor.invoke({
      messages,
      agent_scratchpad: []
    });
    
    // Return the results
    return {
      message: new AIMessage(result.output),
      results: {
        analysis: result.output,
        delegations: extractDelegations(result.output)
      }
    };
  };
}

// Maya - Resume Analysis Agent
export function createMayaAgent(llm: ChatOpenAI, systemPrompt: string) {
  const mayaPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("messages"),
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // Define the tools for the agent
  const mayaTools = [tools.browserbaseScraper, tools.perplexitySearch];

  // Create the agent
  const agent = createOpenAIFunctionsAgent({
    llm,
    tools: mayaTools,
    prompt: mayaPrompt
  });

  // Create executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools: mayaTools,
    verbose: true
  });

  // Create a runnable that processes resume text and executes the agent
  return async (state: any) => {
    const { messages, cara } = state;
    const caraDelegation = cara.results?.delegations?.maya || "Analyze the resume for skills, experience, and automation risk";
    
    // Get the resume text from the first message
    const resumeText = extractResumeText(messages);
    
    if (resumeText) {
      // Store the resume in vector database (for a real implementation)
      try {
        // Extract user ID from state (in real implementation)
        const userId = "user-123"; // Placeholder, would come from auth in real implementation
        
        // Store resume embeddings
        // await storeResumeEmbeddings(userId, resumeText);
        
        // For MVP, we'll simulate this
        console.log(`Would store resume embeddings for user ${userId}`);
      } catch (error) {
        console.error("Error storing resume embeddings:", error);
      }
    }
    
    // Create agent input
    const agentInput = {
      messages: [
        ...messages,
        new HumanMessage(`Based on my resume, ${caraDelegation}`)
      ],
      agent_scratchpad: []
    };
    
    // Execute the agent
    const result = await agentExecutor.invoke(agentInput);
    
    // Extract structured information about the resume
    const resumeAnalysis = {
      skills: extractSkills(result.output),
      experience: extractExperience(result.output),
      educationLevel: extractEducationLevel(result.output),
      automationRisks: extractAutomationRisks(result.output)
    };
    
    // Return the results
    return {
      message: new AIMessage(result.output),
      results: resumeAnalysis
    };
  };
}

// Ellie - Industry Insights Agent
export function createEllieAgent(llm: ChatOpenAI, systemPrompt: string) {
  const elliePrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("messages"),
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // Define the tools for the agent
  const ellieTools = [tools.perplexitySearch, tools.firecrawlCrawler, tools.braveSearch];

  // Create the agent
  const agent = createOpenAIFunctionsAgent({
    llm,
    tools: ellieTools,
    prompt: elliePrompt
  });

  // Create executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools: ellieTools,
    verbose: true
  });

  // Create a runnable that processes industry insights
  return async (state: any) => {
    const { messages, cara, maya } = state;
    const caraDelegation = cara.results?.delegations?.ellie || "Research industry trends and opportunities";
    
    // Extract skills from Maya's analysis
    const skills = maya.results?.skills || [];
    const skillsList = skills.join(", ");
    
    // Create agent input with specific instructions based on previous agents
    const agentInput = {
      messages: [
        ...messages,
        new HumanMessage(`Based on my resume and the skills identified (${skillsList}), ${caraDelegation}`)
      ],
      agent_scratchpad: []
    };
    
    // Execute the agent
    const result = await agentExecutor.invoke(agentInput);
    
    // Extract structured information about industry insights
    const industryInsights = {
      trends: extractTrends(result.output),
      opportunities: extractOpportunities(result.output),
      marketDemand: extractMarketDemand(result.output)
    };
    
    // Return the results
    return {
      message: new AIMessage(result.output),
      results: industryInsights
    };
  };
}

// Sophia - Learning AI Agent
export function createSophiaAgent(llm: ChatOpenAI, systemPrompt: string) {
  const sophiaPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("messages"),
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // Define the tools for the agent
  const sophiaTools = [tools.perplexitySearch, tools.browserbaseScraper];

  // Create the agent
  const agent = createOpenAIFunctionsAgent({
    llm,
    tools: sophiaTools,
    prompt: sophiaPrompt
  });

  // Create executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools: sophiaTools,
    verbose: true
  });

  // Create a runnable that generates learning plans
  return async (state: any) => {
    const { messages, cara, maya, ellie } = state;
    const caraDelegation = cara.results?.delegations?.sophia || "Create a personalized learning plan";
    
    // Extract skills from Maya's analysis
    const skills = maya.results?.skills || [];
    const skillsList = skills.join(", ");
    
    // Extract trends from Ellie's insights
    const trends = ellie.results?.trends || [];
    const trendsList = trends.join(", ");
    
    // Create agent input with specific instructions based on previous agents
    const agentInput = {
      messages: [
        ...messages,
        new HumanMessage(`Based on my skills (${skillsList}) and industry trends (${trendsList}), ${caraDelegation}`)
      ],
      agent_scratchpad: []
    };
    
    // Execute the agent
    const result = await agentExecutor.invoke(agentInput);
    
    // Extract structured information about learning plan
    const learningPlan = {
      recommendations: extractRecommendations(result.output),
      resources: extractResources(result.output),
      timeline: extractTimeline(result.output)
    };
    
    // Return the results
    return {
      message: new AIMessage(result.output),
      results: learningPlan
    };
  };
}

// Helper functions to extract information from agent outputs
function extractResumeText(messages: any[]): string | null {
  // Extract resume text from the first human message
  const firstMessage = messages.find(msg => msg._getType() === "human");
  if (firstMessage) {
    const content = firstMessage.content;
    if (typeof content === "string" && content.includes("analyze my resume")) {
      // Extract the resume part after the instruction
      const resumeStart = content.indexOf("analyze my resume") + "analyze my resume".length;
      return content.substring(resumeStart).trim();
    }
  }
  return null;
}

function extractDelegations(text: string): any {
  // For MVP, return fixed delegations
  return {
    maya: "Analyze the resume to identify skills, experience levels, and potential automation risks",
    ellie: "Research current industry trends and job market demands related to the identified skills",
    sophia: "Create a personalized learning plan and career roadmap based on the skills gap and market trends"
  };
}

function extractSkills(text: string): string[] {
  // Mock implementation for MVP
  return [
    "JavaScript",
    "React",
    "Node.js",
    "Cloud Architecture",
    "Project Management"
  ];
}

function extractExperience(text: string): any {
  // Mock implementation for MVP
  return {
    years: 5,
    seniorityLevel: "Mid-level to Senior",
    domains: ["Web Development", "Cloud Services"]
  };
}

function extractEducationLevel(text: string): string {
  // Mock implementation for MVP
  return "Bachelor's Degree in Computer Science";
}

function extractAutomationRisks(text: string): any[] {
  // Mock implementation for MVP
  return [
    {
      area: "Basic Web Development",
      riskLevel: "High",
      explanation: "Simple frontend tasks are increasingly being automated by AI code generators"
    },
    {
      area: "Backend API Development",
      riskLevel: "Medium",
      explanation: "Standard CRUD APIs can be generated, but custom business logic still requires human intervention"
    }
  ];
}

function extractTrends(text: string): string[] {
  // Mock implementation for MVP
  return [
    "AI integration in traditional software roles",
    "Increased demand for cloud architecture expertise",
    "Growth in remote and hybrid work models"
  ];
}

function extractOpportunities(text: string): any[] {
  // Mock implementation for MVP
  return [
    {
      role: "AI Integration Specialist",
      growthRate: "75% YoY",
      description: "Combines traditional software development with AI implementation"
    },
    {
      role: "Cloud Solutions Architect",
      growthRate: "45% YoY",
      description: "Designs and implements scalable cloud infrastructure"
    }
  ];
}

function extractMarketDemand(text: string): any {
  // Mock implementation for MVP
  return {
    highDemandSkills: ["Machine Learning", "Cloud Architecture", "DevOps"],
    emergingSkills: ["LLM Engineering", "Vector Databases", "AI Ethics"],
    decliningSkills: ["Basic Web Development", "Simple Database Administration"]
  };
}

function extractRecommendations(text: string): any[] {
  // Mock implementation for MVP
  return [
    {
      skill: "Machine Learning Fundamentals",
      priority: "High",
      reason: "Growing demand across all industries"
    },
    {
      skill: "Cloud Architecture",
      priority: "Medium",
      reason: "Complements your existing skills and has strong market demand"
    }
  ];
}

function extractResources(text: string): any[] {
  // Mock implementation for MVP
  return [
    {
      name: "Machine Learning Engineering for Production",
      provider: "Coursera",
      type: "Course",
      duration: "4 months",
      url: "https://www.coursera.org/specializations/machine-learning-engineering-for-production-mlops"
    },
    {
      name: "AWS Solutions Architect",
      provider: "Amazon",
      type: "Certification",
      duration: "3 months",
      url: "https://aws.amazon.com/certification/certified-solutions-architect-associate/"
    }
  ];
}

function extractTimeline(text: string): any {
  // Mock implementation for MVP
  return {
    shortTerm: ["Complete basic ML course", "Start cloud certification prep"],
    mediumTerm: ["Build ML project portfolio", "Obtain cloud certification"],
    longTerm: ["Transition to AI integration role", "Specialize in a specific industry vertical"]
  };
}
