/**
 * Agent workflow orchestration based on A2A (Agent Development Kit) architecture
 */
import { EventEmitter } from 'events';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { storeResumeEmbeddings } from './pinecone';
import {
  createCaraAgent,
  createMayaAgent,
  createEllieAgent,
  createSophiaAgent,
  agentEmitter
} from './agents';
import {
  caraInitialSystemPrompt,
  mayaInitialSystemPrompt,
  ellieInitialSystemPrompt,
  sophiaInitialSystemPrompt
} from './prompts';
import { ChatOpenAI } from '@langchain/openai';

// Agent instances
let caraAgent: any = null;
let mayaAgent: any = null;
let ellieAgent: any = null;
let sophiaAgent: any = null;

// Initialize OpenAI LLM
let openai: ChatOpenAI | null = null;

// Agent status tracking
export type AgentStatuses = {
  cara: 'idle' | 'working' | 'thinking' | 'complete';
  maya: 'idle' | 'working' | 'thinking' | 'complete';
  ellie: 'idle' | 'working' | 'thinking' | 'complete';
  sophia: 'idle' | 'working' | 'thinking' | 'complete';
};

// Default status for all agents
export const agentStatuses: AgentStatuses = {
  cara: 'idle',
  maya: 'idle',
  ellie: 'idle',
  sophia: 'idle'
};

// Status update function
export const updateAgentStatus = (
  agent: 'cara' | 'maya' | 'ellie' | 'sophia',
  status: 'idle' | 'working' | 'thinking' | 'complete'
) => {
  agentStatuses[agent] = status;

  // Broadcast status update
  agentEmitter.emit('agent_status_update', { ...agentStatuses });

  console.log(`Agent ${agent} status: ${status}`);
};

// Interface for agent state
export interface AgentState {
  user_input: string;
  cara_response?: string;
  maya_response?: string;
  ellie_response?: string;
  sophia_response?: string;
  skills?: string[];
  experience?: any;
  market_insights?: any;
  learning_plan?: any;
  final_plan?: string;
  errors?: string[];
  status: {
    cara: 'idle' | 'working' | 'thinking' | 'complete';
    maya: 'idle' | 'working' | 'thinking' | 'complete';
    ellie: 'idle' | 'working' | 'thinking' | 'complete';
    sophia: 'idle' | 'working' | 'thinking' | 'complete';
  };
}

let currentAgentState: AgentState | null = null;

