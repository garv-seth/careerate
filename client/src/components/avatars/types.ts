// Agent statuses for UI display and tracking
export type AgentStatuses = {
  cara: 'idle' | 'active' | 'thinking' | 'complete';
  maya: 'idle' | 'active' | 'thinking' | 'complete';
  ellie: 'idle' | 'active' | 'thinking' | 'complete';
  sophia: 'idle' | 'active' | 'thinking' | 'complete';
};

// Agent activity events for tracking what agents are doing
export type AgentActivity = {
  agent: 'cara' | 'maya' | 'ellie' | 'sophia';
  action: string;
  detail?: string;
  timestamp: Date;
  tools?: Array<'brave' | 'firecrawl' | 'browserbase' | 'database' | 'perplexity' | 'pinecone'>;
};

// Descriptions of each agent's role and capabilities for UI display
export const agentDescriptions = {
  cara: {
    role: "Career Coach & Orchestrator",
    description: "Cara orchestrates your career analysis by coordinating with other specialized agents. She creates a comprehensive career action plan based on their inputs.",
    specialty: "Career planning"
  },
  maya: {
    role: "Resume Analyzer",
    description: "Maya specializes in analyzing your resume to identify your skills, experience, and career trajectory. She helps identify strengths and areas for improvement.",
    specialty: "Profile analysis"
  },
  ellie: {
    role: "Industry Analyst",
    description: "Ellie researches market trends, industry developments, and automation risks relevant to your career. She helps identify future opportunities and challenges.",
    specialty: "Market research"
  },
  sophia: {
    role: "Learning Advisor",
    description: "Sophia creates personalized learning plans based on your skills and career goals. She recommends courses, resources, and learning paths for skill development.",
    specialty: "Skill development"
  }
};