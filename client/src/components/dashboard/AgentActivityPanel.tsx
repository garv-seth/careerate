import React from 'react';
import { AgentActivity, AgentStatuses, agentDescriptions } from '@/components/avatars/types';
import { AgentAvatar, agentColors } from '@/components/avatars/AgentAvatars';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Database, Search, Globe, BookOpen, Brain, BarChart2, LightbulbIcon, Wrench, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tool icon mappings
export const toolIcons = {
  brave: <Search className="h-3.5 w-3.5" />,
  firecrawl: <Globe className="h-3.5 w-3.5" />,
  browserbase: <Globe className="h-3.5 w-3.5" />,
  database: <Database className="h-3.5 w-3.5" />,
  perplexity: <Brain className="h-3.5 w-3.5" />,
  pinecone: <FileText className="h-3.5 w-3.5" />
};

// Tool names for tooltips
const toolNames = {
  brave: 'Brave Search',
  firecrawl: 'Firecrawl Web Crawler',
  browserbase: 'Browserbase Scraper',
  database: 'Knowledge Database',
  perplexity: 'Perplexity AI Search',
  pinecone: 'Pinecone Vector Database'
};

interface AgentActivityPanelProps {
  activities: AgentActivity[];
  agentStatuses?: AgentStatuses;
  className?: string;
}

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({
  activities,
  agentStatuses = {
    cara: 'idle',
    maya: 'idle',
    ellie: 'idle',
    sophia: 'idle'
  },
  className = ''
}) => {
  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500 dark:text-gray-400">
          <FileText className="h-10 w-10 mb-3 text-gray-400 dark:text-gray-600" />
          <p className="text-sm">No agent activities yet</p>
          <p className="text-xs mt-1">Activity will appear here once AI agents start working</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => {
            const colors = agentColors[activity.agent];
            
            return (
              <div key={index} className="flex items-start space-x-3 pb-3 border-b last:border-b-0 dark:border-gray-800">
                <AgentAvatar 
                  name={activity.agent} 
                  size="sm" 
                  status={agentStatuses[activity.agent]}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <div className="flex gap-1 items-center">
                      <span className={`font-medium ${colors.text}`}>
                        {activity.agent.charAt(0).toUpperCase() + activity.agent.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {agentDescriptions[activity.agent].specialty}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTime(activity.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm mt-1">{activity.action}</p>
                  
                  {activity.detail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                      {activity.detail}
                    </p>
                  )}
                  
                  {activity.tools && activity.tools.length > 0 && (
                    <div className="flex space-x-1 mt-2">
                      {activity.tools.map(tool => (
                        <TooltipProvider key={tool} delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "flex items-center justify-center h-6 w-6 rounded-full",
                                "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                              )}>
                                {toolIcons[tool]}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{toolNames[tool]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AgentInfoCard: React.FC<{
  agent: 'cara' | 'maya' | 'ellie' | 'sophia';
  className?: string;
}> = ({ agent, className = '' }) => {
  const colors = agentColors[agent];
  
  // Define agent icons
  const agentIcons = {
    cara: <Brain className="h-6 w-6" />,
    maya: <FileText className="h-6 w-6" />,
    ellie: <BarChart2 className="h-6 w-6" />,
    sophia: <LightbulbIcon className="h-6 w-6" />
  };
  
  return (
    <div className={`rounded-lg overflow-hidden border shadow-sm ${colors.border} hover:shadow-md transition-shadow ${className}`}>
      <div className={`${colors.bg} p-4 text-white font-medium flex items-center justify-between`}>
        <div className="flex items-center">
          <div className="bg-white/20 p-2 rounded-full mr-3">
            {agentIcons[agent]}
          </div>
          <div>
            <div className="text-lg font-bold">{agent.charAt(0).toUpperCase() + agent.slice(1)}</div>
            <div className="text-xs font-normal text-white/80">{agentDescriptions[agent].role}</div>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-white/70" />
      </div>
      <div className="p-4">
        <p className="text-sm">{agentDescriptions[agent].description}</p>
        
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 mr-2 text-primary/70" />
            <span className="font-medium">Specialty:</span>
            <span className="ml-1.5">{agentDescriptions[agent].specialty}</span>
          </div>
          
          <div className="flex items-center text-xs text-muted-foreground">
            <Wrench className="h-3.5 w-3.5 mr-2 text-primary/70" />
            <span className="font-medium">Tools:</span>
            <span className="ml-1.5">
              {agent === 'cara' ? 'Orchestration, Planning' : 
               agent === 'maya' ? 'Resume Analysis, Skills Extraction' :
               agent === 'ellie' ? 'Market Research, Trend Analysis' :
               'Learning Resources, Roadmap Planning'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};