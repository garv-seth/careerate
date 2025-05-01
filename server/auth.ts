import express from "express";
import { isAuthenticated } from "./replitAuth";

// Create auth router
const authRouter = express.Router();

// Protect routes that need authentication
authRouter.use("/api/profile", isAuthenticated);
authRouter.use("/api/advise", isAuthenticated);
authRouter.use("/api/resume", isAuthenticated);
authRouter.use("/api/roadmap", isAuthenticated);
authRouter.use("/api/auth/user", isAuthenticated);

export default authRouter;
