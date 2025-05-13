import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';

// Career service types
export interface CareerAnalysisProgress {
  stage: 'idle' | 'vulnerability-analysis' | 'migration-paths' | 'simulation' | 'complete';
  progress: number; // 0-100
  message: string;
}

export interface CareerInsight {
  type: 'vulnerability' | 'migration' | 'simulation' | 'market' | 'salary';
  title: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

export function useCareerService() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<CareerAnalysisProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to start analysis'
  });
  const [insights, setInsights] = useState<CareerInsight[]>([]);

  // Connect to the socket server when the component mounts
  useEffect(() => {
    if (!user) return;

    console.log('Connecting to career service socket...');
    
    // Create a new socket connection
    const newSocket = io('/', {
      auth: {
        userId: user.id
      }
    });

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('Connected to career service socket');
      setConnected(true);
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setConnected(false);
      setError(`Connection error: ${err.message}`);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from career service socket');
      setConnected(false);
    });

    newSocket.on('analysis_progress', (progress: CareerAnalysisProgress) => {
      console.log('Analysis progress update:', progress);
      setAnalysisProgress(progress);
    });

    newSocket.on('career_insight', (insight: CareerInsight) => {
      console.log('New career insight received:', insight);
      setInsights((prevInsights) => [insight, ...prevInsights]);

      // Show a toast notification for new insights
      toast({
        title: insight.title,
        description: insight.content.substring(0, 100) + (insight.content.length > 100 ? '...' : ''),
      });
    });

    newSocket.on('career_insights', (allInsights: CareerInsight[]) => {
      console.log('All insights received:', allInsights);
      setInsights(allInsights);
    });

    newSocket.on('analysis_error', (err: { message: string }) => {
      console.error('Analysis error:', err);
      setError(err.message);
      
      toast({
        title: 'Analysis Error',
        description: err.message,
        variant: 'destructive',
      });
    });

    newSocket.on('analysis_complete', (data: any) => {
      console.log('Analysis complete:', data);
      setAnalysisProgress({
        stage: 'complete',
        progress: 100,
        message: 'Analysis complete'
      });
      
      toast({
        title: 'Analysis Complete',
        description: 'Your career analysis has been completed successfully.',
        variant: 'default',
      });
    });

    // Save the socket to state
    setSocket(newSocket);

    // Cleanup when the component unmounts
    return () => {
      console.log('Disconnecting from career service socket');
      newSocket.disconnect();
    };
  }, [user, toast]);

  // Function to start the resume analysis process
  const startAnalysis = useCallback((resumeText: string) => {
    if (!socket || !connected) {
      setError('Not connected to the career service');
      return;
    }

    console.log('Starting analysis with text length:', resumeText.length);
    
    // Reset state
    setAnalysisProgress({
      stage: 'vulnerability-analysis',
      progress: 0,
      message: 'Starting analysis...'
    });
    setInsights([]);
    setError(null);
    
    // Send the analysis request to the server
    socket.emit('start_analysis', { resumeText });
  }, [socket, connected]);

  // Function to start the vulnerability assessment
  const startVulnerabilityAssessment = useCallback((jobTitle: string, industry: string) => {
    if (!socket || !connected) {
      setError('Not connected to the career service');
      return;
    }

    console.log('Starting vulnerability assessment for:', jobTitle, industry);
    
    // Reset state
    setAnalysisProgress({
      stage: 'vulnerability-analysis',
      progress: 0,
      message: 'Starting vulnerability assessment...'
    });
    setError(null);
    
    // Send the assessment request to the server
    socket.emit('start_vulnerability_assessment', { 
      currentJobTitle: jobTitle, 
      industry: industry 
    });
  }, [socket, connected]);

  // Function to start career migration path generation
  const startCareerMigration = useCallback((currentRole: string) => {
    if (!socket || !connected) {
      setError('Not connected to the career service');
      return;
    }

    console.log('Starting career migration mapping for:', currentRole);
    
    // Reset state
    setAnalysisProgress({
      stage: 'migration-paths',
      progress: 0,
      message: 'Mapping career migration paths...'
    });
    setError(null);
    
    // Send the migration request to the server
    socket.emit('start_career_migration', { currentRole });
  }, [socket, connected]);

  // Function to start career simulation
  const startCareerSimulation = useCallback((params: any) => {
    if (!socket || !connected) {
      setError('Not connected to the career service');
      return;
    }

    console.log('Starting career simulation with params:', params);
    
    // Reset state
    setAnalysisProgress({
      stage: 'simulation',
      progress: 0,
      message: 'Running career simulation...'
    });
    setError(null);
    
    // Send the simulation request to the server
    socket.emit('start_career_simulation', params);
  }, [socket, connected]);

  return {
    connected,
    analysisProgress,
    insights,
    error,
    startAnalysis,
    startVulnerabilityAssessment,
    startCareerMigration,
    startCareerSimulation
  };
}