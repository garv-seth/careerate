import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Use API call instead of direct import
// import { formatRoleWithLevel } from "@shared/companyData";

// Updated form schema for structured inputs
const formSchema = z.object({
  // Fields for structured selection
  currentCompanyId: z.string().min(1, "Please select a company"),
  currentRoleId: z.string().min(1, "Please select a role"),
  currentLevelId: z.string().min(1, "Please select a level"),
  
  targetCompanyId: z.string().min(1, "Please select a company"),
  targetRoleId: z.string().min(1, "Please select a role"),
  targetLevelId: z.string().min(1, "Please select a level"),
  
  // Original fields used for API compatibility
  currentRole: z.string().min(2, "Please enter your current role"),
  targetRole: z.string().min(2, "Please enter your target role"),
});

type FormValues = z.infer<typeof formSchema>;

const TransitionForm: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State for cascading dropdowns
  const [currentCompanyId, setCurrentCompanyId] = useState<string>("");
  const [currentRoleId, setCurrentRoleId] = useState<string>("");
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");
  const [targetRoleId, setTargetRoleId] = useState<string>("");

  // Fetch companies
  const { data: companiesData } = useQuery({
    queryKey: ["/api/companies"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
  
  const companies = companiesData?.data || [];

  // Fetch roles based on selected company
  const { data: currentRolesData } = useQuery({
    queryKey: ["/api/companies", currentCompanyId, "roles"],
    enabled: !!currentCompanyId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
  
  const currentRoles = currentRolesData?.data || [];
  
  // Fetch roles based on selected target company
  const { data: targetRolesData } = useQuery({
    queryKey: ["/api/companies", targetCompanyId, "roles"],
    enabled: !!targetCompanyId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
  
  const targetRoles = targetRolesData?.data || [];
  
  // Fetch levels based on selected current role
  const { data: currentLevelsData } = useQuery({
    queryKey: ["/api/companies", currentCompanyId, "roles", currentRoleId, "levels"],
    enabled: !!currentCompanyId && !!currentRoleId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
  
  const currentLevels = currentLevelsData?.data || [];
  
  // Fetch levels based on selected target role
  const { data: targetLevelsData } = useQuery({
    queryKey: ["/api/companies", targetCompanyId, "roles", targetRoleId, "levels"],
    enabled: !!targetCompanyId && !!targetRoleId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
  
  const targetLevels = targetLevelsData?.data || [];

  // Setup form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentCompanyId: "",
      currentRoleId: "",
      currentLevelId: "",
      targetCompanyId: "",
      targetRoleId: "",
      targetLevelId: "",
      currentRole: "",
      targetRole: "",
    },
  });
  
  // Watch form values to trigger cascading effects
  const watchCurrentCompanyId = form.watch("currentCompanyId");
  const watchCurrentRoleId = form.watch("currentRoleId");
  const watchTargetCompanyId = form.watch("targetCompanyId");
  const watchTargetRoleId = form.watch("targetRoleId");
  
  // Reset dependent fields when parent selection changes
  useEffect(() => {
    if (watchCurrentCompanyId !== currentCompanyId) {
      setCurrentCompanyId(watchCurrentCompanyId);
      form.setValue("currentRoleId", "");
      form.setValue("currentLevelId", "");
    }
  }, [watchCurrentCompanyId, currentCompanyId, form]);
  
  useEffect(() => {
    if (watchCurrentRoleId !== currentRoleId) {
      setCurrentRoleId(watchCurrentRoleId);
      form.setValue("currentLevelId", "");
    }
  }, [watchCurrentRoleId, currentRoleId, form]);
  
  useEffect(() => {
    if (watchTargetCompanyId !== targetCompanyId) {
      setTargetCompanyId(watchTargetCompanyId);
      form.setValue("targetRoleId", "");
      form.setValue("targetLevelId", "");
    }
  }, [watchTargetCompanyId, targetCompanyId, form]);
  
  useEffect(() => {
    if (watchTargetRoleId !== targetRoleId) {
      setTargetRoleId(watchTargetRoleId);
      form.setValue("targetLevelId", "");
    }
  }, [watchTargetRoleId, targetRoleId, form]);
  
  // Types for the API responses
  interface FormatRoleResponse {
    success: boolean;
    formattedRole: string;
    error?: string;
  }

  // Format the current role string using API
  const { data: currentRoleFormat } = useQuery<FormatRoleResponse>({
    queryKey: ["/api/format-role", watchCurrentCompanyId, watchCurrentRoleId, form.watch("currentLevelId")],
    enabled: !!watchCurrentCompanyId && !!watchCurrentRoleId && !!form.watch("currentLevelId"),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
  
  // Format the target role string using API
  const { data: targetRoleFormat } = useQuery<FormatRoleResponse>({
    queryKey: ["/api/format-role", watchTargetCompanyId, watchTargetRoleId, form.watch("targetLevelId")],
    enabled: !!watchTargetCompanyId && !!watchTargetRoleId && !!form.watch("targetLevelId"),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Update form values when formatted roles are received
  useEffect(() => {
    if (currentRoleFormat?.success && currentRoleFormat.formattedRole) {
      form.setValue("currentRole", currentRoleFormat.formattedRole);
    }
  }, [currentRoleFormat, form]);
  
  useEffect(() => {
    if (targetRoleFormat?.success && targetRoleFormat.formattedRole) {
      form.setValue("targetRole", targetRoleFormat.formattedRole);
    }
  }, [targetRoleFormat, form]);

  // Submit handler
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      try {
        // We only need to send the formatted role strings to the backend
        return await apiRequest("/api/transitions", {
          method: "POST",
          data: {
            currentRole: values.currentRole,
            targetRole: values.targetRole
          }
        });
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
            {/* Current Role Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg text-secondary-foreground">Your Current Role</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current Company */}
                <FormField
                  control={form.control}
                  name="currentCompanyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-secondary">Company</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map(company => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Current Role */}
                <FormField
                  control={form.control}
                  name="currentRoleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-secondary">Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!currentCompanyId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentRoles.map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Current Level */}
                <FormField
                  control={form.control}
                  name="currentLevelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-secondary">Level</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!currentRoleId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentLevels.map(level => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Target Role Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg text-secondary-foreground">Your Target Role</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Target Company */}
                <FormField
                  control={form.control}
                  name="targetCompanyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-secondary">Company</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map(company => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Target Role */}
                <FormField
                  control={form.control}
                  name="targetRoleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-secondary">Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!targetCompanyId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetRoles.map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Target Level */}
                <FormField
                  control={form.control}
                  name="targetLevelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-text-secondary">Level</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!targetRoleId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetLevels.map(level => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Hidden fields for API compatibility */}
              <input type="hidden" {...form.register("currentRole")} />
              <input type="hidden" {...form.register("targetRole")} />
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
