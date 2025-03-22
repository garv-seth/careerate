import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

// Define steps in the onboarding process
const ONBOARDING_STEPS = ["Welcome", "Basic Info", "Current Role", "Skills", "Complete"];

// Schema for basic info
const basicInfoSchema = z.object({
  bio: z.string().optional(),
  goals: z.string().min(1, "Please share your career goals"),
  experienceYears: z.number().int().min(0).optional(),
  education: z.string().optional()
});

// Schema for current role
const currentRoleSchema = z.object({
  currentRole: z.string().min(1, "Please select your current role")
});

// Schema for skills
const skillSchema = z.object({
  skillName: z.string().min(1, "Skill name is required"),
  proficiencyLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]).optional(),
  yearsOfExperience: z.number().int().min(0).optional()
});

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;
type CurrentRoleFormValues = z.infer<typeof currentRoleSchema>;
type SkillFormValues = z.infer<typeof skillSchema>;

type UserSkill = {
  id: number;
  skillName: string;
  proficiencyLevel?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  yearsOfExperience?: number;
};

const OnboardingWizard = () => {
  // Router and Toast hooks
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempSkills, setTempSkills] = useState<UserSkill[]>([]);
  const [skillIdCounter, setSkillIdCounter] = useState(0);

  // Calculate progress percentage
  const progressPercentage = Math.round((currentStep / (ONBOARDING_STEPS.length - 1)) * 100);

  // Check if user is authenticated
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    onError: () => {
      toast({
        title: "Authentication Error",
        description: "Please log in to continue the onboarding process",
        variant: "destructive"
      });
      navigate("/login");
    }
  });

  // Forms
  const basicInfoForm = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      bio: "",
      goals: "",
      experienceYears: 0,
      education: ""
    }
  });

  const currentRoleForm = useForm<CurrentRoleFormValues>({
    resolver: zodResolver(currentRoleSchema),
    defaultValues: {
      currentRole: ""
    }
  });

  const skillForm = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      skillName: "",
      proficiencyLevel: "Beginner",
      yearsOfExperience: 0
    }
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data: BasicInfoFormValues) => {
      return apiRequest("/api/auth/profile", {
        method: "PUT",
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setCurrentStep(currentStep + 1);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: CurrentRoleFormValues) => {
      return apiRequest("/api/auth/current-role", {
        method: "PUT",
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setCurrentStep(currentStep + 1);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update your current role. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addSkillMutation = useMutation({
    mutationFn: async (data: SkillFormValues) => {
      return apiRequest("/api/auth/skills", {
        method: "POST",
        data
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      skillForm.reset({
        skillName: "",
        proficiencyLevel: "Beginner",
        yearsOfExperience: 0
      });
    },
    onError: () => {
      toast({
        title: "Failed to Add Skill",
        description: "Could not add your skill. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Form submission handlers
  const onBasicInfoSubmit = async (data: BasicInfoFormValues) => {
    setIsSubmitting(true);
    await updateProfileMutation.mutateAsync(data);
    setIsSubmitting(false);
  };

  const onCurrentRoleSubmit = async (data: CurrentRoleFormValues) => {
    setIsSubmitting(true);
    await updateRoleMutation.mutateAsync(data);
    setIsSubmitting(false);
  };

  const onSkillSubmit = async (data: SkillFormValues) => {
    setIsSubmitting(true);
    // In onboarding, first collect skills temporarily
    const newSkill = {
      id: -1 * (skillIdCounter + 1), // Use negative IDs for temp skills
      skillName: data.skillName,
      proficiencyLevel: data.proficiencyLevel,
      yearsOfExperience: data.yearsOfExperience
    };
    
    setTempSkills([...tempSkills, newSkill]);
    setSkillIdCounter(skillIdCounter + 1);
    
    skillForm.reset({
      skillName: "",
      proficiencyLevel: "Beginner",
      yearsOfExperience: 0
    });
    
    setIsSubmitting(false);
  };

  const saveAllSkills = async () => {
    setIsSubmitting(true);
    
    try {
      // Save all collected skills
      for (const skill of tempSkills) {
        await addSkillMutation.mutateAsync({
          skillName: skill.skillName,
          proficiencyLevel: skill.proficiencyLevel,
          yearsOfExperience: skill.yearsOfExperience
        });
      }
      
      setCurrentStep(currentStep + 1);
      toast({
        title: "Skills Saved",
        description: `${tempSkills.length} skill${tempSkills.length !== 1 ? 's' : ''} added to your profile`,
      });
    } catch (error) {
      toast({
        title: "Error Saving Skills",
        description: "There was a problem saving your skills. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeTempSkill = (skillId: number) => {
    setTempSkills(tempSkills.filter(skill => skill.id !== skillId));
  };

  const getProficiencyColor = (level?: string) => {
    switch (level) {
      case 'Beginner': return 'bg-blue-500';
      case 'Intermediate': return 'bg-green-500';
      case 'Advanced': return 'bg-purple-500';
      case 'Expert': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Skip to the next step (used for steps without form submissions)
  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  // Go back to the previous step
  const handleBack = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const finishOnboarding = () => {
    toast({
      title: "Onboarding Complete!",
      description: "Your profile is now set up and you're ready to explore career transitions.",
    });
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-surface-light rounded-lg"></div>
            <div className="h-72 bg-surface-light rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="w-full max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-primary">Set Up Your Profile</h1>
          <p className="text-text-secondary mb-4">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}: <span className="font-medium text-text">{ONBOARDING_STEPS[currentStep]}</span>
          </p>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <Card className="bg-surface border-primary/20 shadow-glow">
          {/* Welcome Step */}
          {currentStep === 0 && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Welcome to Careerate!</CardTitle>
                <CardDescription>
                  Let's set up your profile to personalize your career transition experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Over the next few steps, we'll collect some basic information about you, 
                  your current role, and your skills. This will help us provide personalized 
                  career transition recommendations and insights.
                </p>
                <div className="bg-surface-light p-4 rounded-lg border border-primary/10">
                  <h3 className="font-medium mb-2">Here's what we'll cover:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Your basic information and career goals</li>
                    <li>Your current professional role</li>
                    <li>Your existing skills and experience levels</li>
                  </ul>
                </div>
                <p>
                  It should only take about 2-3 minutes to complete. Let's get started!
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigate("/")}>
                  Skip for Now
                </Button>
                <Button onClick={handleNext}>
                  Let's Start
                </Button>
              </CardFooter>
            </>
          )}

          {/* Basic Info Step */}
          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Tell us about yourself and your career goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...basicInfoForm}>
                  <form id="basic-info-form" onSubmit={basicInfoForm.handleSubmit(onBasicInfoSubmit)} className="space-y-6">
                    <FormField
                      control={basicInfoForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Bio (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Briefly describe your professional background and experience"
                              className="min-h-[120px] bg-surface-light border-primary/20 focus-visible:ring-primary"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={basicInfoForm.control}
                      name="goals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Career Goals</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What are your career aspirations and goals?"
                              className="min-h-[120px] bg-surface-light border-primary/20 focus-visible:ring-primary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={basicInfoForm.control}
                        name="experienceYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Years of Experience</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                className="bg-surface-light border-primary/20 focus-visible:ring-primary"
                                {...field}
                                onChange={e => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={basicInfoForm.control}
                        name="education"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Education (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Highest degree or certification"
                                className="bg-surface-light border-primary/20 focus-visible:ring-primary"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button 
                  type="submit"
                  form="basic-info-form"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Continue"}
                </Button>
              </CardFooter>
            </>
          )}

          {/* Current Role Step */}
          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle>Current Role</CardTitle>
                <CardDescription>
                  Tell us about your current position
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...currentRoleForm}>
                  <form id="current-role-form" onSubmit={currentRoleForm.handleSubmit(onCurrentRoleSubmit)} className="space-y-6">
                    <FormField
                      control={currentRoleForm.control}
                      name="currentRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Role</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Software Engineer, Product Manager, Data Scientist"
                              className="bg-surface-light border-primary/20 focus-visible:ring-primary"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="bg-surface-light p-4 rounded-lg border border-primary/10">
                      <p className="text-sm text-text-secondary">
                        This information helps us analyze potential career transitions 
                        and identify skill gaps between your current role and target roles.
                      </p>
                    </div>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button 
                  type="submit"
                  form="current-role-form"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Continue"}
                </Button>
              </CardFooter>
            </>
          )}

          {/* Skills Step */}
          {currentStep === 3 && (
            <>
              <CardHeader>
                <CardTitle>Your Skills</CardTitle>
                <CardDescription>
                  Add skills to help us analyze gaps for your target roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Added Skills */}
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-4">Skills Added</h3>
                    {tempSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {tempSkills.map((skill) => (
                          <Badge 
                            key={skill.id} 
                            variant="outline"
                            className="py-2 px-3 rounded-md bg-surface-light border-primary/30 hover:bg-surface-light group"
                          >
                            <span className="flex items-center">
                              <span className={`w-2 h-2 rounded-full mr-2 ${getProficiencyColor(skill.proficiencyLevel)}`} />
                              {skill.skillName}
                              {skill.yearsOfExperience && ` (${skill.yearsOfExperience} yr${skill.yearsOfExperience !== 1 ? 's' : ''})`}
                              <button 
                                className="ml-2 opacity-50 hover:opacity-100 focus:opacity-100 transition-opacity"
                                onClick={() => removeTempSkill(skill.id)}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-secondary mb-6">No skills added yet. Start adding your skills below.</p>
                    )}
                  </div>
                  
                  <Separator className="my-6 bg-primary/10" />
                  
                  <h3 className="text-lg font-medium mb-4">Add a New Skill</h3>
                  <Form {...skillForm}>
                    <form id="skill-form" onSubmit={skillForm.handleSubmit(onSkillSubmit)} className="space-y-6">
                      <FormField
                        control={skillForm.control}
                        name="skillName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skill Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., JavaScript, Python, Project Management"
                                className="bg-surface-light border-primary/20 focus-visible:ring-primary"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={skillForm.control}
                          name="proficiencyLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Proficiency Level</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-surface-light border-primary/20 focus:ring-primary">
                                    <SelectValue placeholder="Select level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Beginner">Beginner</SelectItem>
                                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                                  <SelectItem value="Advanced">Advanced</SelectItem>
                                  <SelectItem value="Expert">Expert</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={skillForm.control}
                          name="yearsOfExperience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Years of Experience</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  className="bg-surface-light border-primary/20 focus-visible:ring-primary"
                                  {...field}
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button 
                        type="submit"
                        variant="outline"
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Adding..." : "Add Skill"}
                      </Button>
                    </form>
                  </Form>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={saveAllSkills}
                  disabled={isSubmitting || tempSkills.length === 0}
                >
                  {isSubmitting ? "Saving..." : "Continue"}
                </Button>
              </CardFooter>
            </>
          )}

          {/* Complete Step */}
          {currentStep === 4 && (
            <>
              <CardHeader>
                <CardTitle>Setup Complete!</CardTitle>
                <CardDescription>
                  You're all set to start exploring career transitions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-center">Your profile has been set up successfully!</h3>
                
                <p className="text-center">
                  Now you can start exploring potential career transitions, 
                  analyze skill gaps, and get personalized recommendations.
                </p>
                
                <div className="bg-surface-light p-4 rounded-lg border border-primary/10 mt-4">
                  <h4 className="font-medium mb-2">What's Next?</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Explore career transitions from your current role</li>
                    <li>Discover skills you need to acquire for your target roles</li>
                    <li>Get personalized learning recommendations</li>
                    <li>Update your profile anytime from the Profile page</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={finishOnboarding} className="px-8">
                  Start Exploring
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OnboardingWizard;