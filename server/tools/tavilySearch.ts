/**
 * Tavily search tool for the Cara agent
 * Enhanced to provide better common sense search and highly relevant articles
 */
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { z } from "zod";
import { StructuredTool } from "@langchain/core/tools";

/**
 * Enhanced Tavily search tool specifically for career transitions
 * Uses expert-level search strategies to find the most relevant articles
 */
export class CareerTransitionSearch extends StructuredTool {
  name = "career_transition_search";
  description = "Search for real-world information about career transitions and skills from forums and professional websites to find the most credible and relevant experiences.";
  schema = z.object({
    query: z.string().describe("The search query about career transitions"),
    currentRole: z.string().describe("The current professional role"),
    targetRole: z.string().describe("The target professional role"),
  });

  private tavilyTool: TavilySearchResults;

  constructor() {
    super();
    // Use the Tavily search tool with optimized results
    this.tavilyTool = new TavilySearchResults({
      maxResults: 7, // Get more results for comprehensive analysis
      apiKey: process.env.TAVILY_API_KEY,
      includeRawContent: true, // Get full article content
      searchDepth: "deep", // Use deeper search for better results
    });
  }

  /**
   * Run the career transition search with enhanced common sense
   * Performs a specialized search for career transition information from diverse sources
   */
  async _call({
    query,
    currentRole,
    targetRole,
  }: z.infer<typeof this.schema>): Promise<string> {
    // Extract company and role information with robust parsing
    const currentParts = currentRole.split(' ');
    const currentCompany = currentParts[0] || "";
    
    // Smarter parsing of role titles
    let currentRoleTitle = "";
    if (currentParts.length > 2) {
      // Handle cases like "Google Software Engineer L5" -> "Software Engineer"
      currentRoleTitle = currentParts.slice(1, -1).join(' ');
    } else {
      currentRoleTitle = currentParts.join(' ');
    }
    
    const targetParts = targetRole.split(' ');
    const targetCompany = targetParts[0] || "";
    
    let targetRoleTitle = "";
    if (targetParts.length > 2) {
      // Handle cases like "Meta Product Manager IC5" -> "Product Manager"
      targetRoleTitle = targetParts.slice(1, -1).join(' ');
    } else {
      targetRoleTitle = targetParts.join(' ');
    }
    
    // Create multiple specialized search queries optimized for finding real stories
    // Using common sense to structure queries for maximum relevance
    const searchQueries = [
      // Very specific query for exact role transition (high precision)
      `career transition experiences success stories challenges for transition from ${currentRole} to ${targetRole} career path real experiences`,
      
      // Role-specific but company-agnostic (broader coverage)
      `${currentRoleTitle} to ${targetRoleTitle} transition experiences success stories challenges real cases studies`,
      
      // Company-focused transition (culture and environment)
      `transition from ${currentCompany} to ${targetCompany} employee experiences career change interview process compensation culture`,
      
      // Professional platforms where people share real stories
      `${currentRole} to ${targetRole} career transition case study blog linkedin medium glassdoor reddit`,
      
      // Career progression focus for deeper insights
      `how to transition from ${currentRoleTitle} at ${currentCompany} to ${targetRoleTitle} at ${targetCompany} skills required preparation strategy`
    ];
    
    console.log(`Running intelligent career transition searches for ${currentRole} to ${targetRole}`);
    
    // Combine results from multiple searches with careful deduplication
    let allResults = "";
    let urlsSeen = new Set<string>();
    
    for (const enhancedQuery of searchQueries) {
      try {
        console.log(`Searching: ${enhancedQuery}`);
        const searchResult = await this.tavilyTool.invoke(enhancedQuery);
        
        if (searchResult && typeof searchResult === 'string' && searchResult.length > 0) {
          // Extract structured results when possible to deduplicate
          try {
            const resultObjects = JSON.parse(searchResult);
            if (Array.isArray(resultObjects)) {
              for (const result of resultObjects) {
                // Deduplicate by URL if available
                if (result.url && !urlsSeen.has(result.url)) {
                  urlsSeen.add(result.url);
                  allResults += `### Example from ${result.title || 'Career Transition Story'}:\n`;
                  allResults += `Source: ${result.source || 'Web search'}\n`;
                  allResults += `URL: ${result.url}\n`;
                  allResults += `Content: ${result.content || result.snippet || ''}\n\n`;
                }
              }
            } else {
              // If not an array, just add the raw result
              allResults += searchResult + "\n\n";
            }
          } catch (parseError) {
            // If not valid JSON, just add the raw result
            allResults += searchResult + "\n\n";
          }
        }
      } catch (error) {
        console.error(`Error in search query "${enhancedQuery}":`, error);
        // Continue with other queries even if one fails
      }
    }
    
    return allResults;
  }
}

