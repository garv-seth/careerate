import { Router } from 'express';
import { z } from 'zod';
import { sendContactEmail, sendPartnershipEmail } from './email';

const router = Router();

// Schema validation for contact form
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

// Schema validation for partnership form
const partnershipFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid email is required"),
  companySize: z.string().min(1, "Company size is required"),
  partnershipType: z.string().min(1, "Partnership type is required"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

// Contact form submission route
router.post('/contact', async (req, res) => {
  try {
    // Validate form data
    const validatedData = contactFormSchema.parse(req.body);
    
    // Send email
    const success = await sendContactEmail(
      validatedData.name,
      validatedData.email,
      validatedData.message
    );
    
    if (success) {
      res.json({
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!'
      });
    } else {
      throw new Error('Failed to send email');
    }
  } catch (error) {
    console.error('Error in contact form submission:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid form data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
});

// Partnership form submission route
router.post('/partnership', async (req, res) => {
  try {
    // Validate form data
    const validatedData = partnershipFormSchema.parse(req.body);
    
    // Send email
    const success = await sendPartnershipEmail(
      validatedData.companyName,
      validatedData.contactName,
      validatedData.contactEmail,
      validatedData.companySize,
      validatedData.partnershipType,
      validatedData.message
    );
    
    if (success) {
      res.json({
        success: true,
        message: 'Your partnership request has been submitted successfully. Our team will contact you shortly!'
      });
    } else {
      throw new Error('Failed to send partnership request');
    }
  } catch (error) {
    console.error('Error in partnership form submission:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid form data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
});

export default router;