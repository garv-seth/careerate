/**
 * Improved Routes for Career Transition Agent
 * 
 * Contains optimized API routes for the lightweight SimpleMemoryAgent
 * to reduce resource usage during transitions.
 */

import express from 'express';
import { z } from 'zod';
import { IStorage } from './storage';
import { SimpleMemoryAgent, getSimpleMemoryAgent } from './agents/simpleMemoryAgent';
import { validateAPIKeys } from './validateApiKeys';
import { safeJsonParse } from './helpers/jsonParserHelper';

// Define the router
const improvedRouter = express.Router();

/**
 * GET /api/v2/health
 * Health check endpoint
 */
improvedRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/v2/api-keys
 * Check API key status
 */
improvedRouter.get('/api-keys', (req, res) => {
  const apiKeyStatus = validateAPIKeys();
  res.json({
    status: 'ok',
    keys: apiKeyStatus
  });
});

/**
 * POST /api/v2/transitions
 * Start a simple career transition analysis
 */
improvedRouter.post('/transitions', async (req, res) => {
  try {
    // Validate request body
    const schema = z.object({
      currentRole: z.string().min(2).max(100),
      targetRole: z.string().min(2).max(100),
      userId: z.number().optional().nullable()
    });
    
    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request body',
        errors: validationResult.error.errors
      });
    }
    
    const { currentRole, targetRole, userId = 1 } = validationResult.data;
    
    // Create a unique ID for this transition
    const transitionId = Date.now();
    
    // Start the analysis process (non-blocking)
    const storage = req.app.locals.storage as IStorage;
    const agent = getSimpleMemoryAgent(storage);
    
    // Start the analysis in the background
    agent.analyzeCareerTransition(
      currentRole,
      targetRole,
      userId,
      transitionId
    ).catch(error => {
      console.error(`Background analysis error for transition ${transitionId}:`, error);
    });
    
    // Return the transition ID immediately
    res.json({
      status: 'ok',
      transitionId,
      message: 'Career transition analysis started',
      estimatedTime: '30-60 seconds'
    });
  } catch (error) {
    console.error('Error starting transition analysis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error starting transition analysis'
    });
  }
});

/**
 * GET /api/v2/transitions/:id
 * Get the status/results of a career transition analysis
 */
improvedRouter.get('/transitions/:id', async (req, res) => {
  try {
    const transitionId = parseInt(req.params.id, 10);
    
    if (isNaN(transitionId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid transition ID'
      });
    }
    
    const storage = req.app.locals.storage as IStorage;
    const agent = getSimpleMemoryAgent(storage);
    
    // This will return the current state from memory, without re-running the analysis
    const result = await agent.analyzeCareerTransition(
      '', // These values are ignored if there's already a memory for this transition
      '',
      1,
      transitionId
    );
    
    if (result.error) {
      return res.status(500).json({
        status: 'error',
        message: 'Error in transition analysis',
        error: result.error
      });
    }
    
    if (!result.complete) {
      return res.json({
        status: 'processing',
        message: 'Career transition analysis is still in progress',
        transitionId,
        partial: result
      });
    }
    
    res.json({
      status: 'complete',
      transitionId,
      result
    });
  } catch (error) {
    console.error('Error getting transition analysis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving transition analysis'
    });
  }
});

/**
 * Export the router
 */
export default improvedRouter;

/**
 * Register improved routes function for Express app
 */
export async function registerRoutes(app: any): Promise<any> {
  const http = await import('http');
  const server = http.createServer(app);
  
  // Create storage instance
  const { MemStorage } = await import('./storage/memory');
  const storage = new MemStorage();
  app.locals.storage = storage;
  
  // Register the improved routes
  app.use('/api/v2', improvedRouter);
  
  return server;
}