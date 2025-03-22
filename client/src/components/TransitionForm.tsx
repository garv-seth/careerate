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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Type definitions for API responses
interface Company {
  id: string;
  name: string;
}

interface Role {
  id: string;
  title: string;
}

interface Level {
  id: string;
  name: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
}

interface FormatRoleResponse {
  success: boolean;
  formattedRole: string;
  error?: string;
}

// The form schema
const formSchema = z.object({
  currentCompanyId: z.string().min(1, "Please select a company"),
  currentRoleId: z.string().min(1, "Please select a role"),
  currentLevelId: z.string().min(1, "Please select a level"),
  
  targetCompanyId: z.string().min(1, "Please select a company"),
  targetRoleId: z.string().min(1, "Please select a role"),
  targetLevelId: z.string().min(1, "Please select a level"),
  
  // These fields are computed from the selections above
  currentRole: z.string().min(2, "Current role is required"),
  targetRole: z.string().min(2, "Target role is required"),
});

type FormValues = z.infer<typeof formSchema>;

const TransitionForm: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Form setup
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
  
  // Watch form values to enable cascading select fields
  const currentCompanyId = form.watch("currentCompanyId");
  const currentRoleId = form.watch("currentRoleId");
  const targetCompanyId = form.watch("targetCompanyId");
  const targetRoleId = form.watch("targetRoleId");
  
  // Fetch all companies
  const { data: companiesResponse } = useQuery<ApiResponse<Company>>({
    queryKey: ["/api/companies"],
  });
  
  const companies = companiesResponse?.data || [];
  
  // Fetch roles for current company
  const { data: currentRolesResponse } = useQuery<ApiResponse<Role>>({
    queryKey: ["/api/companies", currentCompanyId, "roles"],
    enabled: !!currentCompanyId,
  });
  
  const currentRoles = currentRolesResponse?.data || [];
  
  console.log("Current company ID:", currentCompanyId);
  // We're debugging the API response and data extraction
  console.log("Current roles response:", currentRolesResponse);
  console.log("Current roles data:", currentRolesResponse?.data);
  console.log("Current roles mapped:", currentRoles);
  
  // Fetch roles for target company
  const { data: targetRolesResponse } = useQuery<ApiResponse<Role>>({
    queryKey: ["/api/companies", targetCompanyId, "roles"],
    enabled: !!targetCompanyId,
  });
  
  const targetRoles = targetRolesResponse?.data || [];
  
  // Fetch levels for current role
  const { data: currentLevelsResponse } = useQuery<ApiResponse<Level>>({
    queryKey: ["/api/companies", currentCompanyId, "roles", currentRoleId, "levels"],
    enabled: !!currentCompanyId && !!currentRoleId,
  });
  
  const currentLevels = currentLevelsResponse?.data || [];
  
  console.log("Current role ID:", currentRoleId);
  console.log("Current levels:", currentLevels);
  
  // Fetch levels for target role
  const { data: targetLevelsResponse } = useQuery<ApiResponse<Level>>({
    queryKey: ["/api/companies", targetCompanyId, "roles", targetRoleId, "levels"],
    enabled: !!targetCompanyId && !!targetRoleId,
  });
  
  const targetLevels = targetLevelsResponse?.data || [];
  
  // Reset dependent fields when a parent field changes
  useEffect(() => {
    if (currentCompanyId) {
      form.setValue("currentRoleId", "");
      form.setValue("currentLevelId", "");
    }
  }, [currentCompanyId, form]);
  
  useEffect(() => {
    if (currentRoleId) {
      form.setValue("currentLevelId", "");
    }
  }, [currentRoleId, form]);
  
  useEffect(() => {
    if (targetCompanyId) {
      form.setValue("targetRoleId", "");
      form.setValue("targetLevelId", "");
    }
  }, [targetCompanyId, form]);
  
  useEffect(() => {
    if (targetRoleId) {
      form.setValue("targetLevelId", "");
    }
  }, [targetRoleId, form]);
  
  // Format current role when all selections are made
  const currentLevelId = form.watch("currentLevelId");
  const { data: currentRoleFormat } = useQuery<FormatRoleResponse>({
    queryKey: ["/api/format-role", currentCompanyId, currentRoleId, currentLevelId],
    enabled: !!currentCompanyId && !!currentRoleId && !!currentLevelId,
  });
  
  // Format target role when all selections are made
  const targetLevelId = form.watch("targetLevelId");
  const { data: targetRoleFormat } = useQuery<FormatRoleResponse>({
    queryKey: ["/api/format-role", targetCompanyId, targetRoleId, targetLevelId],
    enabled: !!targetCompanyId && !!targetRoleId && !!targetLevelId,
  });
  
  // Update hidden fields when formatted roles are available
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
  
  // Submit the form
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // We only need to send the formatted roles
      return await apiRequest("/api/transitions", {
        method: "POST",
        data: {
          currentRole: values.currentRole,
          targetRole: values.targetRole
        }
      });
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
    console.log("Submitting form with data:", data);
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
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset dependent fields
                          form.setValue("currentRoleId", "");
                          form.setValue("currentLevelId", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
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
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset level when role changes
                          form.setValue("currentLevelId", "");
                        }} 
                        value={field.value}
                        disabled={!currentCompanyId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentRoles.map((role) => (
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
                        value={field.value}
                        disabled={!currentRoleId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentLevels.map((level) => (
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
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset dependent fields
                          form.setValue("targetRoleId", "");
                          form.setValue("targetLevelId", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
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
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset level when role changes
                          form.setValue("targetLevelId", "");
                        }} 
                        value={field.value}
                        disabled={!targetCompanyId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetRoles.map((role) => (
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
                        value={field.value}
                        disabled={!targetRoleId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {targetLevels.map((level) => (
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
                disabled={mutation.isPending || 
                  !form.formState.isValid || 
                  !currentCompanyId || 
                  !currentRoleId || 
                  !currentLevelId || 
                  !targetCompanyId || 
                  !targetRoleId || 
                  !targetLevelId}
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