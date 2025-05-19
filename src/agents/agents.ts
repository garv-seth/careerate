
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { EventEmitter } from "events";
import { createTools } from "./tools";
import { storeResumeEmbeddings, searchVectorStore } from "./pinecone";
import { MemoryManager } from "./memory";

// Create global event emitter for agent communication
export const agentEmitter = new EventEmitter();

// Create tools and memory manager
const tools = createTools();
const memoryManager = new MemoryManager();

// Define agent states
export type AgentState = 'idle' | 'working' | 'completed' | 'failed' | 'input-required';

// Base agent class with A2A-inspired protocol
class BaseAgent {
  name: string;
  llm: ChatOpenAI;
  systemPrompt: string;
  memory: any;
  messageHistory: BaseMessage[];
  state: AgentState;
  description: string;
  role: string;
  specialty: string;
  capabilities: string[];
  availableTools: any[];

  constructor(
    name: string, 
    llm: ChatOpenAI, 
    systemPrompt: string,
    description: string,
    role: string,
    specialty: string,
    capabilities: string[] = [],
    availableTools: any[] = []
  ) {
    this.name = name;
    this.llm = llm;
    this.systemPrompt = systemPrompt;
    this.messageHistory = [];
    this.memory = memoryManager.getAgentMemory(name);
    this.state = 'idle';
    this.description = description;
    this.role = role;
    this.specialty = specialty;
    this.capabilities = capabilities;
    this.availableTools = availableTools;
    
    // Register agent in the system
    this.registerCapabilities();
  }

  // A2A-inspired capability registration
  private registerCapabilities() {
    const agentCard = {
      name: this.name,
      description: this.description,
      role: this.role,
      specialty: this.specialty,
      capabilities: this.capabilities,
      availableTools: this.availableTools.map(tool => tool.name)
    };
    
    // Broadcast agent registration
    agentEmitter.emit('agent_registered', agentCard);
  }

  // Update agent state and broadcast
  updateState(newState: AgentState) {
    this.state = newState;
    agentEmitter.emit('agent_state_update', {
      agent: this.name,
      state: this.state,
      timestamp: new Date().toISOString()
    });
    return this.state;
  }

  // Broadcast messages to other agents
  async broadcast(message: string, recipients: string[]) {
    this.updateState('working');
    
    const broadcastPayload = {
      from: this.name,
      message: message,
      recipients: recipients,
      timestamp: new Date().toISOString()
    };
    
    agentEmitter.emit('agent_broadcast', broadcastPayload);
    const result = await memoryManager.broadcastMessage(this.name, message, recipients);
    
    this.updateState('completed');
    return result;
  }

  // Receive message from another agent
  async receiveMessage(from: string, message: string) {
    this.updateState('working');
    this.messageHistory.push(new AIMessage(`[${from}]: ${message}`));
    
    agentEmitter.emit('agent_message_received', {
      to: this.name,
      from: from,
      message: message,
      timestamp: new Date().toISOString()
    });
    
    const result = await this.processMessage(from, message);
    this.updateState('completed');
    return result;
  }

  // Process incoming message
  protected async processMessage(from: string, message: string): Promise<any> {
    // Override in specific agents
    return null;
  }

  // Store data in agent memory
  protected async storeMemory(key: string, value: any) {
    return await memoryManager.store(this.name, key, value);
  }

  // Recall data from agent memory
  protected async recall(key: string): Promise<any> {
    return await memoryManager.recall(this.name, key);
  }

