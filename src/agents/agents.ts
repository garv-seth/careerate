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
      "Resume Analysis Specialist",
      "I specialize in deeply analyzing resumes and professional profiles to extract skills, experience, education, and provide a summary, key strengths, and areas for development.",
      "Resume analysis, skill extraction, experience parsing, professional profile assessment",
      ["resume_parsing", "skill_extraction", "experience_analysis", "strength_identification", "development_area_identification", "resume_summarization"],
      // Add any specific tools Maya might need, e.g., a hypothetical "ATS_compatibility_checker"
      tools.filter(tool => [/* "specific_tool_for_maya" */].includes(tool.name)) 
    );
  }

  async analyze(text: string): Promise<{ 
    message: AIMessage, 
    results: { 
      skills: any[], 
      experience: any, 
      summary: string, 
      strengths: string[], 
      areasForDevelopment: string[] 
    } 
  }> {
    this.updateState('working');
    this.messageHistory.push(new HumanMessage(`Analyze the following resume text: ${text.substring(0, 8000)}`)); // Truncate for very long resumes

    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      new MessagesPlaceholder("messageHistory"),
      ["human", `
        Please analyze the provided resume text thoroughly. Based on your analysis, provide the following in a structured JSON format:
        1.  **skills**: A comprehensive list of technical and soft skills. For each skill, provide the skill name and an estimated proficiency level (e.g., Beginner, Intermediate, Advanced, Expert) if inferable.
            Example: [{ "name": "JavaScript", "level": "Advanced" }, { "name": "Project Management", "level": "Expert" }]
        2.  **experience**: A summary of work experience, including roles, companies, duration, and key responsibilities/achievements for each.
            Example: [{ "role": "Software Engineer", "company": "Tech Solutions Inc.", "duration": "Jan 2020 - Present", "summary": "Developed and maintained web applications..." }]
        3.  **summary**: A concise overall summary of the candidate's profile (2-3 sentences).
        4.  **strengths**: A list of 3-5 key professional strengths evident from the resume.
        5.  **areasForDevelopment**: A list of 2-3 potential areas for development or skills to acquire for career growth, based on the resume and common career progression.

        Focus on extracting factual information and making reasonable inferences.
        Resume Text:
        ---
        ${text.substring(0, 8000)}
        ---
        
        Return ONLY the JSON object containing these fields. Do not add any extra conversational text or markdown formatting around the JSON.
        Ensure the JSON is well-formed.
        Example JSON structure:
        {
          "skills": [{"name": "Python", "level": "Intermediate"}, {"name": "Communication", "level": "Advanced"}],
          "experience": [{"role": "Data Analyst", "company": "Data Corp", "duration": "June 2021 - May 2023", "summary": "Analyzed sales data..."}],
          "summary": "A data analyst with 2 years of experience...",
          "strengths": ["Data Analysis", "Problem Solving"],
          "areasForDevelopment": ["Machine Learning", "Cloud Platforms"]
        }
      `],
    ]);

    const chain = RunnableSequence.from([
      analysisPrompt,
      this.llm
    ]);

    let analysisResult;
    let parsedAnalysis = {
        skills: [],
        experience: [],
        summary: "Could not generate a summary.",
        strengths: [],
        areasForDevelopment: []
    };

    try {
      const response = await chain.invoke({ messageHistory: this.messageHistory });
      this.messageHistory.push(response);
      analysisResult = response.content;

      // Attempt to parse the JSON output from the LLM
      // The LLM might sometimes include ```json ... ``` or just the raw JSON.
      let jsonString = analysisResult as string;
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith("```")) {
         jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }
      
      try {
        parsedAnalysis = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("Maya: Error parsing LLM JSON response:", parseError);
        console.error("Maya: Raw LLM response that failed parsing:", jsonString);
        // Fallback or re-prompting could be implemented here
        // For now, we use the default empty structure.
         parsedAnalysis.summary = "Failed to parse detailed analysis. Resume processed, but insights may be limited.";
      }

    } catch (error: any) {
      console.error("Maya: Error during LLM call for resume analysis:", error);
      this.updateState('failed');
      throw new Error("Maya failed to analyze the resume due to an LLM error.");
    }
    
    // Store extracted skills for Pinecone (if available and skills were extracted)
    if (parsedAnalysis.skills && parsedAnalysis.skills.length > 0) {
      try {
        // Assuming storeResumeEmbeddings expects the raw text and the skills array
        await storeResumeEmbeddings(text.substring(0, 8000), parsedAnalysis.skills); 
        console.log("Maya: Resume text and skills stored for embeddings.");
      } catch (embeddingError) {
        console.error("Maya: Error storing resume embeddings:", embeddingError);
        // Non-fatal, continue with analysis results
      }
    }

    const finalResults = {
      skills: parsedAnalysis.skills || [],
      experience: parsedAnalysis.experience || [],
      summary: parsedAnalysis.summary || "Resume analysis complete.",
      strengths: parsedAnalysis.strengths || [],
      areasForDevelopment: parsedAnalysis.areasForDevelopment || []
    };
    
    await this.storeMemory('last_analysis', finalResults);
    this.updateState('completed');
    
    return {
      message: new AIMessage("Resume analysis complete. Extracted skills, experience, summary, strengths, and areas for development."),
      results: finalResults
    };
  }

  // Remove or comment out old extractSkills and extractExperience if they are no longer used.
  // private async extractSkills(text: string) { ... }
  // private async extractExperience(text: string) { ... }

  protected async processMessage(from: string, message: string) {
    // Maya typically acts on direct analysis requests, but could respond to Cara's queries
    console.log(`Maya received message from ${from}: ${message}`);
    // Example: if Cara asks for a re-analysis or specific detail
    if (message.toLowerCase().includes("re-analyze") || message.toLowerCase().includes("clarify skill")) {
      const lastResume = await this.recall('last_resume_text'); // Assuming resume text is stored
      if (lastResume) {
        // Potentially re-run a more focused analysis or part of it
        // For now, just acknowledge
        return "Acknowledged. If you need a specific part of the resume re-analyzed, please specify.";
      }
      return "No resume text found in memory to re-analyze.";
    }
    return `Maya acknowledges message from ${from}.`;
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
