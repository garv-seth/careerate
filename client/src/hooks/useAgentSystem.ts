
import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

// Agent types based on server implementation
type AgentName = 'cara' | 'maya' | 'ellie' | 'sophia';
type AgentStatus = 'idle' | 'working' | 'thinking' | 'complete';

interface AgentStatuses {
  cara: AgentStatus;
  maya: AgentStatus;
  ellie: AgentStatus;
  sophia: AgentStatus;
}

interface AgentState {
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
  status: AgentStatuses;
}

interface AgentSettings {
  models: {
    orchestration: string;
    resume: string;
    research: string;
    learning: string;
  };
  analysis: {
    deepAnalysis: boolean;
    realTimeMarketData: boolean;
  };
}

export function useAgentSystem() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatuses>({
    cara: 'idle',
    maya: 'idle',
    ellie: 'idle',
    sophia: 'idle'
  });

  // Listen for agent status updates
  useEffect(() => {
    const handleStatusUpdate = (event: CustomEvent) => {
      setAgentStatus(event.detail);
    };

    window.addEventListener('agent-status-update', handleStatusUpdate as EventListener);

    return () => {
      window.removeEventListener('agent-status-update', handleStatusUpdate as EventListener);
    };
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      // We don't need to store settings locally since they're retrieved from the server
      // when needed, but we could update a local state here if desired
      toast({
        title: 'Settings applied',
        description: 'Agent system updated with new settings.',
      });
    };

    window.addEventListener('settings-updated', handleSettingsUpdate as EventListener);

    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate as EventListener);
    };
  }, [toast]);

  // Start agent analysis
  const startAnalysis = async (input: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/career-service/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }
      
      const data = await response.json();
      setAgentState(data);
      
      toast({
        title: 'Analysis started',
        description: 'The agent team is analyzing your input.',
      });
      
      return data;
    } catch (error) {
      console.error('Error starting analysis:', error);
      toast({
        title: 'Analysis failed',
        description: error.message || 'An error occurred during analysis.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Get current analysis state
  const getAnalysisState = async () => {
    try {
      const response = await fetch('/api/career-service/state', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to get analysis state');
      }
      
      const data = await response.json();
      setAgentState(data);
      setAgentStatus(data.status);
      
      return data;
    } catch (error) {
      console.error('Error getting analysis state:', error);
      return null;
    }
  };

  // Reset analysis state
  const resetAnalysis = async () => {
    try {
      const response = await fetch('/api/career-service/reset', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset analysis');
      }
      
      setAgentState(null);
      setAgentStatus({
        cara: 'idle',
        maya: 'idle',
        ellie: 'idle',
        sophia: 'idle'
      });
      
      toast({
        title: 'Analysis reset',
        description: 'The agent system has been reset.',
      });
      
      return true;
    } catch (error) {
      console.error('Error resetting analysis:', error);
      toast({
        title: 'Reset failed',
        description: error.message || 'An error occurred while resetting.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Get current settings
  const getSettings = async (): Promise<AgentSettings | null> => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to get settings');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  };

  // Update settings
  const updateSettings = async (settings: AgentSettings): Promise<boolean> => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      toast({
        title: 'Settings updated',
        description: 'Your agent preferences have been saved.',
      });
      
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Settings update failed',
        description: error.message || 'An error occurred while saving settings.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    isLoading,
    agentState,
    agentStatus,
    startAnalysis,
    getAnalysisState,
    resetAnalysis,
    getSettings,
    updateSettings,
  };
}
