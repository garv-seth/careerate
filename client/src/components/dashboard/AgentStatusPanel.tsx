import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AgentAvatar, AgentAvatarWithLabel, AgentStatusBadge, agentColors } from '@/components/avatars/AgentAvatars';
import { AgentActivity, AgentStatuses, agentDescriptions } from '@/components/avatars/types';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, AlertCircle, RefreshCcw, FileText, Database } from 'lucide-react';

interface AgentStatusPanelProps {
  uploadState: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  agentStatuses: AgentStatuses;
  recentActivities: AgentActivity[];
  className?: string;
}

const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({
  uploadState,
  agentStatuses,
  recentActivities,
  className = ''
}) => {
  // Calculate overall progress percentage based on agent statuses
  const completedAgents = Object.values(agentStatuses).filter(status => status === 'complete').length;
  const overallProgress = (completedAgents / 4) * 100;
  
  // Get the most recent activity for each agent
  const latestActivities = new Map<string, AgentActivity>();
  recentActivities.forEach(activity => {
    if (!latestActivities.has(activity.agent)) {
      latestActivities.set(activity.agent, activity);
    }
  });
  
  // Format timestamp to relative time (e.g., "2m ago")
  const getRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffSec < 60) {
      return `${diffSec}s ago`;
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else {
      return `${diffHour}h ago`;
    }
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Analysis Progress</span>
          <span className="text-sm">{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>
      
      {/* Upload Status */}
      <div className="flex items-center space-x-3 text-sm">
        <span className="font-medium">Resume Status:</span>
        {uploadState === 'idle' && (
          <span className="text-gray-500 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Ready for upload
          </span>
        )}
        {uploadState === 'uploading' && (
          <span className="text-blue-500 flex items-center">
            <RefreshCcw className="h-4 w-4 mr-1 animate-spin" />
            Uploading
          </span>
        )}
        {uploadState === 'processing' && (
          <span className="text-amber-500 flex items-center">
            <RefreshCcw className="h-4 w-4 mr-1 animate-spin" />
            Processing
          </span>
        )}
        {uploadState === 'complete' && (
          <span className="text-green-500 flex items-center">
            <CheckCircle className="h-4 w-4 mr-1" />
            Processed
          </span>
        )}
        {uploadState === 'error' && (
          <span className="text-red-500 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            Error
          </span>
        )}
      </div>
      
      <Separator />
      
      {/* Agent Statuses Grid */}
      <div className="grid grid-cols-2 gap-4">
        {(['cara', 'maya', 'ellie', 'sophia'] as const).map(agent => {
          const status = agentStatuses[agent];
          const activity = latestActivities.get(agent);
          const colors = agentColors[agent];
          
          return (
            <Card key={agent} className={`overflow-hidden border-l-4 ${colors.border}`}>
              <CardContent className="p-4">
                <div className="flex space-x-4">
                  <AgentAvatar name={agent} status={status} />
                  <div className="flex flex-col justify-between py-1 flex-grow">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{agent.charAt(0).toUpperCase() + agent.slice(1)}</span>
                        <AgentStatusBadge status={status} />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {agentDescriptions[agent].role}
                      </div>
                    </div>
                    
                    {activity && (
                      <div className="text-xs mt-2">
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {activity.action}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                            {activity.tools?.map(tool => (
                              <span key={tool} className="inline-flex items-center">
                                {renderToolIcon(tool)}
                              </span>
                            ))}
                          </div>
                          <span className="text-gray-400 dark:text-gray-500">
                            {getRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const renderToolIcon = (tool: any) => {
  switch (tool) {
    case 'database':
      return <Database className="h-3 w-3" />;
    case 'pinecone':
    case 'perplexity':
    case 'brave':
    case 'firecrawl':
    case 'browserbase':
      return <FileText className="h-3 w-3" />;
    default:
      return null;
  }
};

export default AgentStatusPanel;