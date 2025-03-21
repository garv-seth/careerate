import axios from 'axios';

// Resource type interface
interface Resource {
  title: string;
  url: string;
  type: string; // "Book", "Video", "Course", "GitHub", etc.
}

/**
 * Find learning resources using Perplexity API
 * @param skill The skill to find resources for
 * @param context Additional context about the skill
 * @returns Array of resource objects
 */
export async function findResources(skill: string, context: string): Promise<Resource[]> {
  try {
    console.log(`Finding resources for skill: ${skill}`);
    
    // Create search query
    const searchQuery = `Find the best free online resources for learning "${skill}" for tech career transitions. ${context}`;
    
    // Call Perplexity API
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: `You are a technical learning resource finder. 
              Find high-quality, free learning resources for technical skills.
              Return results as a JSON array of objects with these properties:
              - title: The name of the resource
              - url: The URL of the resource (must be valid and working)
              - type: The type of resource (Book, Video, Course, GitHub, etc.)
              
              Be specific with titles and accurate with URLs.
              Focus on widely respected, free resources.
              Limit to 2-3 high-quality resources.`
          },
          {
            role: "user",
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        search_domain_filter: ["perplexity.ai"],
        search_recency_filter: "month",
        top_p: 0.9,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || "placeholder-key"}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Parse and validate response
    try {
      const content = response.data.choices[0].message.content;
      
      // Try to extract JSON array from text
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        const resources = JSON.parse(jsonMatch[0]);
        return validateResources(resources);
      }
      
      // If no JSON array found, try parsing the whole content
      try {
        const resources = JSON.parse(content);
        return validateResources(resources);
      } catch (parseError) {
        // If all parsing attempts fail, return fallback resources
        return generateFallbackResources(skill);
      }
    } catch (parseError) {
      console.error("Error parsing Perplexity response:", parseError);
      return generateFallbackResources(skill);
    }
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    return generateFallbackResources(skill);
  }
}

/**
 * Validate resources to ensure they have required fields
 */
function validateResources(resources: any[]): Resource[] {
  if (!Array.isArray(resources)) {
    return generateFallbackResources("general");
  }
  
  return resources
    .filter(resource => 
      typeof resource === 'object' && 
      resource.title && 
      resource.url && 
      resource.type
    )
    .map(resource => ({
      title: resource.title,
      url: resource.url,
      type: resource.type
    }))
    .slice(0, 3); // Limit to 3 resources
}

/**
 * Generate fallback resources if API call fails
 */
function generateFallbackResources(skill: string): Resource[] {
  const skillLower = skill.toLowerCase();
  
  if (skillLower.includes("python")) {
    return [
      {
        title: "Learn Python - Full Course for Beginners",
        url: "https://www.youtube.com/watch?v=rfscVS0vtbw",
        type: "Video"
      },
      {
        title: "Python for Everybody - Free Course",
        url: "https://www.py4e.com/",
        type: "Course"
      }
    ];
  }
  
  if (skillLower.includes("system design")) {
    return [
      {
        title: "System Design Primer",
        url: "https://github.com/donnemartin/system-design-primer",
        type: "GitHub"
      },
      {
        title: "Grokking System Design",
        url: "https://www.educative.io/courses/grokking-modern-system-design-interview-for-engineers-managers",
        type: "Course"
      }
    ];
  }
  
  // Default resources for any skill
  return [
    {
      title: `${skill} - Free tutorials and resources`,
      url: "https://www.freecodecamp.org/",
      type: "Course"
    },
    {
      title: `Learning ${skill} on GitHub`,
      url: "https://github.com/topics/learning-resources",
      type: "GitHub"
    }
  ];
}
