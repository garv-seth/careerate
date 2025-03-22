import { storage } from '../storage';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Process resume text with Google Gemini
 * Extracts skills from the resume text
 */
export async function extractSkillsFromResume(resumeText: string, userId: number): Promise<string[]> {
  try {
    // Check if API key is set
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      return [];
    }
    
    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Create the prompt for skill extraction
    const prompt = `
      Extract the top 10 technical and professional skills from this resume. 
      Focus on hard skills that are most relevant for tech and professional jobs.
      Return only a comma-separated list of skills, nothing else.
      
      Resume text:
      ${resumeText}
    `;
    
    // Get the response from Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Split and clean up the skills
    const skills = text
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill && skill.length > 0);
    
    // Limit to top 10 skills
    const topSkills = skills.slice(0, 10);
    
    // Save skills to database
    await saveExtractedSkills(topSkills, userId);
    
    return topSkills;
  } catch (error) {
    console.error('Error extracting skills from resume:', error);
    return [];
  }
}

/**
 * Save extracted skills to the database
 */
async function saveExtractedSkills(skills: string[], userId: number): Promise<void> {
  try {
    // Delete existing skills for user
    await storage.deleteUserSkillsByUserId(userId);
    
    // Add each skill to the database
    for (const skillName of skills) {
      await storage.createUserSkill({
        userId,
        skillName,
        proficiencyLevel: 'Intermediate', // Default level
        verified: true // Mark as verified since it's from a resume
      });
    }
  } catch (error) {
    console.error('Error saving extracted skills:', error);
  }
}

/**
 * Save resume URL to user profile
 */
export async function saveResumeUrl(userId: number, resumeUrl: string): Promise<void> {
  try {
    // Check if profile exists
    const profile = await storage.getProfile(userId);
    
    if (profile) {
      // Update existing profile
      await storage.updateProfile(userId, { resumeUrl });
    } else {
      // Create new profile
      await storage.createProfile({
        userId,
        resumeUrl
      });
    }
  } catch (error) {
    console.error('Error saving resume URL:', error);
  }
}