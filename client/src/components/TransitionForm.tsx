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
      const res = await apiRequest("POST", "/api/submit", values);
      return res.json();
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
        description: error instanceof Error ? error.message : "An error occurred",
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
        <h2 className="text-xl font-heading font-semibold mb-6">
          Plan Your Career Transition
        </h2>

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
                    <span>Analyze Career Path</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
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