// Initialize OpenAI with model from settings
const initializeOpenAI = async (modelName: string = "gpt-4o") => {
  try {
    if (process.env.OPENAI_API_KEY) {
      console.log(`✅ OPENAI_API_KEY found! Initializing OpenAI with model ${modelName}`);
      openai = new ChatOpenAI({
        modelName: modelName,
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
      // Mock implementation
      initializeMockAgents();
    }
  } catch (error) {
    console.error("❌ Error initializing OpenAI:", error);
    console.log("⚠️ Falling back to mock implementation due to error");
    // Mock implementation
    initializeMockAgents();
  }
};

// Initialize agents with proper LLM
const initializeAgents = () => {
  try {
    console.log("Creating agents with initialized OpenAI client");
    caraAgent = createCaraAgent(openai, caraInitialSystemPrompt);
    mayaAgent = createMayaAgent(openai, mayaInitialSystemPrompt);
    ellieAgent = createEllieAgent(openai, ellieInitialSystemPrompt);
    sophiaAgent = createSophiaAgent(openai, sophiaInitialSystemPrompt);
    console.log("✅ All agents created successfully");

    // Register event listeners for agent communication
    setupAgentEventListeners();
  } catch (error) {
    console.error("❌ Error creating agents:", error);
    // Keep existing mock implementations if error
    initializeMockAgents();
  }
};

// Mock implementation for testing without API keys
const initializeMockAgents = () => {
  console.log("Initializing mock agents for testing");

  // Simple mock of the agent interfaces
  caraAgent = {
    analyze: async (input: string) => {
      updateAgentStatus('cara', 'working');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateAgentStatus('cara', 'complete');
      return {
        message: new AIMessage("I've analyzed your career situation and coordinated with our specialized agents."),
        results: {
          analysis: "Mock analysis complete",
          delegations: {}
        }
      };
    },
    broadcast: async (message: string, recipients: string[]) => {
      console.log(`[MOCK] Cara broadcasting: ${message} to ${recipients.join(', ')}`);
      return true;
    },
    updateState: (state: string) => {
      updateAgentStatus('cara', state as any);
    }
  };

  mayaAgent = {
    analyze: async (text: string) => {
      updateAgentStatus('maya', 'working');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateAgentStatus('maya', 'complete');
      return {
        message: new AIMessage("I've analyzed your resume and extracted key skills and experience."),
        results: {
          skills: ["JavaScript", "React", "Node.js", "Communication", "Leadership"],
          experience: {
            years: 5,
            titles: ["Software Developer", "Team Lead"],
            domains: ["Web Development", "E-commerce"]
          }
        }
      };
    },
    broadcast: async (message: string, recipients: string[]) => {
      console.log(`[MOCK] Maya broadcasting: ${message} to ${recipients.join(', ')}`);
      return true;
    },
    updateState: (state: string) => {
      updateAgentStatus('maya', state as any);
    }
  };

  ellieAgent = {
    analyze: async (skills: string[]) => {
      updateAgentStatus('ellie', 'working');
      await new Promise(resolve => setTimeout(resolve, 2500));
      updateAgentStatus('ellie', 'complete');
      return {
        message: new AIMessage("I've researched current market trends for your skills."),
        results: {
          trends: ["Remote work continues to grow", "AI integration skills in high demand"],
          opportunities: [
            { title: "Senior Frontend Developer", relevantSkills: ["React", "JavaScript"] },
            { title: "Full Stack Engineer", relevantSkills: ["Node.js", "JavaScript", "React"] }
          ]
        }
      };
    },
    broadcast: async (message: string, recipients: string[]) => {
      console.log(`[MOCK] Ellie broadcasting: ${message} to ${recipients.join(', ')}`);
      return true;
    },
    updateState: (state: string) => {
      updateAgentStatus('ellie', state as any);
    }
  };

  sophiaAgent = {
    createLearningPlan: async (skills: string[]) => {
      updateAgentStatus('sophia', 'working');
      await new Promise(resolve => setTimeout(resolve, 3000));
      updateAgentStatus('sophia', 'complete');
      return {
        message: new AIMessage("I've created a personalized learning plan for your career growth."),
        results: {
          learningPlan: {
            focusAreas: ["Advanced React", "AI Integration", "System Design"],
            timeframe: {
              shortTerm: "React Advanced Patterns",
              mediumTerm: "AI Integration Fundamentals",
              longTerm: "Senior Architecture Skills"
            }
          },
          resources: [
            { title: "Advanced React Patterns", provider: "Frontend Masters", type: "course" },
            { title: "AI for JavaScript Developers", provider: "Udemy", type: "course" }
          ]
        }
      };
    },
    broadcast: async (message: string, recipients: string[]) => {
      console.log(`[MOCK] Sophia broadcasting: ${message} to ${recipients.join(', ')}`);
      return true;
    },
    updateState: (state: string) => {
      updateAgentStatus('sophia', state as any);
    }
  };

  console.log("✅ Mock agents initialized");

  // Register event listeners for agent communication
  setupAgentEventListeners();
};

// Setup event listeners for agent communication
const setupAgentEventListeners = () => {
  // Listen for agent status updates
  agentEmitter.on('agent_status_update', (statuses) => {
    console.log('Agent statuses updated:', statuses);

    // Update current state if it exists
    if (currentAgentState) {
      currentAgentState.status = statuses;
    }
  });

  // Listen for agent broadcasts
  agentEmitter.on('agent_broadcast', (payload) => {
    console.log(`Broadcast from ${payload.from}: ${payload.message} to ${payload.recipients.join(', ')}`);
  });

  // Listen for completed analysis
  agentEmitter.on('analysis_complete', (result) => {
    console.log('Analysis complete:', result.originalQuery);

    // Update current state if it exists
    if (currentAgentState) {
      currentAgentState.final_plan = result.synthesisResult;
    }
  });
};

// A2A-inspired workflow execution
export const executeAgentWorkflow = async (input: string, agentModels: Record<string, string> = {}): Promise<AgentState> => {
  console.log(`Starting agent workflow for input: ${input}`);

  // Initialize state
  currentAgentState = {
    user_input: input,
    status: { ...agentStatuses },
    errors: []
  };

  // If agents aren't initialized, do so with specified models
  if (!caraAgent) {
    if (agentModels.orchestration) {
      await initializeOpenAI(agentModels.orchestration);
    } else {
      await initializeOpenAI();
    }
  } else {
    // If models have changed, reinitialize appropriate agents
    if (openai && agentModels.orchestration && openai.modelName !== agentModels.orchestration) {
      console.log(`Updating Cara's model to ${agentModels.orchestration}`);
      const newLLM = new ChatOpenAI({
        modelName: agentModels.orchestration,
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      caraAgent = createCaraAgent(newLLM, caraInitialSystemPrompt);
    }

    if (openai && agentModels.resume && openai.modelName !== agentModels.resume) {
      console.log(`Updating Maya's model to ${agentModels.resume}`);
      const newLLM = new ChatOpenAI({
        modelName: agentModels.resume,
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      mayaAgent = createMayaAgent(newLLM, mayaInitialSystemPrompt);
    }

    if (openai && agentModels.research && openai.modelName !== agentModels.research) {
      console.log(`Updating Ellie's model to ${agentModels.research}`);
      const newLLM = new ChatOpenAI({
        modelName: agentModels.research,
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      ellieAgent = createEllieAgent(newLLM, ellieInitialSystemPrompt);
    }

    if (openai && agentModels.learning && openai.modelName !== agentModels.learning) {
      console.log(`Updating Sophia's model to ${agentModels.learning}`);
      const newLLM = new ChatOpenAI({
        modelName: agentModels.learning,
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      sophiaAgent = createSophiaAgent(newLLM, sophiaInitialSystemPrompt);
    }
  }

  try {
    // Start with Cara as the orchestrator
    console.log("1. Starting Cara analysis (orchestration)");
    const caraResult = await caraAgent.analyze(input);
    currentAgentState.cara_response = caraResult.message.content;

    // Maya processes the resume content independently
    console.log("2. Starting Maya analysis (resume)");
    try {
      const mayaResult = await mayaAgent.analyze(input);
      currentAgentState.maya_response = mayaResult.message.content;
      currentAgentState.skills = mayaResult.results.skills;
      currentAgentState.experience = mayaResult.results.experience;
    } catch (error) {
      console.error("Error in Maya's analysis:", error);
      currentAgentState.errors.push(`Maya error: ${error.message}`);
    }

    // Ellie analyzes market trends based on skills from Maya
    console.log("3. Starting Ellie analysis (market research)");
    try {
      // Wait briefly to ensure Maya's results are available
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get skills from current state or use placeholders
      const skills = currentAgentState.skills || [
        "JavaScript", "React", "Communication", "Problem Solving"
      ];

      const ellieResult = await ellieAgent.analyze(skills);
      currentAgentState.ellie_response = ellieResult.message.content;
      currentAgentState.market_insights = {
        trends: ellieResult.results.trends,
        opportunities: ellieResult.results.opportunities
      };
    } catch (error) {
      console.error("Error in Ellie's analysis:", error);
      currentAgentState.errors.push(`Ellie error: ${error.message}`);
    }

    // Sophia creates learning plan based on Maya's skills and Ellie's insights
    console.log("4. Starting Sophia analysis (learning plan)");
    try {
      // Wait briefly to ensure previous results are available
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get skills from current state or use placeholders
      const skills = currentAgentState.skills || [
        "JavaScript", "React", "Communication", "Problem Solving"
      ];

      const sophiaResult = await sophiaAgent.createLearningPlan(skills);
      currentAgentState.sophia_response = sophiaResult.message.content;
      currentAgentState.learning_plan = sophiaResult.results;
    } catch (error) {
      console.error("Error in Sophia's analysis:", error);
      currentAgentState.errors.push(`Sophia error: ${error.message}`);
    }

    // Final synthesis by Cara
    console.log("5. Final synthesis by Cara");
    try {
      const synthesisResult = await caraAgent.synthesizeResults?.();
      if (synthesisResult) {
        currentAgentState.final_plan = synthesisResult;
      }
    } catch (error) {
      console.error("Error in final synthesis:", error);
      currentAgentState.errors.push(`Synthesis error: ${error.message}`);
    }

    console.log("Agent workflow complete!");
  } catch (error) {
    console.error("Error in agent workflow execution:", error);
    currentAgentState.errors.push(`Workflow error: ${error.message}`);
  }

  return currentAgentState;
};

// Function to update agent models based on settings
export const updateAgentModels = async (modelSettings: Record<string, string>): Promise<boolean> => {
  try {
    console.log("Updating agent models with settings:", modelSettings);

    // Reinitialize agents with new models
    if (modelSettings.orchestration && openai) {
      console.log(`Updating Cara's model to ${modelSettings.orchestration}`);
      const newLLM = new ChatOpenAI({
        modelName: modelSettings.orchestration,
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      caraAgent = createCaraAgent(newLLM, caraInitialSystemPrompt);
    }

    if (modelSettings.resume && openai) {
      console.log(`Updating Maya's model to ${modelSettings.resume}`);
      const newLLM = new ChatOpenAI({
        modelName: modelSettings.resume,
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      mayaAgent = createMayaAgent(newLLM, mayaInitialSystemPrompt);
    }

    if (modelSettings.research && openai) {
      console.log(`Updating Ellie's model to ${modelSettings.research}`);
      const newLLM = new ChatOpenAI({
        modelName: modelSettings.research,
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      ellieAgent = createEllieAgent(newLLM, ellieInitialSystemPrompt);
    }

    if (modelSettings.learning && openai) {
      console.log(`Updating Sophia's model to ${modelSettings.learning}`);
      const newLLM = new ChatOpenAI({
        modelName: modelSettings.learning,
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      sophiaAgent = createSophiaAgent(newLLM, sophiaInitialSystemPrompt);
    }

    return true;
  } catch (error) {
    console.error("Error updating agent models:", error);
    return false;
  }
};

// Make analysis settings take effect
export const updateAnalysisSettings = (settings: { deepAnalysis: boolean, realTimeMarketData: boolean }): void => {
  console.log("Updating analysis settings:", settings);

  // Broadcast settings to agents
  agentEmitter.emit('analysis_settings_update', settings);
};

// Function to reset agent state
export const resetAgentState = (): void => {
  currentAgentState = null;

  // Reset all agent statuses
  updateAgentStatus('cara', 'idle');
  updateAgentStatus('maya', 'idle');
  updateAgentStatus('ellie', 'idle');
  updateAgentStatus('sophia', 'idle');

  console.log("Agent state reset");
};

// Initialize on module load
initializeOpenAI();

// Export functions and types
export {
  agentEmitter,
  AgentState
};
// Track agent activity function
const trackAgentActivity = (activity: any) => {
  // Add userId from current state context if available
  if (currentAgentState?.user_input && !activity.userId) {
    activity.userId = currentAgentState.user_input;
  }

  // Emit the activity to any listening clients
  agentEmitter.emit('activity', activity);

  // Log the activity (without detailed results to avoid log spam)
  const { careerAdvice, ...loggableActivity } = activity;
  console.log(`Agent ${activity.agent}: ${activity.action}`, loggableActivity.detail || '');
};


// Get the model for a specific agent type
export const getAgentModel = async (agentType: string, userId: string) => {
  try {
    // Get user settings
    const { storage } = await import('../server/storage');
    const settings = await storage.getUserSettings(userId);

    if (!settings || !settings.models) {
      // Return default models if no settings exist
      const defaultModels: Record<string, string> = {
        orchestration: 'claude-3-7-sonnet',
        resume: 'gpt-4-1106-preview',
        research: 'pplx-70b-online',
        learning: 'claude-3-7-haiku'
      };

      return defaultModels[agentType] || 'gpt-4-turbo';
    }

    return settings.models[agentType];
  } catch (error) {
    console.error('Error getting agent model:', error);
    // Return default models if error
    const fallbackModels: Record<string, string> = {
      orchestration: 'claude-3-7-sonnet',
      resume: 'gpt-4-1106-preview',
      research: 'pplx-70b-online',
      learning: 'claude-3-7-haiku'
    };

    return fallbackModels[agentType] || 'gpt-4-turbo';
  }
};

// Run the agent workflow
export const runCareerate = async (userId: string, resumeText: string, isPremium: boolean = false) => {
  console.log(`Starting Careerate analysis for user ${userId} (Premium: ${isPremium})`);

  // Reset agent statuses
  agentStatuses.cara = 'idle';
  agentStatuses.maya = 'idle';
  agentStatuses.ellie = 'idle';
  agentStatuses.sophia = 'idle';

  // Initialize the agent workflow
  trackAgentActivity({
    agent: 'cara',
    action: 'Initializing agent workflow',
    detail: `Setting up the workflow for coordinated analysis${isPremium ? ' with premium features' : ''}`,
    timestamp: new Date()
  });

  // Initial state for the workflow
  const initialState: any = {
    input: resumeText,
    userId: userId,
    isPremium: isPremium,
    messages: [],
    cara: { messages: [] },
    maya: { messages: [] },
    ellie: { messages: [] },
    sophia: { messages: [] }
  };

  try {
    // Set the current state for context in agent activities and status updates
    //currentAgentState = initialState;

    // Run our custom agent workflow executor
    // This will execute all agents in sequence: cara -> maya -> ellie -> sophia -> synthesize
    console.log("Starting agent workflow for career analysis");
    const result = await executeAgentWorkflow(resumeText);

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
    //return result.final_output || createSampleCareerAdvice();
    return result.final_plan;
  } catch (workflowError) {
    console.error("Error running agent workflow:", workflowError);

    // If our workflow fails, fall back to the legacy sequential execution approach
    console.log("❌❌❌ ERROR: Falling back to legacy sequential execution approach...");
    console.log("❌❌❌ Workflow error details:", workflowError);
    console.log("❌❌❌ This should NOT happen if the APIs are properly initialized!");

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
      resumeText,
      isPremium
    );
    updateAgentStatus('cara', 'complete');

    // Create an activity with the career advice attached
    const completeActivity: any = {
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

// Enhanced error handling and fallbacks
async function runCaraForPlanning(resumeText: string) {
  console.log("Running Cara agent for planning");

  try {
    return await caraAgent(resumeText);
  } catch (error) {
    console.error("Error running Cara agent, using fallback:", error);
    return {
      message: new AIMessage({
        content: "Generated basic career recommendations",
        additional_kwargs: {}
      }),
      results: {
        analysis: "Basic career path analysis completed",
        recommendations: [
          "Consider upskilling in your current domain",
          "Network with industry professionals",
          "Stay updated with industry trends"
        ],
        delegations: {}
      }
    };
  }
}

async function runMayaAnalysis(resumeText: string, userId: string) {
  console.log("Running Maya agent for resume analysis");

  try {
    const result = await mayaAgent(resumeText);
    if (!result || !result.results) throw new Error("Invalid Maya agent response");
    return result.results;
  } catch (error) {
    console.warn("Maya agent error, using fallback analysis:", error);
    return {
      skills: ["analytical thinking", "problem solving", "communication"],
      experience: {
        roles: ["Professional"],
        years: 1,
        summary: "Experience information unavailable"
      },
      strengths: ["adaptability", "continuous learning"],
      automationRisk: "low",
      recommendations: ["Consider expanding your skill set", "Document your achievements"],
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
  resumeText: string,
  isPremium: boolean = false,
  premiumData?: {
    careerTrajectory?: any;
    executiveNetwork?: any;
    skillsAccelerator?: any;
  }
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
    // Define the type with optional premium property
    type CareerAdvice = {
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
        skills: Array<any>;
        resources: Array<any>;
        timeEstimate: string;
      };
      nextSteps: {
        immediate: string[];
        shortTerm: string[];
        longTerm: string[];
      };
      premium?: {
        careerTrajectory?: any;
        executiveNetwork?: any;
        skillsAccelerator?: any;
      };
    };

    // Create the advice result with the proper type
    const adviceResult: CareerAdvice = {
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

    // Add premium features if enabled
    if (isPremium) {
      console.log("Adding premium features to career advice");

      // Use provided premium data if available, otherwise generate placeholder data
      adviceResult.premium = {
        // Career Trajectory Mapping
        careerTrajectory: premiumData?.careerTrajectory || {
          targetRole: "Senior Data Scientist",
          timeframe: 24, // in months
          milestones: [
            {
              title: "Complete Advanced Machine Learning Certification",
              description: "Finish a comprehensive certification in machine learning that covers advanced topics",
              targetDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
              priority: 2 // critical
            },
            {
              title: "Contribute to Open Source ML Project",
              description: "Make meaningful contributions to a well-known open source machine learning project",
              targetDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 months from now
              priority: 1 // high
            },
            {
              title: "Complete Portfolio of Three End-to-End ML Projects",
              description: "Build three comprehensive machine learning projects that showcase different skills",
              targetDate: new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 18 months from now
              priority: 1 // high
            }
          ],
          alternativePaths: [
            {
              name: "Machine Learning Engineer",
              description: "Focus more on the engineering and deployment aspects of ML systems",
              probabilityScore: 85,
              potentialUpsides: "More stable job market, higher demand in many industries",
              potentialDownsides: "Less focus on research and cutting-edge algorithms"
            },
            {
              name: "AI Research Scientist",
              description: "Focus on research and development of new ML algorithms",
              probabilityScore: 65,
              potentialUpsides: "Opportunity to work on cutting-edge technology and publish papers",
              potentialDownsides: "More competitive field, may require PhD, fewer job openings"
            }
          ]
        },

        // Executive Network Access
        executiveNetwork: premiumData?.executiveNetwork || {
          recommendedEvents: [
            {
              title: "AI & Big Data Expo",
              description: "Global conference showcasing next-generation technologies in AI, Big Data and ML",
              eventDate: new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 months from now
              eventType: "Conference",
              speakerInfo: {
                keynotes: ["Dr. Andrew Ng", "Dr. Fei-Fei Li"],
                companies: ["Google AI", "Microsoft Research", "OpenAI"]
              },
              relevanceScore: 92
            },
            {
              title: "Women in Data Science Meetup",
              description: "Monthly networking event for women in data science and related fields",
              eventDate: new Date(Date.now() + 0.5 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
              eventType: "Networking",
              speakerInfo: {
                organizers: ["Women in ML & Data Science"],
                guests: ["Various industry professionals"]
              },
              relevanceScore: 85
            }
          ],
          mentorshipOpportunities: [
            {
              mentorName: "Sarah Johnson",
              mentorTitle: "Director of Data Science",
              mentorCompany: "Tech Innovations Inc.",
              expertise: ["Machine Learning", "Team Leadership", "Career Development"],
              recommendationReason: "Sarah has extensive experience helping mid-career professionals transition into senior data science roles",
              matchScore: 90
            },
            {
              mentorName: "Michael Chen",
              mentorTitle: "Principal ML Engineer",
              mentorCompany: "AI Solutions",
              expertise: ["Deep Learning", "Production ML Systems", "Technical Interviews"],
              recommendationReason: "Michael specializes in the technologies identified as most relevant to your career path",
              matchScore: 85
            }
          ],
          networkingStrategy: "Focus on building relationships with senior professionals in your target industry through regular meetups and conferences. Schedule at least one informational interview per month with someone in your desired role."
        },

        // Skills Gap Accelerator
        skillsAccelerator: premiumData?.skillsAccelerator || {
          assessedSkills: [
            {
              name: "Python Programming",
              category: "Technical",
              currentLevel: 4,
              targetLevel: 8,
              marketDemand: 95,
              futureRelevance: 90,
              salarImpact: 15000,
              priority: 2 // critical
            },
            {
              name: "Deep Learning",
              category: "Technical",
              currentLevel: 2,
              targetLevel: 7,
              marketDemand: 90,
              futureRelevance: 95,
              salarImpact: 25000,
              priority: 2 // critical
            },
            {
              name: "MLOps",
              category: "Technical",
              currentLevel: 1,
              targetLevel: 6,
              marketDemand: 85,
              futureRelevance: 90,
              salarImpact: 20000,
              priority: 1 // high
            },
            {
              name: "Data Visualization",
              category: "Technical",
              currentLevel: 5,
              targetLevel: 8,
              marketDemand: 80,
              futureRelevance: 75,
              salarImpact: 10000,
              priority: 0 // normal
            }
          ],
          personalizedLearningPath: {
            name: "Advanced Data Science Career Path",
            description: "A comprehensive learning path designed to transition you from your current role to a senior data science position",
            estimatedCompletionTime: 720 * 60, // 720 hours in minutes
            resources: [
              {
                title: "Deep Learning Specialization",
                provider: "Coursera",
                type: "Course Series",
                url: "https://www.coursera.org/specializations/deep-learning",
                cost: 4900, // $49.00
                duration: 120 * 60, // 120 hours in minutes
                difficulty: "Intermediate to Advanced",
                skillsAddressed: ["Deep Learning", "Neural Networks", "Python Programming"],
                relevanceScore: 95,
                order: 1
              },
              {
                title: "Deploying Machine Learning Models in Production",
                provider: "Coursera",
                type: "Course",
                url: "https://www.coursera.org/learn/deploying-machine-learning-models-in-production",
                cost: 4900, // $49.00
                duration: 40 * 60, // 40 hours in minutes
                difficulty: "Advanced",
                skillsAddressed: ["MLOps", "Model Deployment", "Production Systems"],
                relevanceScore: 90,
                order: 2
              },
              {
                title: "Advanced Data Visualization with Python",
                provider: "DataCamp",
                type: "Course",
                url: "https://www.datacamp.com/courses/advanced-data-visualization-with-python",
                cost: 2500, // $25.00
                duration: 20 * 60, // 20 hours in minutes
                difficulty: "Intermediate",
                skillsAddressed: ["Data Visualization", "Python Programming"],
                relevanceScore: 85,
                order: 3
              }
            ]
          },
          progressTrackingStrategy: "Set aside 10 hours per week for your learning path. Complete weekly check-ins to assess progress, revise goals, and update your strategy. Use the 'Focus on the Fundamentals First' approach - master one skill completely before moving to the next."
        }
      };
    }

    return adviceResult;
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