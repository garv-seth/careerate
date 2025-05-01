import React from 'react';
import { motion } from 'framer-motion';
import { AgentActivity, AgentStatuses, agentDescriptions } from '../avatars/types';
import { AgentAvatar, agentColors } from '../avatars/AgentAvatars';
import { 
  Search, 
  Database, 
  Globe, 
  Brain, 
  Sparkles, 
  Loader2
} from 'lucide-react';

export const toolIcons = {
  brave: <Search className="h-4 w-4" />,
  firecrawl: <Search className="h-4 w-4" />,
  browserbase: <Globe className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  perplexity: <Brain className="h-4 w-4" />,
  pinecone: <Sparkles className="h-4 w-4" />
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
  activities = [],
  agentStatuses,
  className = ''
}) => {
  // Format time to show either "just now", "X minutes ago", or time if older than 60 minutes
  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - timestamp.getTime()) / 1000 / 60);
    
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff} min ago`;
    
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Sort activities by timestamp, newest first
  const sortedActivities = [...activities].sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );
  
  return (
    <div className={`space-y-4 ${className}`}>
      {sortedActivities.length === 0 ? (
        <div className="text-center p-4 text-gray-500 dark:text-gray-400">
          No agent activity yet.
        </div>
      ) : (
        sortedActivities.map((activity, index) => {
          const colors = agentColors[activity.agent];
          const isActive = agentStatuses[activity.agent] === 'active' || agentStatuses[activity.agent] === 'thinking';
          
          return (
            <motion.div 
              key={`${activity.agent}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`p-4 border-l-4 rounded-r-lg ${colors.border} ${isActive ? `${colors.bgLight} bg-opacity-10` : 'bg-white dark:bg-slate-800'}`}
            >
              <div className="flex items-start">
                <AgentAvatar 
                  name={activity.agent} 
                  status={agentStatuses[activity.agent]}
                  size="sm" 
                  className="mr-3 mt-0.5"
                />
                
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <div className="font-medium text-sm">{activity.action}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {formatTime(activity.timestamp)}
                    </div>
                  </div>
                  
                  {activity.detail && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {activity.detail}
                    </p>
                  )}
                  
                  {activity.tools && activity.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activity.tools.map(tool => (
                        <div 
                          key={tool}
                          className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700"
                        >
                          <span className="mr-1">{toolIcons[tool]}</span>
                          <span className="capitalize">{tool}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
};

export const AgentInfoCard: React.FC<{
  agent: 'cara' | 'maya' | 'ellie' | 'sophia';
  status: 'idle' | 'active' | 'thinking' | 'complete';
}> = ({ agent, status }) => {
  const description = agentDescriptions[agent];
  const colors = agentColors[agent];
  
  return (
    <div className={`p-4 rounded-lg border ${colors.border} ${colors.bgLight} bg-opacity-5`}>
      <div className="flex items-start mb-3">
        <AgentAvatar name={agent} status={status} size="md" className="mr-3" />
        <div>
          <h3 className="font-medium">{agent.charAt(0).toUpperCase() + agent.slice(1)}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description.role}</p>
        </div>
        {status === 'thinking' && (
          <Loader2 className="ml-auto h-5 w-5 animate-spin text-gray-500" />
        )}
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{description.description}</p>
      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium">Tools:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {description.tools.map(tool => (
              <span key={tool} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};