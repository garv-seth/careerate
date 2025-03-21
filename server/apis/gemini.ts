// Gemini API integration for resource discovery and plan generation
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generate a development plan with milestones using Gemini
 * Includes specific YouTube resources and other learning materials
 * 
 * @param currentRole User's current role
 * @param targetRole User's target role
 * @param skills Array of skills to focus on
 * @returns Array of milestone objects with resources
 */
export async function generatePlanWithGemini(
  currentRole: string,
  targetRole: string,
  skills: string[]
): Promise<any[]> {
  console.log(`Generating plan for transition: ${currentRole} → ${targetRole}`);
  console.log(`Skills to focus on:`, skills);

  try {
    // Get a unique set of skills (no duplicates)
    const uniqueSkills = skills.filter((skill, index) => 
      skills.indexOf(skill) === index
    );
    
    // Create a model instance with safety settings
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Create prompt for Gemini
    const prompt = `Create a 5-milestone career transition plan for someone transitioning from ${currentRole} to ${targetRole}.

Focus on these skills: ${uniqueSkills.join(', ')}

For each milestone:
1. Create a clear title and description of what to learn
2. Assign a priority level (High, Medium, Low)
3. Estimate duration in weeks
4. For each milestone, find exactly 3 learning resources including:
   - At least one YouTube video with specific URL (the complete YouTube URL)
   - One book or online course
   - One GitHub repository or practical project
   
Format the response as a valid JSON array with this structure:
[{
  "title": "Milestone title",
  "description": "Detailed description",
  "priority": "High/Medium/Low",
  "durationWeeks": number,
  "order": number (1-5),
  "resources": [
    {
      "title": "Resource title",
      "url": "URL for resource (complete URL)",
      "type": "YouTube/Book/Course/GitHub"
    },
    ... (3 resources per milestone)
  ]
}]

Return only valid JSON with no additional explanation.`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    let milestones = [];
    try {
      // Find and extract JSON from the response
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        milestones = JSON.parse(jsonMatch[0]);
      } else {
        // Try to parse the whole response as JSON
        milestones = JSON.parse(text);
      }
      
      // Verify each milestone has the required fields
      milestones = milestones.map((milestone: any) => {
        return {
          title: milestone.title,
          description: milestone.description || "No description provided",
          priority: milestone.priority || "Medium",
          durationWeeks: milestone.durationWeeks || 4,
          order: milestone.order || 1,
          progress: 0, // Default progress
          resources: Array.isArray(milestone.resources) ? 
            milestone.resources.map((resource: any) => ({
              title: resource.title || "Resource",
              url: resource.url || "https://www.youtube.com/",
              type: resource.type || "YouTube"
            })) : 
            []
        };
      });
      
      console.log(`Successfully generated ${milestones.length} milestones with resources`);
      return milestones;
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      throw new Error("Failed to parse the plan from Gemini");
    }
  } catch (error) {
    console.error("Error generating plan with Gemini:", error);
    throw error;
  }
}

/**
 * Find learning resources for a specific skill
 * Focuses on discovering YouTube videos and practical coding resources
 * 
 * @param skill The skill to find resources for
 * @param context Additional context about the skill
 * @returns Array of resource objects
 */
export async function findResourcesWithGemini(
  skill: string,
  context: string
): Promise<{ title: string; url: string; type: string }[]> {
  console.log(`Finding resources for skill: ${skill}`);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `Find 3 top learning resources for mastering "${skill}" in the context of ${context}. 
    Include at least one specific YouTube video with its complete URL.
    For each resource, provide:
    1. Title
    2. Complete URL (direct link)
    3. Type (YouTube, Book, Course, GitHub, etc.)
    
    Format your answer as a JSON array:
    [
      {
        "title": "Resource name",
        "url": "Complete URL",
        "type": "Resource type"
      }
    ]
    Return only the JSON data with no additional text.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    try {
      // Try to extract a JSON array from the response
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const resources = JSON.parse(jsonMatch[0]);
        return resources.slice(0, 3); // Limit to 3 resources
      } else {
        // If no JSON array found, try to parse the entire text
        const resources = JSON.parse(text);
        return Array.isArray(resources) ? resources.slice(0, 3) : [];
      }
    } catch (parseError) {
      console.error("Error parsing Gemini resources response:", parseError);
      return [];
    }
  } catch (error) {
    console.error(`Error finding resources for ${skill}:`, error);
    return [];
  }
}

/**
 * Analyze a transition story to extract insights
 * 
 * @param currentRole Current role
 * @param targetRole Target role
 * @param scrapedContent Array of scraped content objects
 * @returns Structured insights
 */
export async function analyzeTransitionStories(
  currentRole: string, 
  targetRole: string, 
  scrapedContent: any[]
): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Combine all content for analysis
    const combinedContent = scrapedContent.map(item => 
      `SOURCE: ${item.source}\n${item.content}\n---\n`
    ).join('\n');
    
    const prompt = `You are Cara, an AI career transition analyst.
    
    Analyze these career transition stories about moving from ${currentRole} to ${targetRole}:
    
    ${combinedContent}
    
    Provide a structured analysis with:
    1. Success Rate (percentage) based on the stories
    2. Average Transition Time (in months)
    3. Common Paths (strategies people used)
    4. Key Observations (patterns in the transition stories)
    5. Common Challenges faced during transitions
    
    Format your response as a JSON object with these fields:
    {
      "successRate": number,
      "avgTransitionTime": number,
      "commonPaths": [
        { "path": "description", "count": number }
      ],
      "keyObservations": [
        "observation 1", "observation 2", ...
      ],
      "commonChallenges": [
        "challenge 1", "challenge 2", ...
      ]
    }
    
    If the scraped data is insufficient, use your knowledge of typical career transitions in this domain to provide realistic insights.
    Return only the JSON object.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      // Try to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Gemini insights analysis:", parseError);
      return {
        successRate: 80,
        avgTransitionTime: 6,
        commonPaths: [
          { path: "Skills-based transition", count: 3 }
        ],
        keyObservations: ["Technical skill development is critical"],
        commonChallenges: ["Learning new technical skills"]
      };
    }
  } catch (error) {
    console.error("Error analyzing transition stories with Gemini:", error);
    return null;
  }
}