/**
 * Advanced LangGraph integration for Agent-based Analysis
 * 
 * This module combines LangGraph with our improved tools to create
 * powerful workflows for career transition analysis.
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { 
  StateGraph, 
  StateGraphArgs,
  createStateGraph, 
  END,
  AgentState
} from "@langchain/langgraph";

// Import our custom tools
import { improvedTavilySearch, executeSearch } from "../tools/improvedTavilySearch";
import { calculateAIReadinessScore } from "../tools/aiReadinessScore";

// Define the state type for the LangGraph
interface CareerTransitionState extends AgentState {
  currentRole: string;
  targetRole: string;
  userId: number;
  transitionId: number;
  stories: any[];
  skillGaps: any[];
  insights: any;
  aiReadinessScore?: any;
  marketData?: any;
  readyForNextStep: boolean;
}

/**
 * LangGraph Agent for comprehensive career transition analysis
 */
export class LangGraphTransitionAgent {
  private model: ChatOpenAI | ChatGoogleGenerativeAI;
  private tools: StructuredTool[] = [];
  private tavilyTools: StructuredTool[] = [];
  private readinessTools: StructuredTool[] = [];
  private graph: StateGraph<CareerTransitionState>;
  
  constructor() {
    // Initialize the language model
    this.initializeModel();
    
    // Initialize the tools
    this.initializeTools();
    
    // Build the graph
    this.buildStateGraph();
  }

