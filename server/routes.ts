import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import authRouter from "./auth";
import { uploadResume, getResume } from "./object-storage";
import { runCareerate } from "../src/agents/graph";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Replit Auth
  await setupAuth(app);
  
  // Apply auth middleware
  app.use(authRouter);
  
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
  app.post('/api/resume/upload', isAuthenticated, uploadResume, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resumeText = req.resumeText;
      
      if (!resumeText) {
        return res.status(400).json({ message: "No resume text extracted" });
      }
      
      // Update profile with resume text
      await storage.updateProfileResume(userId, resumeText);
      
      res.json({ message: "Resume uploaded and analyzed successfully" });
    } catch (error) {
      console.error("Error processing resume:", error);
      res.status(500).json({ message: "Failed to process resume" });
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
      
      // Run the multi-agent system
      const result = await runCareerate(userId, profile.resumeText);
      res.json(result);
    } catch (error) {
      console.error("Error generating career advice:", error);
      res.status(500).json({ message: "Failed to generate career advice" });
    }
  });
  
  // Generate roadmap
  app.post('/api/roadmap/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfileByUserId(userId);
      
      if (!profile?.resumeText) {
        return res.status(400).json({ message: "No resume found. Please upload your resume first." });
      }
      
      // Run roadmap generation (calls the same function as /api/advise for MVP)
      await runCareerate(userId, profile.resumeText);
      res.json({ message: "Roadmap generated successfully" });
    } catch (error) {
      console.error("Error generating roadmap:", error);
      res.status(500).json({ message: "Failed to generate roadmap" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
