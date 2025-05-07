import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { uploadResume, getResume } from "./object-storage";
import onboardingRouter from "./api/onboarding";
// Use simplified agent implementation instead of complex LangChain agents
import { analyzeResume, generateCareerAdvice, generateLearningPlan } from "../src/simplified/agent";
import { Server as SocketIOServer } from "socket.io";
import { agentEmitter } from "../src/agents/graph";
import type { AgentActivity, AgentStatuses } from "../src/agents/graph";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Replit authentication
  await setupAuth(app);
  
  // Apply onboarding routes
  app.use('/api', onboardingRouter);
  
  // Development routes - only available in development
  if (process.env.NODE_ENV === "development") {
    // Add a proper redirect route instead of /auth-test
    app.get('/auth-test', (req, res) => {
      // Redirect to dashboard instead
      res.redirect('/dashboard');
    });
  }
  
  // User profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfileByUserId(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  
  // Resume upload routes
  app.post('/api/resume/upload', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Resume upload endpoint hit");
      console.log("Headers:", req.headers);
      console.log("Content type:", req.headers['content-type']);
      
      // Use custom upload middleware
      uploadResume(req, res, async (err) => {
        if (err) {
          console.error("Error in upload middleware:", err);
          return res.status(400).json({ message: err.message || "File upload error" });
        }
        
        const userId = req.user.claims.sub;
        const resumeText = req.resumeText;
        
        if (!resumeText) {
          return res.status(400).json({ message: "No resume text extracted" });
        }
        
        console.log("Resume text extracted successfully for user:", userId);
        
        try {
          // Update profile with resume text
          const profile = await storage.updateProfileResume(userId, resumeText);
          console.log("Profile updated with resume text:", profile);
          
          return res.json({ message: "Resume uploaded and analyzed successfully", profile });
        } catch (profileError) {
          console.error("Error updating profile:", profileError);
          return res.status(500).json({ message: "Failed to update profile" });
        }
      });
    } catch (error) {
      console.error("Error in upload route handler:", error);
      res.status(500).json({ message: "Failed to process resume upload" });
    }
  });
  
  // Get resume
  app.get('/api/resume', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resume = await getResume(userId);
      res.json({ resumeText: resume });
    } catch (error) {
      console.error("Error fetching resume:", error);
      res.status(500).json({ message: "Failed to fetch resume" });
    }
  });
  
  // Career advising endpoint
  app.get('/api/advise', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfileByUserId(userId);
      
      if (!profile?.resumeText) {
        return res.status(400).json({ message: "No resume found. Please upload your resume first." });
      }
      
      // First analyze the resume
      const resumeAnalysis = await analyzeResume(profile.resumeText);
      
      // Then generate career advice based on the analysis
      const careerAdvice = await generateCareerAdvice(userId, resumeAnalysis);
      
      res.json(careerAdvice);
    } catch (error) {
      console.error("Error generating career advice:", error);
      res.status(500).json({ message: "Failed to generate career advice" });
    }
  });
  
  // Generate learning roadmap
  app.post('/api/roadmap/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfileByUserId(userId);
      
      if (!profile?.resumeText) {
        return res.status(400).json({ message: "No resume found. Please upload your resume first." });
      }
      
      // First analyze the resume to extract skills
      const resumeAnalysis = await analyzeResume(profile.resumeText);
      
      // Generate a learning plan based on the skills
      const learningPlan = await generateLearningPlan(userId, resumeAnalysis.skills);
      
      res.json(learningPlan);
    } catch (error) {
      console.error("Error generating roadmap:", error);
      res.status(500).json({ message: "Failed to generate roadmap" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up Socket.IO for real-time agent activity updates
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Store agent statuses for each user session
  const userAgentStatuses = new Map<string, AgentStatuses>();
  const userAgentActivities = new Map<string, AgentActivity[]>();
  
  // Initialize with default statuses
  const getDefaultAgentStatuses = (): AgentStatuses => ({
    cara: 'idle',
    maya: 'idle',
    ellie: 'idle',
    sophia: 'idle'
  });
  
  // Socket.IO middleware for authentication
  io.use((socket: any, next) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      return next(new Error("Authentication error"));
    }
    
    // Store user ID in socket data
    socket.userId = userId;
    
    // Initialize user's agent statuses if not exist
    if (!userAgentStatuses.has(userId)) {
      userAgentStatuses.set(userId, getDefaultAgentStatuses());
      userAgentActivities.set(userId, []);
    }
    
    next();
  });
  
  // Socket.IO connection handler
  io.on("connection", (socket: any) => {
    const userId = socket.userId;
    console.log(`User connected to socket: ${userId}`);
    
    // Join user-specific room
    socket.join(userId);
    
    // Send initial statuses and activities
    const statuses = userAgentStatuses.get(userId) || getDefaultAgentStatuses();
    const activities = userAgentActivities.get(userId) || [];
    
    socket.emit("init_agent_status", statuses);
    socket.emit("init_agent_activities", activities);
    
    // Listen for agent status updates from the client (for testing)
    socket.on("update_agent_status", (data: { agent: keyof AgentStatuses; status: 'idle' | 'active' | 'thinking' | 'complete' }) => {
      const statuses = userAgentStatuses.get(userId) || getDefaultAgentStatuses();
      statuses[data.agent] = data.status;
      userAgentStatuses.set(userId, statuses);
      
      // Emit to user's room
      io.to(userId).emit("agent_status_update", statuses);
    });
    
    // Listen for analysis request
    socket.on("start_analysis", async (data: { resumeText: string }) => {
      try {
        // Reset agent statuses
        const statuses = getDefaultAgentStatuses();
        userAgentStatuses.set(userId, statuses);
        userAgentActivities.set(userId, []);
        
        // Emit initial state
        io.to(userId).emit("agent_status_update", statuses);
        io.to(userId).emit("agent_activities", []);
        
        // Start the real analysis process using runCareerate from our graph.ts
        console.log(`Starting analysis for user ${userId}`);
        
        try {
          // Save the resume text to the user's profile
          const profile = await storage.getProfileByUserId(userId);
          
          if (profile) {
            await storage.updateProfileResume(userId, data.resumeText);
          } else {
            await storage.createProfile({
              userId,
              resumeText: data.resumeText,
              lastScan: new Date()
            });
          }
          
          // Import at run time to avoid circular dependencies
          const { runCareerate, agentEmitter } = await import('../src/agents/graph');
          
          // Register a temporary listener for this specific user
          const activityListener = (activity: AgentActivity) => {
            const activities = userAgentActivities.get(userId) || [];
            activities.unshift(activity);
            userAgentActivities.set(userId, activities);
            io.to(userId).emit("agent_activities", activities);
            io.to(userId).emit("agent_activity", activity);
          };
          
          const statusListener = (update: { agent: keyof AgentStatuses; status: 'idle' | 'active' | 'thinking' | 'complete' }) => {
            const statuses = userAgentStatuses.get(userId) || getDefaultAgentStatuses();
            statuses[update.agent] = update.status;
            userAgentStatuses.set(userId, statuses);
            io.to(userId).emit("agent_status_update", statuses);
            io.to(userId).emit("agent_status_single", update);
          };
          
          // Add temporary listeners for this user
          agentEmitter.on('activity', activityListener);
          agentEmitter.on('status_update', statusListener);
          
          // Run the agent workflow (this will take some time)
          const careerAdvice = await runCareerate(userId, data.resumeText);
          
          // Remove the temporary listeners
          agentEmitter.off('activity', activityListener);
          agentEmitter.off('status_update', statusListener);
          
          // Send completion notification
          io.to(userId).emit("analysis_complete", { success: true, careerAdvice });
          
        } catch (agentError) {
          console.error("Error running agent workflow:", agentError);
          socket.emit("analysis_error", { 
            message: "Error running agent workflow. The system may have encountered an issue with one of the AI models." 
          });
        }
      } catch (error) {
        console.error("Error in analysis:", error);
        socket.emit("analysis_error", { message: "Failed to analyze resume" });
      }
    });
    
    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
    });
  });
  
  // Listen for agent events from the LangChain agents
  agentEmitter.on('activity', (activity: AgentActivity) => {
    // If the user context is available in the activity, only send to that user
    if (activity.userId) {
      io.to(activity.userId).emit("agent_activity", activity);
    } else {
      // This would normally have user context, but for now broadcast to all
      io.emit("agent_activity", activity);
    }
  });
  
  agentEmitter.on('status_update', (update: { 
    agent: keyof AgentStatuses; 
    status: 'idle' | 'active' | 'thinking' | 'complete';
    userId?: string;
  }) => {
    // If the user context is available in the update, only send to that user
    if (update.userId) {
      io.to(update.userId).emit("agent_status_single", update);
      
      // Also update the stored status for this user
      const statuses = userAgentStatuses.get(update.userId) || getDefaultAgentStatuses();
      statuses[update.agent] = update.status;
      userAgentStatuses.set(update.userId, statuses);
      io.to(update.userId).emit("agent_status_update", statuses);
    } else {
      // Broadcast to all if no user context
      io.emit("agent_status_single", update);
    }
  });
  
  // Add Socket.IO endpoints
  app.get('/api/agent/activities', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const activities = userAgentActivities.get(userId) || [];
    res.json(activities);
  });
  
  app.get('/api/agent/statuses', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const statuses = userAgentStatuses.get(userId) || getDefaultAgentStatuses();
    res.json(statuses);
  });
  
  return httpServer;
}
