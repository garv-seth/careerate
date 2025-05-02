import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import type { AgentActivity, AgentStatuses } from '@/components/avatars/types';

export interface UseAgentSocketReturn {
  connected: boolean;
  agentStatuses: AgentStatuses;
  agentActivities: AgentActivity[];
  startAnalysis: (resumeText: string) => void;
  error: string | null;
}

export function useAgentSocket(): UseAgentSocketReturn {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Agent data state
  const [agentStatuses, setAgentStatuses] = useState<AgentStatuses>({
    cara: 'idle',
    maya: 'idle',
    ellie: 'idle',
    sophia: 'idle'
  });
  
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  
  // Initialize socket connection
  useEffect(() => {
    if (!user?.id) return;
    
    const newSocket = io(window.location.origin, {
      auth: {
        userId: user.id
      }
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      setError(null);
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setConnected(false);
      setError(`Connection error: ${err.message}`);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });
    
    // Handle agent status updates
    newSocket.on('init_agent_status', (statuses: AgentStatuses) => {
      console.log('Received initial agent statuses:', statuses);
      setAgentStatuses(statuses);
    });
    
    newSocket.on('agent_status_update', (statuses: AgentStatuses) => {
      console.log('Received agent status update:', statuses);
      setAgentStatuses(statuses);
    });
    
    newSocket.on('agent_status_single', (update: { agent: keyof AgentStatuses; status: 'idle' | 'active' | 'thinking' | 'complete' }) => {
      console.log('Received single agent status update:', update);
      setAgentStatuses(prev => ({
        ...prev,
        [update.agent]: update.status
      }));
    });
    
    // Handle agent activities
    newSocket.on('init_agent_activities', (activities: AgentActivity[]) => {
      console.log('Received initial agent activities:', activities);
      // Convert string timestamps to Date objects
      const processedActivities = activities.map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }));
      setAgentActivities(processedActivities);
    });
    
    newSocket.on('agent_activities', (activities: AgentActivity[]) => {
      console.log('Received agent activities:', activities);
      // Convert string timestamps to Date objects
      const processedActivities = activities.map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }));
      setAgentActivities(processedActivities);
    });
    
    newSocket.on('agent_activity', (activity: AgentActivity) => {
      console.log('Received new agent activity:', activity);
      // Convert string timestamp to Date object
      const processedActivity = {
        ...activity,
        timestamp: new Date(activity.timestamp)
      };
      setAgentActivities(prev => [processedActivity, ...prev]);
    });
    
    // Handle completion notification
    newSocket.on('analysis_complete', (data: { success: boolean, careerAdvice: any }) => {
      console.log('Analysis complete:', data);
      if (data.success) {
        const completionActivity: AgentActivity = {
          agent: 'cara',
          action: 'Analysis completed successfully',
          detail: 'All agents have finished processing your resume',
          timestamp: new Date(),
          tools: []
        };
        setAgentActivities(prev => [completionActivity, ...prev]);
      }
    });
    
    // Handle errors
    newSocket.on('analysis_error', (error: { message: string }) => {
      console.error('Analysis error:', error);
      setError(error.message);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]);
  
  // Function to start analysis
  const startAnalysis = useCallback((resumeText: string) => {
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }
    
    socket.emit('start_analysis', { resumeText });
  }, [socket, connected]);
  
  return {
    connected,
    agentStatuses,
    agentActivities,
    startAnalysis,
    error
  };
}