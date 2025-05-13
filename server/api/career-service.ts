import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { Server as SocketIOServer } from "socket.io";
import { EventEmitter } from "events";
import type { Server } from "http";
import { OpenAI } from "@langchain/openai";
import { z } from "zod";

// Create a new event emitter for career service events
export const careerServiceEmitter = new EventEmitter();

// Define types for analysis progress and insights
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

// Map to store user-specific analysis status and insights
const userAnalysisProgress = new Map<string, CareerAnalysisProgress>();
const userCareerInsights = new Map<string, CareerInsight[]>();

// Initialize career service socket handlers
export function initCareerServiceSockets(io: SocketIOServer) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;
    
    if (!userId) {
      socket.disconnect();
      return;
    }
    
    console.log(`User connected to career service: ${userId}`);
    
    // Send initial state if available
    const progress = userAnalysisProgress.get(userId);
    if (progress) {
      socket.emit('analysis_progress', progress);
    }
    
    const insights = userCareerInsights.get(userId) || [];
    if (insights.length > 0) {
      socket.emit('career_insights', insights);
    }
    
    // Handle resume analysis request
    socket.on('start_analysis', async (data: { resumeText: string }) => {
      try {
        console.log(`Starting career analysis for user ${userId}`);
        
        // Update and broadcast initial progress
        updateAnalysisProgress(userId, {
          stage: 'vulnerability-analysis',
          progress: 5,
          message: 'Starting AI vulnerability assessment...'
        });
        
        // In a real implementation, this would initiate a comprehensive analysis
        // using AI models and return the results
        
        // For demo purposes, simulate the analysis process
        setTimeout(() => {
          updateAnalysisProgress(userId, {
            stage: 'vulnerability-analysis',
            progress: 50,
            message: 'Analyzing career vulnerability to AI automation...'
          });
          
          // Add a career insight
          addCareerInsight(userId, {
            type: 'vulnerability',
            title: 'Initial Assessment',
            content: 'Analyzing your resume to determine AI displacement risk.',
            timestamp: new Date()
          });
        }, 2000);
        
        // Simulate completion
        setTimeout(() => {
          updateAnalysisProgress(userId, {
            stage: 'complete',
            progress: 100,
            message: 'Analysis complete!'
          });
          
          // Signal completion
          io.to(userId).emit('analysis_complete', { 
            success: true, 
            results: { message: 'Analysis completed successfully.' } 
          });
        }, 5000);
        
      } catch (error) {
        console.error('Error in career analysis:', error);
        socket.emit('analysis_error', { message: 'Failed to analyze career data' });
      }
    });
    
    // Handle vulnerability assessment
    socket.on('start_vulnerability_assessment', async (data: { currentJobTitle: string, industry: string }) => {
      try {
        console.log(`Starting vulnerability assessment for ${data.currentJobTitle} in ${data.industry}`);
        
        // Update progress
        updateAnalysisProgress(userId, {
          stage: 'vulnerability-analysis',
          progress: 10,
          message: `Analyzing vulnerability for ${data.currentJobTitle} in ${data.industry}...`
        });
        
        // Simulate the assessment process
        setTimeout(() => {
          updateAnalysisProgress(userId, {
            stage: 'vulnerability-analysis',
            progress: 75,
            message: 'Calculating vulnerability scores and timelines...'
          });
          
          // Add an insight
          addCareerInsight(userId, {
            type: 'vulnerability',
            title: 'AI Vulnerability Factor Identified',
            content: `Your role as ${data.currentJobTitle} has several routine tasks that are susceptible to AI automation.`,
            timestamp: new Date()
          });
        }, 3000);
        
        // Simulate completion
        setTimeout(() => {
          updateAnalysisProgress(userId, {
            stage: 'complete',
            progress: 100,
            message: 'Vulnerability assessment complete!'
          });
          
          io.to(userId).emit('analysis_complete', { 
            success: true, 
            results: { 
              jobTitle: data.currentJobTitle,
              industry: data.industry,
              overallRisk: 68, // Demo value
              automationRisk: 72, // Demo value
              timeframe: "3-5 years"
            } 
          });
        }, 8000);
        
      } catch (error) {
        console.error('Error in vulnerability assessment:', error);
        socket.emit('analysis_error', { message: 'Failed to assess vulnerability' });
      }
    });
    
    // Handle career migration path generation
    socket.on('start_career_migration', async (data: { currentRole: string }) => {
      try {
        console.log(`Generating career migration paths from ${data.currentRole}`);
        
        updateAnalysisProgress(userId, {
          stage: 'migration-paths',
          progress: 10,
          message: `Analyzing career migration options from ${data.currentRole}...`
        });
        
        // Simulate processing
        setTimeout(() => {
          updateAnalysisProgress(userId, {
            stage: 'migration-paths',
            progress: 60,
            message: 'Identifying optimal transition paths...'
          });
          
          addCareerInsight(userId, {
            type: 'migration',
            title: 'Promising Career Path Identified',
            content: `Based on your skill profile, a transition to a related field with lower AI disruption risk may be optimal.`,
            timestamp: new Date()
          });
        }, 3000);
        
        // Simulate completion
        setTimeout(() => {
          updateAnalysisProgress(userId, {
            stage: 'complete',
            progress: 100,
            message: 'Career migration paths generated!'
          });
          
          io.to(userId).emit('analysis_complete', { 
            success: true, 
            results: { 
              currentRole: data.currentRole,
              paths: [
                {
                  targetRole: "Product Manager",
                  viabilityScore: 85,
                  timeframe: "1-2 years"
                },
                {
                  targetRole: "UX Researcher",
                  viabilityScore: 78,
                  timeframe: "1-1.5 years"
                }
              ]
            } 
          });
        }, 7000);
        
      } catch (error) {
        console.error('Error generating migration paths:', error);
        socket.emit('analysis_error', { message: 'Failed to generate career migration paths' });
      }
    });
    
    // Handle career simulation
    socket.on('start_career_simulation', async (params: any) => {
      try {
        console.log(`Starting career simulation for role: ${params.startingRole}`);
        
        updateAnalysisProgress(userId, {
          stage: 'simulation',
          progress: 5,
          message: 'Initializing career simulation...'
        });
        
        // Simulate processing stages
        setTimeout(() => {
          updateAnalysisProgress(userId, {
            stage: 'simulation',
            progress: 30,
            message: 'Generating career trajectory models...'
          });
          
          addCareerInsight(userId, {
            type: 'simulation',
            title: 'Career Trajectory Modeling',
            content: 'Creating predictive models based on your starting parameters and industry trends.',
            timestamp: new Date()
          });
        }, 2000);
        
        setTimeout(() => {
          updateAnalysisProgress(userId, {
            stage: 'simulation',
            progress: 60,
            message: 'Simulating future scenarios...'
          });
          
          addCareerInsight(userId, {
            type: 'simulation',
            title: 'Industry Disruption Detected',
            content: `Our simulation predicts significant changes in the ${params.industry} industry within the next 3 years.`,
            timestamp: new Date()
          });
        }, 5000);
        
        // Simulate completion
        setTimeout(() => {
          updateAnalysisProgress(userId, {
            stage: 'complete',
            progress: 100,
            message: 'Career simulation complete!'
          });
          
          io.to(userId).emit('analysis_complete', { 
            success: true, 
            results: { 
              simulationId: Math.floor(Math.random() * 1000),
              startingRole: params.startingRole,
              industry: params.industry,
              timeframeYears: params.timeframeYears || 5,
              scenarios: [
                { year: 1, probability: 0.8, title: "Expected Growth Path" },
                { year: 3, probability: 0.4, title: "Industry Disruption Scenario" }
              ]
            } 
          });
        }, 10000);
        
      } catch (error) {
        console.error('Error in career simulation:', error);
        socket.emit('analysis_error', { message: 'Failed to run career simulation' });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected from career service: ${userId}`);
    });
  });
  
  // Set up global event listeners for the career service
  careerServiceEmitter.on('progress_update', (userId: string, progress: CareerAnalysisProgress) => {
    io.to(userId).emit('analysis_progress', progress);
  });
  
  careerServiceEmitter.on('new_insight', (userId: string, insight: CareerInsight) => {
    io.to(userId).emit('career_insight', insight);
  });
}

// Helper functions to update state and emit events
function updateAnalysisProgress(userId: string, progress: CareerAnalysisProgress) {
  userAnalysisProgress.set(userId, progress);
  careerServiceEmitter.emit('progress_update', userId, progress);
}

function addCareerInsight(userId: string, insight: CareerInsight) {
  const insights = userCareerInsights.get(userId) || [];
  insights.unshift(insight);
  userCareerInsights.set(userId, insights);
  careerServiceEmitter.emit('new_insight', userId, insight);
}

// API Routes for the career service
const router = Router();

// Vulnerability assessment routes
router.get('/vulnerability-assessment', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const assessment = await storage.getUserVulnerabilityAssessment(userId);
    
    // If no assessment exists yet, return an empty object
    if (!assessment) {
      return res.json(null);
    }
    
    // Transform the assessment into the expected format if needed
    const result = {
      overallRiskScore: assessment.overallRiskScore,
      automationRisk: assessment.automationRisk,
      displacementTimeframe: assessment.displacementTimeframe,
      currentJobTitle: assessment.currentJobTitle,
      currentIndustry: assessment.currentIndustry,
      riskFactors: assessment.riskFactors || [],
      safeguardingStrategies: assessment.safeguardingStrategies || []
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching vulnerability assessment:', error);
    res.status(500).json({ message: 'Failed to fetch vulnerability assessment' });
  }
});

// Career migration paths routes
router.get('/career-migration-paths', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const migrationPaths = await storage.getCareerMigrationPathsByUserId(userId);
    
    if (!migrationPaths || migrationPaths.length === 0) {
      return res.json(null);
    }
    
    // Transform the data if needed
    const formattedPaths = migrationPaths.map(path => ({
      sourceRole: path.sourceRole,
      targetRole: path.targetRole,
      viabilityScore: path.viabilityScore,
      skillsTransferability: path.skillsTransferability,
      timeToTransition: path.timeToTransition,
      potentialSalaryImpact: path.potentialSalaryImpact,
      requiredReskilling: path.requiredReskilling || [],
      migrationSteps: path.recommendedSteps || []
    }));
    
    res.json(formattedPaths);
  } catch (error) {
    console.error('Error fetching career migration paths:', error);
    res.status(500).json({ message: 'Failed to fetch career migration paths' });
  }
});

// Career simulations routes
router.get('/career-simulations', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const simulations = await storage.getCareerSimulationsByUserId(userId);
    
    if (!simulations || simulations.length === 0) {
      return res.json(null);
    }
    
    // Get the most recent simulation
    const latestSimulation = simulations[0];
    
    // Get timepoints for this simulation
    const timepoints = await storage.getSimulationTimepointsBySimulationId(latestSimulation.id);
    
    const result = {
      id: latestSimulation.id,
      title: latestSimulation.simulationTitle,
      startingRole: latestSimulation.startingRole,
      startingSalary: latestSimulation.startingSalary || 0,
      timeframeYears: latestSimulation.timeframeYears,
      industryContext: latestSimulation.industryContext,
      timepoints: timepoints || []
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching career simulations:', error);
    res.status(500).json({ message: 'Failed to fetch career simulations' });
  }
});

// Salary negotiation endpoints can be added here

export default router;