/**
 * Create a skill search tool specifically for finding information about skills
 * Enhanced with common sense to find the most relevant skill information
 */
export class SkillGapSearch extends StructuredTool {
  name = "skill_gap_search";
  description = "Search for detailed information about specific skills and their direct relevance to different professional roles with real employer expectations.";
  schema = z.object({
    skillName: z.string().describe("The name of the skill to search for"),
    targetRole: z.string().describe("The target professional role"),
  });

  private tavilyTool: TavilySearchResults;

  constructor() {
    super();
    this.tavilyTool = new TavilySearchResults({
      maxResults: 5, // Increased for better coverage
      apiKey: process.env.TAVILY_API_KEY,
      includeRawContent: true, // Get full article content
      searchDepth: "deep", // Use deeper search for better results
    });
  }

  /**
   * Run the skill gap search with enhanced common sense
   */
  async _call({
    skillName,
    targetRole,
  }: z.infer<typeof this.schema>): Promise<string> {
    // Parse role information
    const roleParts = targetRole.split(' ');
    const company = roleParts[0] || "";
    let roleTitle = "";
    
    if (roleParts.length > 2) {
      roleTitle = roleParts.slice(1, -1).join(' ');
    } else {
      roleTitle = roleParts.join(' ');
    }
    
    // Create multiple specialized search queries with common sense
    const searchQueries = [
      // Specific to company and role (high precision)
      `${skillName} skill requirements importance for ${targetRole} position job descriptions expectations`,
      
      // Company-specific context for culture fit
      `${skillName} importance at ${company} for ${roleTitle} position hiring requirements interview questions`,
      
      // Industry standards for the skill
      `${skillName} best practices standards expected proficiency level for ${roleTitle} industry benchmarks`,
      
      // Learning pathway information
      `how to develop ${skillName} skill for ${targetRole} learning path progression roadmap certification`
    ];
    
    console.log(`Running intelligent skill gap search for ${skillName} in ${targetRole}`);
    
    // Combine results with smart deduplication
    let allResults = "";
    let urlsSeen = new Set<string>();
    
    for (const enhancedQuery of searchQueries) {
      try {
        const searchResult = await this.tavilyTool.invoke(enhancedQuery);
        
        if (searchResult && typeof searchResult === 'string' && searchResult.length > 0) {
          // Try to parse and deduplicate structured results
          try {
            const resultObjects = JSON.parse(searchResult);
            if (Array.isArray(resultObjects)) {
              for (const result of resultObjects) {
                if (result.url && !urlsSeen.has(result.url)) {
                  urlsSeen.add(result.url);
                  allResults += `### Skill Information from ${result.title || 'Skill Analysis'}:\n`;
                  allResults += `Source: ${result.source || 'Web search'}\n`;
                  allResults += `Content: ${result.content || result.snippet || ''}\n\n`;
                }
              }
            } else {
              allResults += searchResult + "\n\n";
            }
          } catch (parseError) {
            allResults += searchResult + "\n\n";
          }
        }
      } catch (error) {
        console.error(`Error in skill search query:`, error);
        // Continue with other queries
      }
    }
    
    return allResults;
  }
}

/**
 * Create a learning resource search tool specifically for finding high-quality learning resources
 * Enhanced with common sense to find the best and most relevant learning materials
 */
export class LearningResourceSearch extends StructuredTool {
  name = "learning_resource_search";
  description = "Search for highly specific learning resources, courses, tutorials, YouTube videos, and guides for skills with detailed quality assessment.";
  schema = z.object({
    skillName: z.string().describe("The name of the skill to find resources for"),
    resourceType: z.string().optional().describe("The type of resource (course, tutorial, book, etc.)"),
    difficulty: z.string().optional().describe("The difficulty level (beginner, intermediate, advanced)"),
  });

  private tavilyTool: TavilySearchResults;

