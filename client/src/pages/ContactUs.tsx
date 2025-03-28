import React from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

// Define the schema for the contact form
const contactFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters' })
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const ContactUs: React.FC = () => {
  const { toast } = useToast();
  
  // Form definition using react-hook-form
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      message: ''
    }
  });
  
  const isSubmitting = form.formState.isSubmitting;
  
  // Handle form submission
  const onSubmit = async (data: ContactFormValues) => {
    try {
      const response = await fetch('/api/email/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Message Sent!',
          description: result.message || 'Your message has been sent successfully.',
          variant: 'default'
        });
        form.reset();
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text mb-6">
            Contact Us
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto text-lg">
            Have questions about Careerate or need assistance with your career transition journey? We're here to help!
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative border border-primary/20 rounded-2xl p-8 bg-card/30 backdrop-blur-sm">
              <div className="absolute inset-0 bg-cyber-grid bg-30 opacity-5 rounded-2xl"></div>
              
              <h2 className="text-2xl font-semibold mb-4 text-text relative z-10">Get in Touch</h2>
              <p className="text-text-secondary mb-6 relative z-10">
                Fill out the form and our team will get back to you as soon as possible.
              </p>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="relative z-10 space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Your email address" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="How can we help you with your career transition?" 
                            className="min-h-32"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </Form>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="h-full flex flex-col justify-center">
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-text">Email</h3>
                  <p className="text-text-secondary">
                    <a href="mailto:support@gocareerate.com" className="hover:text-primary transition-colors">
                      support@gocareerate.com
                    </a>
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-text">Our Location</h3>
                  <p className="text-text-secondary">
                    Seattle, WA<br />
                    United States
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-text">Follow Us</h3>
                  <div className="flex space-x-4">
                    <a 
                      href="https://www.linkedin.com/in/garvseth" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-primary transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                        <rect x="2" y="9" width="4" height="12"></rect>
                        <circle cx="4" cy="4" r="2"></circle>
                      </svg>
                    </a>
                    
                    <a 
                      href="https://x.com/SethGarv24824" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-primary transition-colors"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" 
                          fill="currentColor" />
                      </svg>
                    </a>
                    
                    <a 
                      href="https://www.instagram.com/isgarv" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-primary transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </a>
                  </div>
                </div>
                
                <div className="relative border border-primary/20 rounded-2xl p-6 bg-card/40 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-cyber-grid bg-30 opacity-5 rounded-2xl"></div>
                  <h3 className="text-xl font-semibold mb-2 text-text relative z-10">Quick Response</h3>
                  <p className="text-text-secondary relative z-10">
                    We typically respond to inquiries within 24 hours during business days. For urgent matters, please include "Urgent" in your message subject.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;