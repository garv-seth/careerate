import express, { Request, Response } from 'express';
import { isAuthenticated } from '../replitAuth';
import { agentEmitter, startDeepAccelerationWorkflow } from '../../src/agents/graph'; // Assuming this function will be created
import { storage } from '../storage';

const router = express.Router();

// Start Deep Acceleration Workflow
router.post('/start', isAuthenticated, async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  let userId: string | undefined;

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    userId = typeof req.user === 'object' && (req.user as any).id 
      ? (req.user as any).id 
      : (req.user as any).claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    console.log(`[Accelerate API] Received request for user ${userId}`);

    // Optional: Check if a workflow is already in progress for this user if needed

    // Emit an event that the process has started (for potential real-time UI)
    agentEmitter.emit('workflow_started', { userId, workflow: 'deep_acceleration', timestamp: new Date() });

    // Asynchronously start the workflow. 
    // For a long-running process, we might return a 202 Accepted here and let the client poll or use WebSockets.
    // For now, let's make it a potentially long-running synchronous request for simplicity, 
    // but acknowledge it can be improved.
    
    const deepAccelerationPlan = await startDeepAccelerationWorkflow(userId);

    if (deepAccelerationPlan.errors && deepAccelerationPlan.errors.length > 0) {
      console.error(`[Accelerate API] Workflow completed with errors for user ${userId}:`, deepAccelerationPlan.errors);
      return res.status(500).json({ 
        message: "Deep Acceleration workflow completed with errors.", 
        errors: deepAccelerationPlan.errors,
        results: deepAccelerationPlan // Send partial results if any
      });
    }

    console.log(`[Accelerate API] Workflow completed successfully for user ${userId}`);
    return res.status(200).json({
      message: "Deep Acceleration workflow completed successfully!",
      plan: deepAccelerationPlan.final_plan, // Assuming final_plan is the main output
      full_results: deepAccelerationPlan // Send all results for client to process
    });

  } catch (error: any) {
    console.error('[Accelerate API] Error starting Deep Acceleration workflow:', error);
    // Ensure userId is passed to emitter if available
    const eventPayload: any = { workflow: 'deep_acceleration', error: error.message, timestamp: new Date() };
    if (userId) {
      eventPayload.userId = userId;
    }
    agentEmitter.emit('workflow_error', eventPayload);
    return res.status(500).json({ error: error.message || 'Failed to start Deep Acceleration workflow' });
  }
});

export default router; 