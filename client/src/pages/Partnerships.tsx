import React from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define the schema for the partnership form
const partnershipFormSchema = z.object({
  companyName: z.string().min(1, { message: 'Company name is required' }),
  contactName: z.string().min(1, { message: 'Contact name is required' }),
  contactEmail: z.string().email({ message: 'Invalid email address' }),
  companySize: z.string().min(1, { message: 'Company size is required' }),
  partnershipType: z.string().min(1, { message: 'Partnership type is required' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters' })
});

type PartnershipFormValues = z.infer<typeof partnershipFormSchema>;

const Partnerships: React.FC = () => {
  const { toast } = useToast();
  
  // Form definition using react-hook-form
  const form = useForm<PartnershipFormValues>({
    resolver: zodResolver(partnershipFormSchema),
    defaultValues: {
      companyName: '',
      contactName: '',
      contactEmail: '',
      companySize: '',
      partnershipType: '',
      message: ''
    }
  });
  
  const isSubmitting = form.formState.isSubmitting;
  
  // Handle form submission
  const onSubmit = async (data: PartnershipFormValues) => {
    try {
      const response = await fetch('/api/email/partnership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Partnership Request Sent!',
          description: result.message || 'Your partnership request has been submitted successfully.',
          variant: 'default'
        });
        form.reset();
      } else {
        throw new Error(result.error || 'Failed to send partnership request');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send partnership request',
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
            Partner With Careerate
          </h1>
          <p className="text-text-secondary max-w-3xl mx-auto text-lg">
            Join our ecosystem of innovative companies, recruiters, and educational institutions 
            helping professionals successfully navigate career transitions.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="relative border border-primary/20 rounded-2xl p-8 bg-card/30 backdrop-blur-sm">
              <div className="absolute inset-0 bg-cyber-grid bg-30 opacity-5 rounded-2xl"></div>
              
              <h2 className="text-2xl font-semibold mb-4 text-text relative z-10">Partnership Request</h2>
              <p className="text-text-secondary mb-6 relative z-10">
                Fill out the form below to inquire about partnership opportunities with Careerate.
              </p>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="relative z-10 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Your email address" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Size</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select company size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-10">1-10 employees</SelectItem>
                              <SelectItem value="11-50">11-50 employees</SelectItem>
                              <SelectItem value="51-200">51-200 employees</SelectItem>
                              <SelectItem value="201-500">201-500 employees</SelectItem>
                              <SelectItem value="501-1000">501-1000 employees</SelectItem>
                              <SelectItem value="1001+">1001+ employees</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="partnershipType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Partnership Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select partnership type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="recruiting">Recruiting Partner</SelectItem>
                              <SelectItem value="education">Education Partner</SelectItem>
                              <SelectItem value="technology">Technology Partner</SelectItem>
                              <SelectItem value="content">Content Partner</SelectItem>
                              <SelectItem value="integration">Integration Partner</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tell us about your partnership idea</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your partnership idea and how we can collaborate..." 
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
                    {isSubmitting ? 'Submitting...' : 'Submit Partnership Request'}
                  </Button>
                </form>
              </Form>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="h-full flex flex-col space-y-6">
              <div className="relative border border-primary/20 rounded-2xl p-6 bg-card/40 backdrop-blur-sm">
                <div className="absolute inset-0 bg-cyber-grid bg-30 opacity-5 rounded-2xl"></div>
                <h3 className="text-xl font-semibold mb-3 text-text relative z-10">Why Partner With Us?</h3>
                <ul className="text-text-secondary space-y-3 relative z-10">
                  <li className="flex items-start">
                    <div className="mr-3 text-primary mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Access to our growing network of career transitioners</span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-3 text-primary mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>AI-powered matching for ideal candidates</span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-3 text-primary mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Co-branded content opportunities</span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-3 text-primary mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Integration with our skill-gap analysis tools</span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-3 text-primary mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Participation in career transition events</span>
                  </li>
                </ul>
              </div>

              <div className="relative border border-primary/20 rounded-2xl p-6 bg-card/40 backdrop-blur-sm">
                <div className="absolute inset-0 bg-cyber-grid bg-30 opacity-5 rounded-2xl"></div>
                <h3 className="text-xl font-semibold mb-3 text-text relative z-10">Partnership Types</h3>
                <div className="space-y-4 relative z-10">
                  <div>
                    <h4 className="font-medium text-text">Recruiting Partners</h4>
                    <p className="text-text-secondary text-sm">Connect with pre-qualified candidates making strategic career moves.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-text">Education Partners</h4>
                    <p className="text-text-secondary text-sm">Provide learning resources to help bridge skill gaps for career transitioners.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-text">Technology Partners</h4>
                    <p className="text-text-secondary text-sm">Integrate your tools with our platform to enhance user experience.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-text">Content Partners</h4>
                    <p className="text-text-secondary text-sm">Co-create valuable content to guide professionals through career changes.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Partnerships;