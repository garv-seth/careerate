// Agent status types
export type AgentStatuses = {
  cara: 'idle' | 'active' | 'thinking' | 'complete';
  maya: 'idle' | 'active' | 'thinking' | 'complete';
  ellie: 'idle' | 'active' | 'thinking' | 'complete';
  sophia: 'idle' | 'active' | 'thinking' | 'complete';
};

// Agent activities that will be displayed in real-time
export type AgentActivity = {
  agent: 'cara' | 'maya' | 'ellie' | 'sophia';
  action: string;
  detail?: string;
  timestamp: Date;
  tools?: Array<'brave' | 'firecrawl' | 'browserbase' | 'database' | 'perplexity' | 'pinecone'>;
};

// Agent descriptions for tooltips and info panels
export const agentDescriptions = {
  cara: {
    role: 'Orchestration Agent',
    description: 'Coordinates the entire analysis process and synthesizes insights from all other agents.',
    capabilities: ['Plan-Execute-Reflect pattern', 'Task delegation', 'Executive summary generation', 'Multi-agent orchestration'],
    tools: ['Pinecone vector database', 'Perplexity API'],
    color: 'blue'
  },
  maya: {
    role: 'Resume Analysis Agent',
    description: 'Analyzes your resume to identify strengths, weaknesses, and automation risks.',
    capabilities: ['Resume parsing', 'Skill extraction', 'Automation risk assessment', 'Gap analysis'],
    tools: ['Perplexity API', 'Browserbase', 'Database'],
    color: 'purple'
  },
  ellie: {
    role: 'Industry Analysis Agent',
    description: 'Researches industry trends, emerging technologies, and potential career directions.',
    capabilities: ['Web research', 'Industry trend analysis', 'Technology forecasting', 'Job market research'],
    tools: ['Brave Search API', 'Firecrawl', 'Browserbase'],
    color: 'pink'
  },
  sophia: {
    role: 'Learning Advisor Agent',
    description: 'Creates personalized learning plans and recommends resources to bridge skill gaps.',
    capabilities: ['Course recommendation', 'Learning path creation', 'Content curation', 'Skill prioritization'],
    tools: ['Database', 'Browserbase', 'Perplexity API'],
    color: 'green'
  }
};