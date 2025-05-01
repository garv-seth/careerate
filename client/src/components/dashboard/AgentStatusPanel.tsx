import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentActivity, AgentStatuses } from '../avatars/types';
import { AgentAvatarWithLabel, agentColors } from '../avatars/AgentAvatars';
import { 
  ArrowRightCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  Search,
  Database,
  Globe,
  Brain
} from 'lucide-react';

interface AgentStatusPanelProps {
  uploadState: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  agentStatuses: AgentStatuses;
  recentActivities: AgentActivity[];
  className?: string;
}

export const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({
  uploadState,
  agentStatuses,
  recentActivities = [],
  className = ''
}) => {
  const [activeAgent, setActiveAgent] = useState<'cara' | 'maya' | 'ellie' | 'sophia' | null>(null);
  
  // Find the currently active agent based on statuses
  useEffect(() => {
    const active = Object.entries(agentStatuses).find(
      ([_, status]) => status === 'active' || status === 'thinking'
    );
    
    if (active) {
      setActiveAgent(active[0] as 'cara' | 'maya' | 'ellie' | 'sophia');
    } else {
      setActiveAgent(null);
    }
  }, [agentStatuses]);
  
  // Get the most recent activity for an agent
  const getAgentActivity = (agent: 'cara' | 'maya' | 'ellie' | 'sophia') => {
    return recentActivities
      .filter(activity => activity.agent === agent)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  };
  
  // Render upload status
  const renderUploadState = () => {
    switch (uploadState) {
      case 'idle':
        return (
          <div className="text-center my-8">
            <p className="text-gray-500">Upload your resume to begin analysis</p>
          </div>
        );
      case 'uploading':
        return (
          <div className="text-center my-8 text-blue-600">
            <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-2" />
            <p>Uploading resume...</p>
          </div>
        );
      case 'processing':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
            <h3 className="font-medium mb-2 flex items-center">
              <RefreshCw className="animate-spin h-5 w-5 mr-2 text-blue-500" />
              Resume Analysis in Progress
            </h3>
            <p className="text-sm text-gray-600">
              Our AI agents are analyzing your resume and gathering relevant career insights.
            </p>
          </div>
        );
      case 'complete':
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-4">
            <h3 className="font-medium mb-2 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              Analysis Complete
            </h3>
            <p className="text-sm text-gray-600">
              All agents have completed their analysis. Review your personalized career insights below.
            </p>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <h3 className="font-medium mb-2 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Analysis Error
            </h3>
            <p className="text-sm text-gray-600">
              There was an error processing your resume. Please try uploading again.
            </p>
          </div>
        );
      default:
        return null;
    }
  };
  
  const getAgentRole = (agent: 'cara' | 'maya' | 'ellie' | 'sophia') => {
    const roles = {
      cara: 'Orchestration Agent',
      maya: 'Resume Analysis Agent',
      ellie: 'Industry Analysis Agent',
      sophia: 'Learning Advisor Agent'
    };
    return roles[agent];
  };
  
  // Tool icons for showing what tools agent is using
  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'brave':
      case 'firecrawl':
        return <Search className="h-4 w-4" />;
      case 'browserbase':
        return <Globe className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'perplexity':
      case 'pinecone':
        return <Brain className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Processing Status</h3>
      
      {renderUploadState()}
      
      {uploadState === 'processing' && (
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Analysis Progress</span>
            <span className="text-sm text-gray-500">
              {Object.values(agentStatuses).filter(status => status === 'complete').length} / 4 Agents
            </span>
          </div>
          
          <div className="h-2 bg-gray-200 rounded-full mb-6">
            <motion.div 
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ 
                width: `${Object.values(agentStatuses).filter(status => status === 'complete').length * 25}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <div className="space-y-4">
            {(['cara', 'maya', 'ellie', 'sophia'] as const).map(agent => {
              const agentStatus = agentStatuses[agent];
              const activity = getAgentActivity(agent);
              const colors = agentColors[agent];
              
              return (
                <div key={agent} className={`p-3 rounded-lg border ${agentStatus === 'active' || agentStatus === 'thinking' 
                  ? `${colors.border} bg-opacity-10 ${colors.bgLight}` 
                  : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-start">
                    <AgentAvatarWithLabel 
                      name={agent} 
                      status={agentStatus} 
                      size="md" 
                    />
                    
                    <div className="ml-auto text-sm">
                      {agentStatus === 'complete' && (
                        <span className="text-green-600 dark:text-green-400 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </span>
                      )}
                      {agentStatus === 'thinking' && (
                        <span className="text-yellow-600 dark:text-yellow-400 flex items-center">
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          Thinking...
                        </span>
                      )}
                      {agentStatus === 'active' && (
                        <span className="text-blue-600 dark:text-blue-400 flex items-center">
                          <ArrowRightCircle className="h-4 w-4 mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {activity && (agentStatus === 'active' || agentStatus === 'thinking') && (
                    <div className="mt-2 pl-12">
                      <p className="text-sm font-medium">{activity.action}</p>
                      {activity.detail && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{activity.detail}</p>
                      )}
                      
                      {activity.tools && activity.tools.length > 0 && (
                        <div className="flex mt-2 gap-1">
                          {activity.tools.map(tool => (
                            <div key={tool} className="inline-flex items-center text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                              {getToolIcon(tool)}
                              <span className="ml-1 text-xs">{tool}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentStatusPanel;