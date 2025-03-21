import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "placeholder-key" 
});

/**
 * Generate a development plan with milestones using OpenAI
 * @param currentRole User's current role
 * @param targetRole User's target role
 * @param skills Array of skills to focus on
 * @returns Array of milestone objects
 */
export async function generatePlan(
  currentRole: string, 
  targetRole: string, 
  skills: string[]
): Promise<any[]> {
  try {
    console.log(`Generating plan for transition: ${currentRole} → ${targetRole}`);
    console.log("Skills to focus on:", skills);

    const skillsText = skills.join(", ");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a career development expert who creates actionable, realistic development plans.
            Create a development plan with 3-5 milestones to help someone transition from one tech role to another.
            Focus specifically on addressing skill gaps and creating achievable milestones.
            For each milestone, provide:
            1. A clear title
            2. A brief description
            3. Priority level (High, Medium, Low)
            4. Duration in weeks (2-6 weeks per milestone)
            
            The milestones should be ordered by priority and dependency.
            Respond in JSON format with an array of milestone objects.`
        },
        {
          role: "user",
          content: `I want to transition from ${currentRole} to ${targetRole}.
            The key skills I need to develop are: ${skillsText}.
            Please create a development plan with 3-5 milestones that would help me make this transition successfully.
            Each milestone should focus on one or more of these skills and include concrete actions I can take.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const responseContent = response.choices[0].message.content;
    const parsedResponse = JSON.parse(responseContent);
    
    if (Array.isArray(parsedResponse.milestones)) {
      return parsedResponse.milestones;
    } else if (Array.isArray(parsedResponse)) {
      return parsedResponse;
    } else {
      console.error("Unexpected response format from OpenAI:", parsedResponse);
      return [];
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    
    // Return fallback milestones on error
    return [
      {
        title: "Learn Core Concepts",
        description: `Study the fundamentals of skills needed for ${targetRole}`,
        priority: "High",
        durationWeeks: 4
      },
      {
        title: "Practice Through Projects",
        description: "Apply learned skills through hands-on projects",
        priority: "Medium",
        durationWeeks: 3
      },
      {
        title: "Prepare for Interviews",
        description: "Study common interview questions and practice responses",
        priority: "High",
        durationWeeks: 2
      }
    ];
  }
}
