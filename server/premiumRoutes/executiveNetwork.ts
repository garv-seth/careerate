import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';
import { insertEventRegistrationSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Get upcoming network events
router.get('/api/premium/network-events', isAuthenticated, async (req: any, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const events = await storage.getUpcomingNetworkEvents(limit);
    res.json(events);
  } catch (error) {
    console.error('Error fetching network events:', error);
    res.status(500).json({ message: 'Failed to fetch network events' });
  }
});

// Get a specific network event
router.get('/api/premium/network-events/:id', isAuthenticated, async (req: any, res) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const event = await storage.getNetworkEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ message: 'Failed to fetch event details' });
  }
});

// Register for an event
router.post('/api/premium/network-events/:id/register', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const eventId = parseInt(req.params.id);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    // Check if the event exists
    const event = await storage.getNetworkEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // TODO: Check if user is already registered for this event
    // This would be better with a unique constraint in the database

    // Validate request body
    const validatedData = insertEventRegistrationSchema.parse({
      eventId,
      userId,
      notes: req.body.notes || null
    });

    const registration = await storage.registerForEvent(validatedData);
    res.status(201).json(registration);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error registering for event:', error);
    res.status(500).json({ message: 'Failed to register for event' });
  }
});

// Get user's event registrations
router.get('/api/premium/my-events', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const registrations = await storage.getUserEventRegistrations(userId);
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching user event registrations:', error);
    res.status(500).json({ message: 'Failed to fetch event registrations' });
  }
});

// Get available mentorships
router.get('/api/premium/mentorships', isAuthenticated, async (req: any, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const mentorships = await storage.getAvailableMentorships(limit);
    res.json(mentorships);
  } catch (error) {
    console.error('Error fetching mentorships:', error);
    res.status(500).json({ message: 'Failed to fetch mentorships' });
  }
});

// Get a specific mentorship
router.get('/api/premium/mentorships/:id', isAuthenticated, async (req: any, res) => {
  try {
    const mentorshipId = parseInt(req.params.id);
    if (isNaN(mentorshipId)) {
      return res.status(400).json({ message: 'Invalid mentorship ID' });
    }

    const mentorship = await storage.getMentorshipById(mentorshipId);
    if (!mentorship) {
      return res.status(404).json({ message: 'Mentorship not found' });
    }

    res.json(mentorship);
  } catch (error) {
    console.error('Error fetching mentorship details:', error);
    res.status(500).json({ message: 'Failed to fetch mentorship details' });
  }
});

// Apply for a mentorship
router.post('/api/premium/mentorships/:id/apply', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const mentorshipId = parseInt(req.params.id);
    
    if (isNaN(mentorshipId)) {
      return res.status(400).json({ message: 'Invalid mentorship ID' });
    }

    const { goalsDescription } = req.body;
    if (!goalsDescription) {
      return res.status(400).json({ message: 'Goals description is required' });
    }

    // Check if the mentorship exists and has available slots
    const mentorship = await storage.getMentorshipById(mentorshipId);
    if (!mentorship) {
      return res.status(404).json({ message: 'Mentorship not found' });
    }

    if (!mentorship.isActive || mentorship.availableSlots <= 0) {
      return res.status(400).json({ message: 'This mentorship is no longer available' });
    }

    // Submit application
    const application = await storage.applyForMentorship({
      mentorshipId,
      userId,
      goalsDescription
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Error applying for mentorship:', error);
    res.status(500).json({ message: 'Failed to apply for mentorship' });
  }
});

// Get user's mentorship applications
router.get('/api/premium/my-mentorship-applications', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const applications = await storage.getUserMentorshipApplications(userId);
    res.json(applications);
  } catch (error) {
    console.error('Error fetching mentorship applications:', error);
    res.status(500).json({ message: 'Failed to fetch mentorship applications' });
  }
});

// Generate networking recommendations using AI
router.post('/api/premium/networking-recommendations', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { targetRole, industry } = req.body;
    
    if (!targetRole || !industry) {
      return res.status(400).json({ message: 'Target role and industry are required' });
    }

    // Get user's profile and resume
    const profile = await storage.getProfileByUserId(userId);
    if (!profile?.resumeText) {
      return res.status(400).json({ message: 'No resume found. Please upload your resume first.' });
    }

    // Import the Perplexity API client to help generate content
    const { queryPerplexity } = await import('../../src/agents/perplexity');

    // Generate networking recommendations with AI
    const prompt = `
      You are an executive networking coach. Based on the following resume, create personalized networking recommendations for someone targeting the role of "${targetRole}" in the "${industry}" industry.
      
      RESUME:
      ${profile.resumeText}
      
      Your response should be in this JSON format:
      {
        "recommendedApproaches": [
          {
            "title": "Strategy title",
            "description": "Detailed description of networking approach",
            "benefits": "Why this approach is effective",
            "actionItems": ["Specific action 1", "Specific action 2"]
          }
        ],
        "topExecutivesToConnect": [
          {
            "name": "Executive name",
            "title": "Job title",
            "company": "Company name",
            "reason": "Why this connection would be valuable",
            "approachStrategy": "How to reach out to this person"
          }
        ],
        "eventsToAttend": [
          {
            "name": "Event name",
            "type": "Event type (conference, meetup, etc.)",
            "focusArea": "Main topic focus",
            "benefit": "Why this event is valuable",
            "timing": "When to attend"
          }
        ],
        "conversationStarters": [
          {
            "context": "Context for the conversation",
            "opener": "Opening line",
            "followUp": "Follow-up question"
          }
        ]
      }

      Ensure your response is ONLY valid JSON without any explanations or preamble.
    `;

    // Use Perplexity API to generate a personalized networking strategy
    const result = await queryPerplexity(prompt);
    
    try {
      // Parse the JSON response
      const networkingRecommendations = JSON.parse(result);
      res.json(networkingRecommendations);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      res.status(500).json({ message: 'Failed to generate networking recommendations', error: 'Invalid response from AI service' });
    }
  } catch (error) {
    console.error('Error generating networking recommendations:', error);
    res.status(500).json({ message: 'Failed to generate networking recommendations' });
  }
});

export default router;