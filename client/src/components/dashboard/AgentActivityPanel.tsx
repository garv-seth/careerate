import React from 'react';
import { motion } from 'framer-motion';
import { AgentAvatar, AgentAvatarWithLabel, agentColors } from '../avatars/AgentAvatars';
import { ArrowRightCircle, Check, Search, Database, Globe, Brain, BookOpen } from 'lucide-react';

// Agent activities that will be displayed in real-time
type AgentActivity = {
  agent: 'cara' | 'maya' | 'ellie' | 'sophia';
  action: string;
  detail?: string;
  timestamp: Date;
  icon?: React.ReactNode;
  tools?: Array<'brave' | 'firecrawl' | 'browserbase' | 'database' | 'perplexity' | 'pinecone'>;
};

// Agent descriptions for tooltips and info panels
export const agentDescriptions = {
  cara: {
    role: 'Orchestration Agent',
    description: 'Coordinates the entire analysis process and synthesizes insights from all other agents.',
    capabilities: ['Plan-Execute-Reflect pattern', 'Task delegation', 'Executive summary generation', 'Multi-agent orchestration'],
    tools: ['Pinecone vector database', 'Perplexity API'],
    icon: <ArrowRightCircle />
  },
  maya: {
    role: 'Resume Analysis Agent',
    description: 'Analyzes your resume to identify strengths, weaknesses, and automation risks.',
    capabilities: ['Resume parsing', 'Skill extraction', 'Automation risk assessment', 'Gap analysis'],
    tools: ['Perplexity API', 'Browserbase', 'Database'],
    icon: <Check />
  },
  ellie: {
    role: 'Industry Analysis Agent',
    description: 'Researches industry trends, emerging technologies, and potential career directions.',
    capabilities: ['Web research', 'Industry trend analysis', 'Technology forecasting', 'Job market research'],
    tools: ['Brave Search API', 'Firecrawl', 'Browserbase'],
    icon: <Globe />
  },
  sophia: {
    role: 'Learning Advisor Agent',
    description: 'Creates personalized learning plans and recommends resources to bridge skill gaps.',
    capabilities: ['Course recommendation', 'Learning path creation', 'Content curation', 'Skill prioritization'],
    tools: ['Database', 'Browserbase', 'Perplexity API'],
    icon: <BookOpen />
  }
};

// Tool icons for the activity feed
export const toolIcons = {
  brave: <Search className="w-4 h-4" />,
  firecrawl: <Globe className="w-4 h-4" />,
  browserbase: <Database className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  perplexity: <Brain className="w-4 h-4" />,
  pinecone: <Database className="w-4 h-4" />
};

interface AgentActivityPanelProps {
  activities: AgentActivity[];
  agentStatuses: {
    cara: 'idle' | 'active' | 'thinking' | 'complete';
    maya: 'idle' | 'active' | 'thinking' | 'complete';
    ellie: 'idle' | 'active' | 'thinking' | 'complete';
    sophia: 'idle' | 'active' | 'thinking' | 'complete';
  };
  className?: string;
}

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({
  activities,
  agentStatuses,
  className = ''
}) => {
  // Format timestamp to relative time (e.g., "2 mins ago")
  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 10) return 'just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    
    return `${Math.floor(diffMins / 60)}h ago`;
  };
  
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Agent Activity</h3>
        <div className="flex items-center space-x-1">
          {Object.entries(agentStatuses).map(([agent, status]) => (
            <div key={agent} className="relative">
              <AgentAvatar 
                name={agent as any} 
                size="sm" 
                status={status} 
                className="mx-1"
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {activities.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No agent activity yet</p>
            <p className="text-sm">Upload your resume to begin analysis</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start p-3 rounded-lg bg-gray-50 dark:bg-slate-700"
            >
              <AgentAvatar name={activity.agent} size="sm" status={index === 0 ? 'active' : 'complete'} />
              
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-start">
                  <p className="font-medium">
                    {activity.action}
                  </p>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
                
                {activity.detail && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {activity.detail}
                  </p>
                )}
                
                {activity.tools && activity.tools.length > 0 && (
                  <div className="flex mt-2 space-x-1">
                    {activity.tools.map(tool => (
                      <div 
                        key={tool} 
                        className="flex items-center bg-gray-200 dark:bg-slate-600 text-xs px-2 py-1 rounded"
                      >
                        <span className="mr-1">{toolIcons[tool]}</span>
                        <span>{tool.charAt(0).toUpperCase() + tool.slice(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

// Agent information card showing detailed capabilities and tools
export const AgentInfoCard: React.FC<{
  agent: 'cara' | 'maya' | 'ellie' | 'sophia';
  className?: string;
}> = ({ agent, className = '' }) => {
  const info = agentDescriptions[agent];
  const colors = agentColors[agent];
  
  return (
    <div className={`rounded-lg overflow-hidden border ${colors.border} ${className}`}>
      <div className={`p-4 ${colors.bgLight}`}>
        <div className="flex items-center">
          <AgentAvatar name={agent} size="lg" />
          <div className="ml-4">
            <h3 className={`text-xl font-bold ${colors.text}`}>{agent.charAt(0).toUpperCase() + agent.slice(1)}</h3>
            <p className="text-gray-600 dark:text-gray-300">{info.role}</p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-gray-700 dark:text-gray-300 mb-4">{info.description}</p>
        
        <h4 className="font-semibold mb-2">Capabilities:</h4>
        <ul className="list-disc pl-5 mb-4 text-sm">
          {info.capabilities.map((capability, index) => (
            <li key={index} className="mb-1">{capability}</li>
          ))}
        </ul>
        
        <h4 className="font-semibold mb-2">Tools:</h4>
        <div className="flex flex-wrap gap-2">
          {info.tools.map((tool, index) => (
            <span 
              key={index} 
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};