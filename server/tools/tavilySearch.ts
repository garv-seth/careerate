/**
 * Tavily search tool for the Cara agent
 */
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { z } from "zod";
import { StructuredTool } from "@langchain/core/tools";

/**
 * Enhanced Tavily search tool specifically for career transitions
 */
export class CareerTransitionSearch extends StructuredTool {
  name = "career_transition_search";
  description = "Search for real-world information about career transitions and skills from forums and professional websites.";
  schema = z.object({
    query: z.string().describe("The search query about career transitions"),
    currentRole: z.string().describe("The current professional role"),
    targetRole: z.string().describe("The target professional role"),
  });

  private tavilyTool: TavilySearchResults;

  constructor() {
    super();
    // Use the Tavily search tool with maximum results
    this.tavilyTool = new TavilySearchResults({
      maxResults: 5, // Get more results for comprehensive analysis
      apiKey: process.env.TAVILY_API_KEY,
    });
  }

  /**
   * Run the career transition search
   * Performs a specialized search for career transition information
   */
  async _call({
    query,
    currentRole,
    targetRole,
  }: z.infer<typeof this.schema>): Promise<string> {
    // Create a specialized career transition search query
    const enhancedQuery = `${query} for transition from ${currentRole} to ${targetRole} career path real experiences forums Reddit Quora Blind`;
    
    console.log(`Running career transition search: ${enhancedQuery}`);

    // Use the Tavily search tool
    const searchResults = await this.tavilyTool.invoke(enhancedQuery);
    
    return searchResults;
  }
}

/**
 * Create a skill search tool specifically for finding information about skills
 */
export class SkillGapSearch extends StructuredTool {
  name = "skill_gap_search";
  description = "Search for information about specific skills and their relevance to different professional roles.";
  schema = z.object({
    skillName: z.string().describe("The name of the skill to search for"),
    targetRole: z.string().describe("The target professional role"),
  });

  private tavilyTool: TavilySearchResults;

  constructor() {
    super();
    this.tavilyTool = new TavilySearchResults({
      maxResults: 3,
      apiKey: process.env.TAVILY_API_KEY,
    });
  }

  /**
   * Run the skill gap search
   */
  async _call({
    skillName,
    targetRole,
  }: z.infer<typeof this.schema>): Promise<string> {
    // Create a specialized skill search query
    const enhancedQuery = `${skillName} skill requirements importance learning resources for ${targetRole} position`;
    
    console.log(`Running skill gap search: ${enhancedQuery}`);

    // Use the Tavily search tool
    const searchResults = await this.tavilyTool.invoke(enhancedQuery);
    
    return searchResults;
  }
}

/**
 * Create a learning resource search tool specifically for finding learning resources
 */
export class LearningResourceSearch extends StructuredTool {
  name = "learning_resource_search";
  description = "Search for learning resources, courses, tutorials and guides for specific skills.";
  schema = z.object({
    skillName: z.string().describe("The name of the skill to find resources for"),
    resourceType: z.string().optional().describe("The type of resource (course, tutorial, book, etc.)"),
  });

  private tavilyTool: TavilySearchResults;

  constructor() {
    super();
    this.tavilyTool = new TavilySearchResults({
      maxResults: 3,
      apiKey: process.env.TAVILY_API_KEY,
    });
  }

  /**
   * Run the learning resource search
   */
  async _call({
    skillName,
    resourceType = "course tutorial guide",
  }: z.infer<typeof this.schema>): Promise<string> {
    // Create a specialized resource search query
    const enhancedQuery = `best ${resourceType} to learn ${skillName} skill professional development`;
    
    console.log(`Running learning resource search: ${enhancedQuery}`);

    // Use the Tavily search tool
    const searchResults = await this.tavilyTool.invoke(enhancedQuery);
    
    return searchResults;
  }
}