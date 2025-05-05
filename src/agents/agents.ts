
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createTools } from "./tools";
import { storeResumeEmbeddings, searchVectorStore } from "./pinecone";
import { MemoryManager } from "./memory";

// Create tools and memory manager
const tools = createTools();
const memoryManager = new MemoryManager();

// Base agent class with memory and communication
class BaseAgent {
  name: string;
  llm: ChatOpenAI;
  systemPrompt: string;
  memory: any;
  messageHistory: BaseMessage[];

  constructor(name: string, llm: ChatOpenAI, systemPrompt: string) {
    this.name = name;
    this.llm = llm;
    this.systemPrompt = systemPrompt;
    this.messageHistory = [];
    this.memory = memoryManager.getAgentMemory(name);
  }

  async broadcast(message: string, recipients: string[]) {
    return await memoryManager.broadcastMessage(this.name, message, recipients);
  }

  async receiveMessage(from: string, message: string) {
    this.messageHistory.push(new AIMessage(`[${from}]: ${message}`));
    return this.processMessage(from, message);
  }

  protected async processMessage(from: string, message: string): Promise<any> {
    // Override in specific agents
    return null;
  }

  protected async storeMemory(key: string, value: any) {
    await memoryManager.store(this.name, key, value);
  }

  protected async recall(key: string): Promise<any> {
    return await memoryManager.recall(this.name, key);
  }
}

// Cara - Orchestration Agent
class CaraAgent extends BaseAgent {
  constructor(llm: ChatOpenAI, systemPrompt: string) {
    super('cara', llm, systemPrompt);
  }

  async analyze(input: string) {
    // Store the analysis request
    await this.storeMemory('current_analysis', input);

    // Broadcast to other agents
    await this.broadcast('New analysis request received', ['maya', 'ellie', 'sophia']);

    // Initial analysis
    const response = await this.llm.invoke(input);
    return {
      message: response,
      results: {
        analysis: "Initial analysis complete",
        delegations: await this.recall('delegations') || {}
      }
    };
  }

  protected async processMessage(from: string, message: string) {
    // Update delegations based on agent responses
    const delegations = await this.recall('delegations') || {};
    delegations[from] = message;
    await this.storeMemory('delegations', delegations);

    return delegations;
  }
}

// Maya - Resume Analysis Agent
class MayaAgent extends BaseAgent {
  constructor(llm: ChatOpenAI, systemPrompt: string) {
    super('maya', llm, systemPrompt);
  }

  async analyze(text: string) {
    const skills = await this.extractSkills(text);
    const experience = await this.extractExperience(text);
    
    // Store findings
    await this.storeMemory('skills', skills);
    await this.storeMemory('experience', experience);

    // Broadcast findings
    await this.broadcast(
      `Identified ${skills.length} skills and ${experience.years} years of experience`,
      ['cara', 'ellie', 'sophia']
    );

    return {
      message: new AIMessage("Resume analysis complete"),
      results: { skills, experience }
    };
  }

  private async extractSkills(text: string) {
    const response = await this.llm.invoke(
      `Extract skills from: ${text}. Return as JSON array.`
    );
    return JSON.parse(response.content);
  }

  private async extractExperience(text: string) {
    const response = await this.llm.invoke(
      `Extract years of experience and domains from: ${text}. Return as JSON.`
    );
    return JSON.parse(response.content);
  }
}

// Ellie - Industry Insights Agent
class EllieAgent extends BaseAgent {
  constructor(llm: ChatOpenAI, systemPrompt: string) {
    super('ellie', llm, systemPrompt);
  }

  async analyze(skills: string[]) {
    // Get market insights using tools
    const insights = await Promise.all(
      skills.map(skill => tools[0]._call(`market demand for ${skill}`))
    );

    const trends = await this.researchTrends(skills);
    const opportunities = await this.findOpportunities(skills, trends);

    // Store and broadcast findings
    await this.storeMemory('market_insights', { trends, opportunities });
    await this.broadcast(
      `Identified ${trends.length} trends and ${opportunities.length} opportunities`,
      ['cara', 'sophia']
    );

    return {
      message: new AIMessage("Market analysis complete"),
      results: { trends, opportunities }
    };
  }

  private async researchTrends(skills: string[]) {
    const response = await tools[1]._call(
      `Current industry trends for: ${skills.join(', ')}`
    );
    return response.split('\n').filter(Boolean);
  }

  private async findOpportunities(skills: string[], trends: string[]) {
    const response = await this.llm.invoke(
      `Find career opportunities based on skills (${skills.join(', ')}) and trends (${trends.join(', ')})`
    );
    return JSON.parse(response.content);
  }
}

// Sophia - Learning AI Agent
class SophiaAgent extends BaseAgent {
  constructor(llm: ChatOpenAI, systemPrompt: string) {
    super('sophia', llm, systemPrompt);
  }

  async createLearningPlan(skills: string[]) {
    // Get stored market insights from Ellie
    const marketInsights = await memoryManager.recall('ellie', 'market_insights');
    
    const learningPlan = await this.generatePlan(skills, marketInsights);
    const resources = await this.findResources(learningPlan);

    // Store and broadcast plan
    await this.storeMemory('learning_plan', { plan: learningPlan, resources });
    await this.broadcast(
      `Created learning plan with ${resources.length} resources`,
      ['cara']
    );

    return {
      message: new AIMessage("Learning plan created"),
      results: { learningPlan, resources }
    };
  }

  private async generatePlan(skills: string[], marketInsights: any) {
    const response = await this.llm.invoke(
      `Create learning plan for skills (${skills.join(', ')}) considering market trends: ${JSON.stringify(marketInsights)}`
    );
    return JSON.parse(response.content);
  }

  private async findResources(plan: any) {
    const response = await tools[4]._call(
      `Find learning resources for: ${JSON.stringify(plan)}`
    );
    return JSON.parse(response);
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