  // Use a specific tool
  protected async useTool(toolName: string, input: any) {
    const tool = this.availableTools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not available to agent ${this.name}`);
    }
    
    agentEmitter.emit('agent_tool_use', {
      agent: this.name,
      tool: toolName,
      input: input,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await tool._call(input);
      
      agentEmitter.emit('agent_tool_result', {
        agent: this.name,
        tool: toolName,
        result: result,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      agentEmitter.emit('agent_tool_error', {
        agent: this.name,
        tool: toolName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
}

// Cara - Orchestration Agent
class CaraAgent extends BaseAgent {
  constructor(llm: ChatOpenAI, systemPrompt: string) {
    super(
      'cara', 
      llm, 
      systemPrompt,
      "Career Coach & Orchestrator",
      "I coordinate the analysis of your career data by working with specialized agents.",
      "Career planning and orchestration",
      ["orchestration", "planning", "synthesis", "communication"],
      tools.filter(tool => ["brave_search", "perplexity_search", "database_lookup"].includes(tool.name))
    );
  }

  async analyze(input: string) {
    this.updateState('working');
    
    // Store the analysis request
    await this.storeMemory('current_analysis', input);

    // Broadcast to other agents
    await this.broadcast('New analysis request received', ['maya', 'ellie', 'sophia']);

    // Use perplexity for initial research
    let marketContext = "";
    try {
      marketContext = await this.useTool("perplexity_search", 
        `Latest career trends and market overview for: ${input}`);
    } catch (error) {
      console.error("Error using perplexity tool:", error);
      marketContext = "Unable to retrieve current market data.";
    }

    // Generate a comprehensive response using the LLM
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      ["system", `Current market context: ${marketContext}`],
      ["human", input]
    ]);
    
    const chain = RunnableSequence.from([
      prompt,
      this.llm
    ]);
    
    const response = await chain.invoke({});
    
    // Update state and store results
    const results = {
      analysis: "Initial analysis complete",
      marketContext: marketContext,
      delegations: await this.recall('delegations') || {}
    };
    
    await this.storeMemory('analysis_results', results);
    this.updateState('completed');
    
    return {
      message: response,
      results: results
    };
  }

  protected async processMessage(from: string, message: string) {
    // Update delegations based on agent responses
    const delegations = await this.recall('delegations') || {};
    delegations[from] = message;
    await this.storeMemory('delegations', delegations);

    // If we've heard from all agents, synthesize the results
    const expectedAgents = ['maya', 'ellie', 'sophia'];
    const respondedAgents = Object.keys(delegations);
    
    if (expectedAgents.every(agent => respondedAgents.includes(agent))) {
      await this.synthesizeResults();
    }

    return delegations;
  }
  
  private async synthesizeResults() {
    const delegations = await this.recall('delegations') || {};
    const currentAnalysis = await this.recall('current_analysis') || "";
    
    const synthesisPrompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      ["system", `You need to synthesize inputs from multiple specialized agents into a coherent career plan.`],
      ["system", `Resume analysis from Maya: ${delegations.maya || "No data"}`],
      ["system", `Industry insights from Ellie: ${delegations.ellie || "No data"}`],
      ["system", `Learning plan from Sophia: ${delegations.sophia || "No data"}`],
      ["human", `Create a comprehensive career development plan based on this query: ${currentAnalysis}`]
    ]);
    
    const chain = RunnableSequence.from([
      synthesisPrompt,
      this.llm
    ]);
    
    const synthesisResult = await chain.invoke({});
    await this.storeMemory('synthesis_result', synthesisResult.content);
    
    agentEmitter.emit('analysis_complete', {
      originalQuery: currentAnalysis,
      synthesisResult: synthesisResult.content,
      timestamp: new Date().toISOString()
    });
    
    return synthesisResult.content;
  }
}

// Maya - Resume Analysis Agent
class MayaAgent extends BaseAgent {
  constructor(llm: ChatOpenAI, systemPrompt: string) {
    super(
      'maya', 
      llm, 
      systemPrompt,
      "Resume Analyzer",
      "I analyze your resume to identify skills, experience, and career trajectory.",
      "Profile analysis and skill extraction",
      ["text analysis", "skill extraction", "career trajectory analysis"],
      tools.filter(tool => ["database_lookup"].includes(tool.name))
    );
  }

  async analyze(text: string) {
    this.updateState('working');
    
    // Extract skills and experience using the LLM
    const skills = await this.extractSkills(text);
    const experience = await this.extractExperience(text);
    
    // Store embeddings for future reference
    try {
      await storeResumeEmbeddings(text, { skills, experience });
    } catch (error) {
      console.error("Error storing resume embeddings:", error);
    }
    
    // Store findings in memory
    await this.storeMemory('skills', skills);
    await this.storeMemory('experience', experience);

    // Broadcast findings to other agents
    await this.broadcast(
      `Identified ${skills.length} skills and ${experience.years} years of experience`,
      ['cara', 'ellie', 'sophia']
    );
    
    this.updateState('completed');

    return {
      message: new AIMessage("Resume analysis complete"),
      results: { skills, experience }
    };
  }

  private async extractSkills(text: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      ["system", "Extract a comprehensive list of professional skills from the provided text. Include both technical and soft skills. Return as a JSON array of strings."],
      ["human", text]
    ]);
    
    const chain = RunnableSequence.from([
      prompt,
      this.llm
    ]);
    
    const response = await chain.invoke({});
    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error("Error parsing skills JSON:", error);
      return [];
    }
  }

  private async extractExperience(text: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      ["system", "Extract years of experience, job titles, and industry domains from the provided text. Return as a JSON object with 'years' (number), 'titles' (array), and 'domains' (array)."],
      ["human", text]
    ]);
    
    const chain = RunnableSequence.from([
      prompt,
      this.llm
    ]);
    
    const response = await chain.invoke({});
    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error("Error parsing experience JSON:", error);
      return { years: 0, titles: [], domains: [] };
    }
  }

  protected async processMessage(from: string, message: string) {
    if (from === 'cara' && message.includes('analysis request')) {
      // Get the current analysis from Cara
      const caraMemory = await memoryManager.recall('cara', 'current_analysis');
      if (caraMemory) {
        const results = await this.analyze(caraMemory);
        return results.results;
      }
    }
    return null;
  }
}

// Ellie - Industry Insights Agent
class EllieAgent extends BaseAgent {
  constructor(llm: ChatOpenAI, systemPrompt: string) {
    super(
      'ellie', 
      llm, 
      systemPrompt,
      "Industry Analyst",
      "I research market trends and industry developments relevant to your career.",
      "Market research and trend analysis",
      ["market research", "trend analysis", "industry intelligence"],
      tools.filter(tool => ["brave_search", "perplexity_search", "browserbase_scraper", "firecrawl"].includes(tool.name))
    );
  }

  async analyze(skills: string[]) {
    this.updateState('working');
    
    // Get market insights using tools
    let insights = [];
    try {
      // Use Brave search tool for market demand data
      const searchResults = await this.useTool("brave_search", 
        `market demand for ${skills.slice(0, 5).join(', ')}`);
      
      insights.push(searchResults);
    } catch (error) {
      console.error("Error using brave search tool:", error);
    }
    
    // Use Perplexity for deeper analysis
    let perplexityResults = "";
    try {
      perplexityResults = await this.useTool("perplexity_search", 
        `Current industry trends for: ${skills.join(', ')}`);
    } catch (error) {
      console.error("Error using perplexity tool:", error);
      perplexityResults = "Unable to retrieve trend data from Perplexity.";
    }

    // Process the trends from research
    const trends = perplexityResults.split('\n').filter(Boolean);
    
    // Find opportunities based on skills and trends
    const opportunities = await this.findOpportunities(skills, trends);

    // Store and broadcast findings
    await this.storeMemory('market_insights', { trends, opportunities });
    await this.broadcast(
      `Identified ${trends.length} trends and ${opportunities.length} opportunities`,
      ['cara', 'sophia']
    );
    
    this.updateState('completed');

    return {
      message: new AIMessage("Market analysis complete"),
      results: { trends, opportunities, insights: insights.join('\n') }
    };
  }

  private async findOpportunities(skills: string[], trends: string[]) {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      ["system", "Based on the provided skills and market trends, identify specific career opportunities and roles. Return as a JSON array of objects, each with 'title', 'description', and 'relevantSkills' properties."],
      ["system", `Skills: ${JSON.stringify(skills)}`],
      ["system", `Trends: ${JSON.stringify(trends)}`],
      ["human", "What career opportunities exist based on these skills and trends?"]
    ]);
    
    const chain = RunnableSequence.from([
      prompt,
      this.llm
    ]);
    
    const response = await chain.invoke({});
    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error("Error parsing opportunities JSON:", error);
      return [];
    }
  }

  protected async processMessage(from: string, message: string) {
    if (from === 'cara' && message.includes('analysis request')) {
      // Get skills from Maya to perform analysis
      const mayaSkills = await memoryManager.recall('maya', 'skills');
      if (mayaSkills && Array.isArray(mayaSkills)) {
        const results = await this.analyze(mayaSkills);
        return results.results;
      } else {
        // If Maya's skills aren't available yet, wait and then check again
        setTimeout(async () => {
          const retrySkills = await memoryManager.recall('maya', 'skills');
          if (retrySkills) {
            const results = await this.analyze(retrySkills);
            await this.broadcast(
              `Industry analysis complete: ${results.results.opportunities.length} opportunities identified`,
              ['cara']
            );
          }
        }, 5000);
        return "Awaiting skills data from Maya, will process when available.";
      }
    }
    return null;
  }
}

// Sophia - Learning AI Agent
class SophiaAgent extends BaseAgent {
  constructor(llm: ChatOpenAI, systemPrompt: string) {
    super(
      'sophia', 
      llm, 
      systemPrompt,
      "Learning Advisor",
      "I create personalized learning plans based on your skills and career goals.",
      "Skill development and learning path creation",
      ["learning plan creation", "resource curation", "skill gap analysis"],
      tools.filter(tool => ["database_lookup", "browserbase_scraper", "firecrawl"].includes(tool.name))
    );
  }

  async createLearningPlan(skills: string[]) {
    this.updateState('working');
    
    // Get stored market insights from Ellie
    const marketInsights = await memoryManager.recall('ellie', 'market_insights') || {
      trends: [],
      opportunities: []
    };
    
    // Generate learning plan based on skills and market insights
    const learningPlan = await this.generatePlan(skills, marketInsights);
    
    // Find learning resources
    const resources = await this.findResources(learningPlan);

    // Store and broadcast plan
    await this.storeMemory('learning_plan', { plan: learningPlan, resources });
    await this.broadcast(
      `Created learning plan with ${resources.length} resources`,
      ['cara']
    );
    
    this.updateState('completed');

    return {
      message: new AIMessage("Learning plan created"),
      results: { learningPlan, resources }
    };
  }

  private async generatePlan(skills: string[], marketInsights: any) {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      ["system", "Create a personalized learning plan based on the provided skills and market insights. Return as a JSON object with 'focusAreas' (array), 'timeframe' (object with short/medium/long term goals), and 'milestones' (array)."],
      ["system", `Skills: ${JSON.stringify(skills)}`],
      ["system", `Market Insights: ${JSON.stringify(marketInsights)}`],
      ["human", "Create a comprehensive learning plan to advance my career."]
    ]);
    
    const chain = RunnableSequence.from([
      prompt,
      this.llm
    ]);
    
    const response = await chain.invoke({});
    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error("Error parsing learning plan JSON:", error);
      return { focusAreas: [], timeframe: {}, milestones: [] };
    }
  }

  private async findResources(plan: any) {
    // Use database tool to find learning resources
    try {
      const dbResults = await this.useTool("database_lookup", 
        `course learning ${plan.focusAreas.join(' ')}`);
      
      // Parse the database results into a structured format
      const resourceLines = dbResults.split('\n').filter(line => line.trim().length > 0);
      const resources = resourceLines.map(line => {
        const match = line.match(/^\d+\.\s+"([^"]+)"\s+-\s+(.+)$/);
        if (match) {
          return {
            title: match[1],
            provider: match[2],
            type: "course",
            relevance: "high"
          };
        }
        return null;
      }).filter(Boolean);
      
      return resources;
    } catch (error) {
      console.error("Error using database tool:", error);
      
      // Fallback to generating resources using the LLM
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", this.systemPrompt],
        ["system", "Generate learning resources for the given learning plan. Include courses, books, and online resources. Return as a JSON array with 'title', 'provider', 'type', and 'relevance' properties."],
        ["system", `Learning Plan: ${JSON.stringify(plan)}`],
        ["human", "What are the best resources to learn these skills?"]
      ]);
      
      const chain = RunnableSequence.from([
        prompt,
        this.llm
      ]);
      
      const response = await chain.invoke({});
      try {
        return JSON.parse(response.content);
      } catch (error) {
        console.error("Error parsing resources JSON:", error);
        return [];
      }
    }
  }

  protected async processMessage(from: string, message: string) {
    if (from === 'cara' && message.includes('analysis request')) {
      // Wait for Maya and Ellie to complete their analyses
      setTimeout(async () => {
        const skills = await memoryManager.recall('maya', 'skills');
        if (skills) {
          const results = await this.createLearningPlan(skills);
          await this.broadcast(
            `Learning plan complete: ${results.results.resources.length} resources identified`,
            ['cara']
          );
        }
      }, 10000); // Give enough time for other agents to complete
      
      return "Will create learning plan after skills and market analysis are complete.";
    }
    return null;
  }
}

// Create agent factories
export function createCaraAgent(llm: ChatOpenAI, systemPrompt: string) {
  return new CaraAgent(llm, systemPrompt);
}

export function createMayaAgent(llm: ChatOpenAI, systemPrompt: string) {
  return new MayaAgent(llm, systemPrompt);
}

export function createEllieAgent(llm: ChatOpenAI, systemPrompt: string) {
  return new EllieAgent(llm, systemPrompt);
}

export function createSophiaAgent(llm: ChatOpenAI, systemPrompt: string) {
  return new SophiaAgent(llm, systemPrompt);
}