  /**
   * Initialize the language model with appropriate fallbacks
   */
  private initializeModel(): void {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.model = new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          modelName: "gpt-4o-mini", 
          temperature: 0.2,
          maxTokens: 2048,
        });
        console.log("LangGraph initialized with OpenAI GPT-4o-mini");
      } else {
        this.model = new ChatGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "",
          modelName: "gemini-1.5-flash",
          temperature: 0.2,
          maxOutputTokens: 2048,
        });
        console.log("LangGraph initialized with Gemini 1.5 Flash (fallback)");
      }
    } catch (error) {
      console.error("Error initializing LLM for LangGraph:", error);
      
      // Last resort fallback
      this.model = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "",
        modelName: "gemini-1.5-flash",
        temperature: 0.2,
        maxOutputTokens: 2048,
      });
      
      console.log("LangGraph using last resort Gemini model");
    }
  }

  /**
   * Initialize all tools with appropriate grouping
   */
  private initializeTools(): void {
    this.tools = [];
    this.tavilyTools = [];
    this.readinessTools = [];
    
    // Simplified implementation to avoid LangChain tool integration issues
    console.log("LangGraph: Using functional approach to tools instead of LangChain StructuredTool");
  }

  /**
   * Build the state graph for career transition analysis
   */
  private buildStateGraph(): void {
    try {
      // Define the nodes for the graph
      const nodes = {
        // Research node for gathering career transition stories
        research: this.createResearchNode(),
        
        // Skill gap analysis node
        analyzeSkillGaps: this.createSkillGapNode(),
        
        // AI readiness assessment node
        assessAIReadiness: this.createReadinessNode(),
        
        // Market analysis node
        analyzeMarket: this.createMarketAnalysisNode(),
        
        // Insights generation node
        generateInsights: this.createInsightsNode(),
        
        // Final integration node
        integrateFindings: this.createIntegrationNode()
      };
      
      // Create the graph structure
      const builder = createStateGraph<CareerTransitionState>({
        channels: {
          currentRole: { value: "" },
          targetRole: { value: "" },
          userId: { value: 0 },
          transitionId: { value: 0 },
          stories: { value: [] },
          skillGaps: { value: [] },
          insights: { value: {} },
          aiReadinessScore: { value: undefined },
          marketData: { value: undefined },
          readyForNextStep: { value: true },
          
          // Also include the standard agent state channels
          messages: { value: [] },
          steps: { value: [] }
        }
      });
      
      // Add nodes to the graph
      Object.entries(nodes).forEach(([name, node]) => {
        builder.addNode(name, node);
      });
      
      // Define the edges between nodes
      builder.addEdge("research", "analyzeSkillGaps");
      builder.addEdge("analyzeSkillGaps", "assessAIReadiness");
      builder.addEdge("assessAIReadiness", "analyzeMarket");
      builder.addEdge("analyzeMarket", "generateInsights");
      builder.addEdge("generateInsights", "integrateFindings");
      builder.addEdge("integrateFindings", END);
      
      // Compile the graph
      this.graph = builder.compile();
      
      console.log("LangGraph: Successfully built state graph for career transition analysis");
    } catch (error) {
      console.error("Error building LangGraph state graph:", error);
      throw error;
    }
  }

  /**
   * Create the research node for gathering career transition stories
   */
  private createResearchNode(): RunnableSequence<CareerTransitionState, CareerTransitionState> {
    const systemPrompt = new SystemMessage(
      `You are an expert career researcher tasked with finding real-world stories about career transitions.
      
      Your goal is to search for and analyze real experiences of professionals who have transitioned from the user's current role to their target role.
      
      Use the available search tools to find relevant information about:
      1. Common transition paths
      2. Success stories
      3. Challenges faced during the transition
      4. Strategies that worked for others
      
      Format the information you find into structured stories that can be used for further analysis.`
    );
    
    // Bind tools to the model for this node
    const modelWithTools = this.tavilyTools.length > 0 
      ? this.model.bindTools(this.tavilyTools)
      : this.model;
    
    // Create the node logic
    return RunnableSequence.from([
      // Input state processing
      (state: CareerTransitionState) => {
        console.log(`LangGraph Research: Researching transition from ${state.currentRole} to ${state.targetRole}`);
        
        // Format the messages for the model
        const messages = [
          systemPrompt,
          new HumanMessage(
            `I need to research career transitions from ${state.currentRole} to ${state.targetRole}.
            
            Please search for real experiences, challenges, and success stories of professionals who made this transition.
            
            Format your findings as a collection of 3-5 well-structured stories or examples.`
          )
        ];
        
        return { messages };
      },
      
      // Model invocation
      modelWithTools,
      
      // Output processing
      (response: AIMessage, state: CareerTransitionState) => {
        try {
          // Extract stories from the response
          let stories: any[] = [];
          
          // Try to parse structured data if available
          const content = response.content as string;
          
          if (content.includes('```json')) {
            // Extract JSON if provided in markdown format
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
              try {
                stories = JSON.parse(jsonMatch[1]);
              } catch (parseError) {
                console.error("Error parsing JSON stories:", parseError);
              }
            }
          } else {
            // Try to identify stories by section markers
            const storySegments = content.split(/\n+(?:Story|Example|Case) \d+:/i);
            
            if (storySegments.length > 1) {
              // Skip the first segment as it's usually an introduction
              stories = storySegments.slice(1).map((segment, index) => ({
                title: `Career Transition Story ${index + 1}`,
                content: segment.trim(),
                source: "AI Research"
              }));
            } else {
              // Fallback: treat the entire response as a single story
              stories = [{
                title: "Career Transition Analysis",
                content: content,
                source: "AI Research"
              }];
            }
          }
          
          console.log(`LangGraph Research: Found ${stories.length} transition stories`);
          
          // Update state with stories
          return {
            ...state,
            stories: stories,
            readyForNextStep: true
          };
        } catch (error) {
          console.error("Error processing research node response:", error);
          
          // Return state with error handling
          return {
            ...state,
            stories: [],
            readyForNextStep: true
          };
        }
      }
    ]);
  }

  /**
   * Create the skill gap analysis node
   */
  private createSkillGapNode(): RunnableSequence<CareerTransitionState, CareerTransitionState> {
    const systemPrompt = new SystemMessage(
      `You are an expert career advisor specializing in skill gap analysis.
      
      Your goal is to identify the key skills needed for the user's target role and analyze any gaps between their current role's skills and the target role requirements.
      
      Analyze the career transition stories provided to extract insights about:
      1. Critical skills required for the target role
      2. Common skill gaps when transitioning from the current role
      3. Approximate time required to develop each missing skill
      4. Importance of each skill for success in the target role
      
      Format your analysis as a structured list of skill gaps with details about each gap.`
    );
    
    // Create the node logic
    return RunnableSequence.from([
      // Input state processing
      (state: CareerTransitionState) => {
        console.log(`LangGraph SkillGap: Analyzing skill gaps for transition from ${state.currentRole} to ${state.targetRole}`);
        
        // Format stories for the prompt
        const storiesText = state.stories.map(story => 
          `Title: ${story.title || 'Career Story'}\n` +
          `Content: ${story.content || ''}\n\n`
        ).join('\n');
        
        // Format the messages for the model
        const messages = [
          systemPrompt,
          new HumanMessage(
            `I need to identify skill gaps for a transition from ${state.currentRole} to ${state.targetRole}.
            
            Here are some career transition stories that may contain relevant information:
            
            ${storiesText}
            
            Based on these stories and your expertise, identify 5-7 key skill gaps that someone in the current role would typically need to address to successfully transition to the target role.
            
            For each skill gap, provide:
            1. The name of the skill
            2. Its importance (scale of 1-10)
            3. Estimated time to acquire (in months)
            4. Brief description of why it matters
            5. Suggestion for how to develop it
            
            Format your response as a JSON array where each object has the following structure:
            {
              "skill": "Skill Name",
              "importance": 8,
              "timeToAcquire": 3,
              "description": "Why this skill matters",
              "developmentSuggestion": "How to develop this skill"
            }`
          )
        ];
        
        return { messages };
      },
      
      // Model invocation
      this.model,
      
      // Output processing
      (response: AIMessage, state: CareerTransitionState) => {
        try {
          // Extract skill gaps from the response
          let skillGaps: any[] = [];
          
          const content = response.content as string;
          
          // Try to parse JSON if available
          if (content.includes('[') && content.includes(']')) {
            try {
              const jsonMatch = content.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                skillGaps = JSON.parse(jsonMatch[0]);
              }
            } catch (parseError) {
              console.error("Error parsing JSON skill gaps:", parseError);
            }
          }
          
          // Fallback if parsing fails
          if (skillGaps.length === 0) {
            // Try to extract skill sections
            const skillSections = content.split(/\n+\d+\.\s+/);
            
            if (skillSections.length > 1) {
              // Skip the first section if it's an introduction
              skillGaps = skillSections.slice(1).map((section, index) => {
                const lines = section.split('\n').map(line => line.trim()).filter(Boolean);
                
                // Extract details from the section
                const skillMatch = section.match(/Skill:?\s*([^,\n]+)/i) || section.match(/^([^:,\n]+)/);
                const importanceMatch = section.match(/Importance:?\s*(\d+)/i) || section.match(/(\d+)\/10/);
                const timeMatch = section.match(/Time:?\s*(\d+)/i) || section.match(/(\d+)\s*months?/i);
                const descriptionMatch = section.match(/Description:?\s*([^:]+)/i) || section.match(/Why:?\s*([^:]+)/i);
                const suggestionMatch = section.match(/Suggestion:?\s*([^:]+)/i) || section.match(/How:?\s*([^:]+)/i);
                
                return {
                  skill: skillMatch ? skillMatch[1].trim() : `Skill ${index + 1}`,
                  importance: importanceMatch ? parseInt(importanceMatch[1]) : 7,
                  timeToAcquire: timeMatch ? parseInt(timeMatch[1]) : 3,
                  description: descriptionMatch ? descriptionMatch[1].trim() : lines[1] || "",
                  developmentSuggestion: suggestionMatch ? suggestionMatch[1].trim() : lines[2] || ""
                };
              });
            }
          }
          
          console.log(`LangGraph SkillGap: Identified ${skillGaps.length} skill gaps`);
          
          // Update state with skill gaps
          return {
            ...state,
            skillGaps: skillGaps,
            readyForNextStep: true
          };
        } catch (error) {
          console.error("Error processing skill gap node response:", error);
          
          // Return state with empty skill gaps
          return {
            ...state,
            skillGaps: [],
            readyForNextStep: true
          };
        }
      }
    ]);
  }

  /**
   * Create the AI readiness assessment node
   */
  private createReadinessNode(): RunnableSequence<CareerTransitionState, CareerTransitionState> {
    // Only create this node if readiness tools are available
    if (this.readinessTools.length === 0) {
      return this.createPassThroughNode();
    }
    
    const systemPrompt = new SystemMessage(
      `You are an AI readiness expert who helps professionals understand how prepared they are for AI-augmented roles.
      
      Your goal is to assess the user's readiness for their target role by analyzing:
      1. The technical skills required and how they align with AI competencies
      2. Domain knowledge and its transferability
      3. Adaptability to new technologies
      4. Data literacy and analytical thinking
      5. Collaboration abilities with technical teams
      
      Use the AI readiness score tool to generate a comprehensive assessment.`
    );
    
    // Bind tools to the model for this node
    const modelWithTools = this.model.bindTools(this.readinessTools);
    
    // Create the node logic
    return RunnableSequence.from([
      // Input state processing
      (state: CareerTransitionState) => {
        console.log(`LangGraph AIReadiness: Assessing AI readiness for transition from ${state.currentRole} to ${state.targetRole}`);
        
        // Extract skills from the skill gaps
        const skills = state.skillGaps.map(gap => gap.skill);
        
        // Format the messages for the model
        const messages = [
          systemPrompt,
          new HumanMessage(
            `I need to assess the AI readiness for a professional transitioning from ${state.currentRole} to ${state.targetRole}.
            
            The current role skills and target role requirements suggest the following skills are relevant:
            ${skills.join(', ')}
            
            Please use the AI readiness score tool to generate a comprehensive assessment.
            
            The assessment should include:
            1. An overall readiness score
            2. Scores for key readiness categories
            3. Specific recommendations for improving readiness`
          )
        ];
        
        return { messages };
      },
      
      // Model invocation
      modelWithTools,
      
      // Output processing
      (response: AIMessage, state: CareerTransitionState) => {
        try {
          // Extract AI readiness score from the response
          let aiReadinessScore: any = {};
          
          const content = response.content as string;
          
          // Try to parse JSON if available
          if (content.includes('{') && content.includes('}')) {
            try {
              const jsonMatch = content.match(/{[\s\S]*}/);
              if (jsonMatch) {
                aiReadinessScore = JSON.parse(jsonMatch[0]);
              }
            } catch (parseError) {
              console.error("Error parsing JSON AI readiness score:", parseError);
            }
          }
          
          console.log(`LangGraph AIReadiness: Generated AI readiness score`);
          
          // Update state with AI readiness score
          return {
            ...state,
            aiReadinessScore: aiReadinessScore,
            readyForNextStep: true
          };
        } catch (error) {
          console.error("Error processing AI readiness node response:", error);
          
          // Return state with empty AI readiness score
          return {
            ...state,
            aiReadinessScore: {},
            readyForNextStep: true
          };
        }
      }
    ]);
  }

  /**
   * Create the market analysis node
   */
  private createMarketAnalysisNode(): RunnableSequence<CareerTransitionState, CareerTransitionState> {
    // Only create this node if readiness tools are available
    if (this.readinessTools.length === 0) {
      return this.createPassThroughNode();
    }
    
    const systemPrompt = new SystemMessage(
      `You are a career market analyst who specializes in understanding job markets and trends.
      
      Your goal is to analyze the market conditions for the user's target role, including:
      1. Current demand for the role
      2. Salary ranges and compensation trends
      3. Competition level and job availability
      4. Industry growth projections
      5. Geographic hotspots for the role
      
      Use the RapidAPI integration tool to gather job market data.`
    );
    
    // Bind tools to the model for this node
    const modelWithTools = this.model.bindTools(this.readinessTools);
    
    // Create the node logic
    return RunnableSequence.from([
      // Input state processing
      (state: CareerTransitionState) => {
        console.log(`LangGraph MarketAnalysis: Analyzing market for ${state.targetRole}`);
        
        // Format the messages for the model
        const messages = [
          systemPrompt,
          new HumanMessage(
            `I need to analyze the job market for the role: ${state.targetRole}
            
            Please use the RapidAPI integration tool to gather job market data about this role.
            
            The analysis should include:
            1. Current demand level
            2. Salary ranges
            3. Competition level
            4. Growth projections
            5. Geographic hotspots`
          )
        ];
        
        return { messages };
      },
      
      // Model invocation
      modelWithTools,
      
      // Output processing
      (response: AIMessage, state: CareerTransitionState) => {
        try {
          // Extract market data from the response
          let marketData: any = {};
          
          const content = response.content as string;
          
          // Try to parse JSON if available
          if (content.includes('{') && content.includes('}')) {
            try {
              const jsonMatch = content.match(/{[\s\S]*}/);
              if (jsonMatch) {
                marketData = JSON.parse(jsonMatch[0]);
              }
            } catch (parseError) {
              console.error("Error parsing JSON market data:", parseError);
            }
          }
          
          console.log(`LangGraph MarketAnalysis: Generated market analysis data`);
          
          // Update state with market data
          return {
            ...state,
            marketData: marketData,
            readyForNextStep: true
          };
        } catch (error) {
          console.error("Error processing market analysis node response:", error);
          
          // Return state with empty market data
          return {
            ...state,
            marketData: {},
            readyForNextStep: true
          };
        }
      }
    ]);
  }

  /**
   * Create the insights generation node
   */
  private createInsightsNode(): RunnableSequence<CareerTransitionState, CareerTransitionState> {
    const systemPrompt = new SystemMessage(
      `You are a career transition expert who provides strategic insights based on comprehensive analysis.
      
      Your goal is to synthesize all the available information into actionable insights about:
      1. The estimated success rate for this career transition
      2. Typical timeline for completing the transition successfully
      3. Key challenges that will be faced during the transition
      4. Effective strategies for overcoming these challenges
      5. Specific recommendations tailored to this transition
      
      Format your insights in a structured way that's easy to understand and act upon.`
    );
    
    // Create the node logic
    return RunnableSequence.from([
      // Input state processing
      (state: CareerTransitionState) => {
        console.log(`LangGraph Insights: Generating insights for transition from ${state.currentRole} to ${state.targetRole}`);
        
        // Format stories for the prompt
        const storiesText = state.stories.map(story => 
          `Title: ${story.title || 'Career Story'}\n` +
          `Content: ${story.content || ''}\n\n`
        ).join('\n');
        
        // Format skill gaps for the prompt
        const skillGapsText = state.skillGaps.map(gap => 
          `Skill: ${gap.skill}\n` +
          `Importance: ${gap.importance}/10\n` +
          `Time to Acquire: ${gap.timeToAcquire} months\n` +
          `Description: ${gap.description}\n\n`
        ).join('\n');
        
        // Include AI readiness if available
        const readinessText = state.aiReadinessScore ? 
          `AI Readiness Score: ${state.aiReadinessScore.overallScore || 'N/A'}\n` +
          `Key Recommendations: ${state.aiReadinessScore.recommendations?.join(', ') || 'N/A'}\n\n` : '';
        
        // Include market data if available
        const marketText = state.marketData ? 
          `Market Demand: ${state.marketData.demandRating || 'N/A'}\n` +
          `Competition Level: ${state.marketData.competitionLevel || 'N/A'}\n` +
          `Salary Range: ${state.marketData.salaryRange?.min || 'N/A'} - ${state.marketData.salaryRange?.max || 'N/A'}\n\n` : '';
        
        // Format the messages for the model
        const messages = [
          systemPrompt,
          new HumanMessage(
            `I need comprehensive insights for a transition from ${state.currentRole} to ${state.targetRole}.
            
            Here's all the information we've gathered:
            
            Career Transition Stories:
            ${storiesText}
            
            Skill Gap Analysis:
            ${skillGapsText}
            
            ${readinessText}
            ${marketText}
            
            Based on this information, please provide:
            1. An estimated success rate (percentage) with explanation
            2. Typical timeline for this transition (in months)
            3. Top 3-5 challenges with descriptions
            4. Effective strategies for success
            5. Specific recommendations
            
            Format your response as a JSON object with the following structure:
            {
              "successRate": 75,
              "successRateExplanation": "Explanation",
              "timeline": 12,
              "timelineExplanation": "Explanation",
              "challenges": [
                {
                  "challenge": "Challenge name",
                  "description": "Challenge description"
                }
              ],
              "strategies": [
                {
                  "strategy": "Strategy name",
                  "description": "Strategy description"
                }
              ],
              "recommendations": [
                {
                  "recommendation": "Recommendation",
                  "description": "Details"
                }
              ]
            }`
          )
        ];
        
        return { messages };
      },
      
      // Model invocation
      this.model,
      
      // Output processing
      (response: AIMessage, state: CareerTransitionState) => {
        try {
          // Extract insights from the response
          let insights: any = {};
          
          const content = response.content as string;
          
          // Try to parse JSON if available
          if (content.includes('{') && content.includes('}')) {
            try {
              const jsonMatch = content.match(/{[\s\S]*}/);
              if (jsonMatch) {
                insights = JSON.parse(jsonMatch[0]);
              }
            } catch (parseError) {
              console.error("Error parsing JSON insights:", parseError);
            }
          }
          
          console.log(`LangGraph Insights: Generated career transition insights`);
          
          // Update state with insights
          return {
            ...state,
            insights: insights,
            readyForNextStep: true
          };
        } catch (error) {
          console.error("Error processing insights node response:", error);
          
          // Return state with empty insights
          return {
            ...state,
            insights: {},
            readyForNextStep: true
          };
        }
      }
    ]);
  }

  /**
   * Create the final integration node
   */
  private createIntegrationNode(): RunnableSequence<CareerTransitionState, CareerTransitionState> {
    const systemPrompt = new SystemMessage(
      `You are a career advisor who creates comprehensive career transition plans.
      
      Your goal is to integrate all the analysis into a complete career transition plan that includes:
      1. An executive summary of the transition feasibility and key points
      2. A detailed breakdown of the required skills and how to acquire them
      3. A timeline with key milestones for the transition
      4. Specific action items organized into immediate, short-term, and long-term steps
      5. Resources and tools recommended for the transition journey
      
      Format your plan in a clear, structured way that guides the user through their career transition.`
    );
    
    // Create the node logic
    return RunnableSequence.from([
      // Input state processing
      (state: CareerTransitionState) => {
        console.log(`LangGraph Integration: Creating integrated career plan for transition from ${state.currentRole} to ${state.targetRole}`);
        
        // Format skill gaps for the prompt
        const skillGapsText = state.skillGaps.map(gap => 
          `Skill: ${gap.skill}\n` +
          `Importance: ${gap.importance}/10\n` +
          `Time to Acquire: ${gap.timeToAcquire} months\n` +
          `Development: ${gap.developmentSuggestion}\n\n`
        ).join('\n');
        
        // Format insights for the prompt
        const insightsText = state.insights.successRate ? 
          `Success Rate: ${state.insights.successRate}%\n` +
          `Timeline: ${state.insights.timeline} months\n` +
          `Top Challenges: ${state.insights.challenges?.map((c: any) => c.challenge).join(', ') || 'N/A'}\n\n` : '';
        
        // Format AI readiness if available
        const readinessText = state.aiReadinessScore?.overallScore ? 
          `AI Readiness Score: ${state.aiReadinessScore.overallScore}\n` +
          `Recommendations: ${state.aiReadinessScore.recommendations?.join('\n- ') || 'N/A'}\n\n` : '';
        
        // Include market data if available
        const marketText = state.marketData?.marketData ? 
          `Market Demand: ${state.marketData.marketData.demandRating || 'N/A'}\n` +
          `Salary Range: $${state.marketData.marketData.salaryRange?.min || 'N/A'} - $${state.marketData.marketData.salaryRange?.max || 'N/A'}\n` +
          `Growth Rate: ${state.marketData.marketData.growthRate || 'N/A'}\n\n` : '';
        
        // Format the messages for the model
        const messages = [
          systemPrompt,
          new HumanMessage(
            `I need a comprehensive career transition plan for moving from ${state.currentRole} to ${state.targetRole}.
            
            Here's all the analysis we've gathered:
            
            ${skillGapsText}
            ${insightsText}
            ${readinessText}
            ${marketText}
            
            Please create a complete career transition plan that integrates all this information.
            
            The plan should include:
            1. Executive summary
            2. Skill development roadmap
            3. Timeline with milestones
            4. Action items (immediate, short-term, long-term)
            5. Recommended resources
            
            Format your response as a JSON object with the following structure:
            {
              "executiveSummary": "Summary text",
              "skillRoadmap": [
                {
                  "skill": "Skill name",
                  "priority": "High/Medium/Low",
                  "timeframe": "1-3 months",
                  "developmentPath": "How to develop"
                }
              ],
              "timeline": {
                "totalDuration": "12 months",
                "milestones": [
                  {
                    "milestone": "Milestone name",
                    "timeframe": "Month 1-2",
                    "description": "Description"
                  }
                ]
              },
              "actionItems": {
                "immediate": ["Action 1", "Action 2"],
                "shortTerm": ["Action 1", "Action 2"],
                "longTerm": ["Action 1", "Action 2"]
              },
              "resources": [
                {
                  "name": "Resource name",
                  "type": "Book/Course/Tool",
                  "description": "Description"
                }
              ]
            }`
          )
        ];
        
        return { messages };
      },
      
      // Model invocation
      this.model,
      
      // Output processing
      (response: AIMessage, state: CareerTransitionState) => {
        try {
          // Extract integrated plan from the response
          let integratedPlan: any = {};
          
          const content = response.content as string;
          
          // Try to parse JSON if available
          if (content.includes('{') && content.includes('}')) {
            try {
              const jsonMatch = content.match(/{[\s\S]*}/);
              if (jsonMatch) {
                integratedPlan = JSON.parse(jsonMatch[0]);
              }
            } catch (parseError) {
              console.error("Error parsing JSON integrated plan:", parseError);
            }
          }
          
          console.log(`LangGraph Integration: Created integrated career transition plan`);
          
          // Update insights with the integrated plan
          const enhancedInsights = {
            ...state.insights,
            integratedPlan
          };
          
          // Return the final state
          return {
            ...state,
            insights: enhancedInsights,
            readyForNextStep: true
          };
        } catch (error) {
          console.error("Error processing integration node response:", error);
          
          // Return state with original insights
          return {
            ...state,
            readyForNextStep: true
          };
        }
      }
    ]);
  }

  /**
   * Create a simple pass-through node for when specific tools aren't available
   */
  private createPassThroughNode(): RunnableSequence<CareerTransitionState, CareerTransitionState> {
    return RunnableSequence.from([
      (state: CareerTransitionState) => {
        console.log("LangGraph: Using pass-through node (tool not available)");
        return { messages: [] };
      },
      this.model,
      (response: AIMessage, state: CareerTransitionState) => {
        return {
          ...state,
          readyForNextStep: true
        };
      }
    ]);
  }

  /**
   * Run the LangGraph agent for career transition analysis
   */
  async analyzeCareerTransition(
    currentRole: string,
    targetRole: string,
    userId: number,
    transitionId: number
  ): Promise<any> {
    console.log(`LangGraph: Starting analysis for transition from ${currentRole} to ${targetRole}`);
    
    try {
      // Set up the initial state
      const initialState: CareerTransitionState = {
        currentRole,
        targetRole,
        userId,
        transitionId,
        stories: [],
        skillGaps: [],
        insights: {},
        readyForNextStep: true,
        messages: [],
        steps: []
      };
      
      // Execute the graph with the initial state
      const result = await this.graph.invoke(initialState);
      
      console.log(`LangGraph: Completed analysis for transition from ${currentRole} to ${targetRole}`);
      
      // Extract the results
      return {
        skillGaps: result.skillGaps || [],
        insights: result.insights || {},
        aiReadinessScore: result.aiReadinessScore,
        marketData: result.marketData,
        scrapedCount: result.stories?.length || 0
      };
    } catch (error) {
      console.error("Error running LangGraph agent:", error);
      throw error;
    }
  }
}