  constructor() {
    super();
    this.tavilyTool = new TavilySearchResults({
      maxResults: 5,
      apiKey: process.env.TAVILY_API_KEY,
      includeRawContent: true, // Get full article content
      searchDepth: "deep", // Use deeper search for better results
    });
  }

  /**
   * Run the learning resource search with enhanced common sense
   */
  async _call({
    skillName,
    resourceType = "course tutorial video guide",
    difficulty = "comprehensive",
  }: z.infer<typeof this.schema>): Promise<string> {
    // Create multiple specialized search queries with common sense
    const searchQueries = [
      // General high-quality resources
      `best ${resourceType} to learn ${skillName} ${difficulty} skill professional development top rated reviewed`,
      
      // YouTube-specific (for video content)
      `best YouTube channels videos tutorials for learning ${skillName} ${difficulty} highest rated`,
      
      // Free resources query
      `free ${resourceType} learn ${skillName} ${difficulty} open source github high quality`,
      
      // Hands-on practice resources
      `practical exercises projects to practice ${skillName} real-world applications ${difficulty} level`,
      
      // Expert-recommended resources
      `expert recommended resources learn master ${skillName} ${difficulty} professional certification`
    ];
    
    console.log(`Running intelligent learning resource search for ${skillName} (${difficulty})`);
    
    // Combine results with careful categorization
    let allResults = "";
    let resourcesByType: Record<string, string[]> = {
      "Courses": [],
      "Tutorials": [],
      "Videos": [],
      "Books": [],
      "Practice Projects": [],
      "Other Resources": []
    };
    
    let urlsSeen = new Set<string>();
    
    for (const enhancedQuery of searchQueries) {
      try {
        const searchResult = await this.tavilyTool.invoke(enhancedQuery);
        
        if (searchResult && typeof searchResult === 'string' && searchResult.length > 0) {
          try {
            const resultObjects = JSON.parse(searchResult);
            if (Array.isArray(resultObjects)) {
              for (const result of resultObjects) {
                if (result.url && !urlsSeen.has(result.url)) {
                  urlsSeen.add(result.url);
                  
                  // Categorize by resource type
                  const title = result.title || 'Learning Resource';
                  const content = result.content || result.snippet || '';
                  const source = result.source || 'Web search';
                  const url = result.url;
                  
                  const resourceEntry = `Title: ${title}\nURL: ${url}\nSource: ${source}\nDescription: ${content}\n`;
                  
                  // Smart categorization based on URL and title
                  if (url.includes('youtube.com') || url.includes('youtu.be') || 
                      title.toLowerCase().includes('video') || title.toLowerCase().includes('youtube')) {
                    resourcesByType["Videos"].push(resourceEntry);
                  } else if (url.includes('coursera') || url.includes('udemy') || url.includes('udacity') || 
                             url.includes('edx') || title.toLowerCase().includes('course')) {
                    resourcesByType["Courses"].push(resourceEntry);
                  } else if (url.includes('github') || title.toLowerCase().includes('project') || 
                             content.toLowerCase().includes('hands-on')) {
                    resourcesByType["Practice Projects"].push(resourceEntry);
                  } else if (title.toLowerCase().includes('tutorial') || 
                             content.toLowerCase().includes('step by step')) {
                    resourcesByType["Tutorials"].push(resourceEntry);
                  } else if (title.toLowerCase().includes('book') || url.includes('amazon') || 
                             url.includes('goodreads')) {
                    resourcesByType["Books"].push(resourceEntry);
                  } else {
                    resourcesByType["Other Resources"].push(resourceEntry);
                  }
                }
              }
            } else {
              // If not an array, just add the raw result
              allResults += searchResult + "\n\n";
            }
          } catch (parseError) {
            // If not valid JSON, just add the raw result
            allResults += searchResult + "\n\n";
          }
        }
      } catch (error) {
        console.error(`Error in learning resource search:`, error);
      }
    }
    
    // Format categorized resources
    for (const [category, resources] of Object.entries(resourcesByType)) {
      if (resources.length > 0) {
        allResults += `## ${category}:\n\n`;
        resources.forEach((resource, i) => {
          allResults += `### Resource ${i+1}:\n${resource}\n`;
        });
        allResults += '\n';
      }
    }
    
    return allResults;
  }
}