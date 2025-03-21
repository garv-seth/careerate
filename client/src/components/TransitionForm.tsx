import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Form schema
const formSchema = z.object({
  currentRole: z.string().min(2, "Please enter your current role"),
  targetRole: z.string().min(2, "Please enter your target role"),
});

type FormValues = z.infer<typeof formSchema>;

const TransitionForm: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Setup form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentRole: "",
      targetRole: "",
    },
  });

  // Submit handler
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      try {
        // Use the new endpoint that matches our backend route
        const res = await apiRequest("POST", "/api/transitions", values);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to submit transition");
        }
        return data;
      } catch (error) {
        console.error("Error submitting transition:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Success!",
          description: "Your career transition is being analyzed.",
        });
        setLocation(`/dashboard/${data.transitionId}`);
      } else {
        toast({
          title: "Error",
          description: data.error || "An error occurred",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit transition",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FormValues) {
    mutation.mutate(data);
  }

  return (
    <Card className="max-w-3xl mx-auto card rounded-xl shadow-glow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-semibold">
            Plan Your Career Transition
          </h2>
          <div className="flex items-center text-primary text-sm bg-primary/5 px-3 py-1.5 rounded-full">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="mr-1.5"
            >
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
            <span>Powered by Cara AI</span>
          </div>
        </div>
        
        <div className="text-sm mb-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="flex items-start">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="mr-2 mt-0.5 text-primary"
            >
              <path d="m7.7 11.4 4.1 2.2c.1 0 .2.1.3.1h.6l4.3-2.3c.2-.1.3-.1.5 0l3.5 2.2c.2.1.5 0 .6-.2.1-.1.1-.2.1-.3V6.8c0-.2-.1-.4-.1-.4l-3-1.8c-.1-.1-.3-.1-.5 0l-3.6 1.8c-.1.1-.3.1-.4.1h-.6L9.9 4.3c-.1-.1-.3-.1-.4 0l-3 1.8a.4.4 0 0 0-.2.4v6.5c0 .2.1.4.3.5.2.1.5 0 .6-.2l.5-.9" />
              <path d="M4.8 13.9c0 .9.5 1.4 1.4 1.4.4 0 .7-.1 1-.3l.7-.6" />
            </svg>
            <span>Cara will analyze your career transition using real-world data from the web, identify skill gaps, and create a personalized development plan with YouTube learning resources.</span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="currentRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-secondary">
                      Current Role
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-text-muted"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
                            <path d="M10 4a1 1 0 100 2 1 1 0 000-2zm0 7a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z" />
                          </svg>
                        </div>
                        <Input
                          className="pl-10"
                          placeholder="e.g., Microsoft Level 63"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-text-muted mt-1">
                      Include company and level if applicable
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-secondary">
                      Target Role
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-text-muted"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 110-12 6 6 0 010 12z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <Input
                          className="pl-10"
                          placeholder="e.g., Google L6"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-text-muted mt-1">
                      Be specific about company and level
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg shadow transition duration-200 flex items-center space-x-2"
              >
                {mutation.isPending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="mr-1.5"
                    >
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4"/>
                      <path d="M12 8h.01"/>
                    </svg>
                    <span>Let Cara Analyze My Path</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TransitionForm;
