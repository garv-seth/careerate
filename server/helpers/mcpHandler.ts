// server/helpers/mcpHandler.ts

import { storage } from "../storage";

/**
 * MCP (Model Context Protocol) Handler
 *
 * Implements MCP for better context management in our agent system.
 * See: https://contextkit.mipasa.io/
 */
export class MCPHandler {
  private userId: number;
  private transitionId: number;
  private contexts: Map<string, any> = new Map();

  constructor(userId: number, transitionId: number) {
    this.userId = userId;
    this.transitionId = transitionId;
  }

  /**
   * Initialize MCP contexts from database
   */
  async initialize(): Promise<void> {
    try {
      // Load user profile
      const user = await storage.getUser(this.userId);
      const profile = await storage.getProfile(this.userId);
      const skills = await storage.getUserSkills(this.userId);

      // Load transition data
      const transition = await storage.getTransition(this.transitionId);
      const skillGaps = await storage.getSkillGapsByTransitionId(
        this.transitionId,
      );
      const insights = await storage.getInsightsByTransitionId(
        this.transitionId,
      );

      // Set contexts
      this.contexts.set("user", {
        id: this.userId,
        email: user?.email,
        currentRole: user?.currentRole,
        profile: profile || null,
        skills: skills || [],
      });

      this.contexts.set("transition", {
        id: this.transitionId,
        currentRole: transition?.currentRole,
        targetRole: transition?.targetRole,
        skillGaps: skillGaps || [],
        insights: insights || [],
      });
    } catch (error) {
      console.error("Error initializing MCP contexts:", error);
    }
  }

  /**
   * Get a context by name
   */
  getContext(name: string): any {
    return this.contexts.get(name);
  }

  /**
   * Update a context value
   */
  updateContext(name: string, value: any): void {
    this.contexts.set(name, value);
  }

  /**
   * Get MCP header for model requests
   */
  getMCPHeader(): string {
    const contextData: Record<string, any> = {};

    // Add all contexts to the header
    for (const [key, value] of this.contexts.entries()) {
      contextData[key] = value;
    }

    // Return formatted MCP header
    return JSON.stringify({
      schema_version: "v1",
      contexts: contextData,
    });
  }

  /**
   * Apply MCP to a prompt
   */
  applyMCP(prompt: string): string {
    const mcpHeader = this.getMCPHeader();
    return `<mcp>${mcpHeader}</mcp>\n\n${prompt}`;
  }
}
