import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

// Form validation schema for profile
const profileSchema = z.object({
  bio: z.string().optional(),
  goals: z.string().optional(),
  experienceYears: z.number().int().min(0).optional(),
  education: z.string().optional()
});

// Form validation schema for skills
const skillSchema = z.object({
  skillName: z.string().min(1, "Skill name is required"),
  proficiencyLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]).optional(),
  yearsOfExperience: z.number().int().min(0).optional()
});

// Form validation schema for current role
const roleSchema = z.object({
  currentRole: z.string().min(1, "Current role is required")
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SkillFormValues = z.infer<typeof skillSchema>;
type RoleFormValues = z.infer<typeof roleSchema>;

type UserSkill = {
  id: number;
  skillName: string;
  proficiencyLevel?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  yearsOfExperience?: number;
};

type UserProfile = {
  bio?: string;
  goals?: string;
  experienceYears?: number;
  education?: string;
};

const Profile = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSkillLoading, setIsSkillLoading] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user data
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    onError: (err) => {
      toast({
        title: "Authentication Error",
        description: "Please log in to access your profile",
        variant: "destructive"
      });
      navigate("/login");
    }
  });

  // Forms
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      goals: "",
      experienceYears: 0,
      education: ""
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

  const roleForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      currentRole: ""
    }
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (userData?.profile) {
      profileForm.reset({
        bio: userData.profile.bio || "",
        goals: userData.profile.goals || "",
        experienceYears: userData.profile.experienceYears || 0,
        education: userData.profile.education || ""
      });
    }
    
    if (userData?.user?.currentRole) {
      roleForm.reset({
        currentRole: userData.user.currentRole
      });
    }
  }, [userData, profileForm, roleForm]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return apiRequest("/api/auth/profile", {
        method: "PUT",
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addSkillMutation = useMutation({
    mutationFn: async (data: SkillFormValues) => {
      return apiRequest("/api/auth/skills", {
        method: "POST",
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Skill Added",
        description: "Your skill has been added to your profile",
      });
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

  const deleteSkillMutation = useMutation({
    mutationFn: async (skillId: number) => {
      return apiRequest(`/api/auth/skills/${skillId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Skill Removed",
        description: "The skill has been removed from your profile",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Remove Skill",
        description: "Could not remove the skill. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: RoleFormValues) => {
      return apiRequest("/api/auth/current-role", {
        method: "PUT",
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Current Role Updated",
        description: "Your current role has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update your current role. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Form submission handlers
  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsProfileLoading(true);
    await updateProfileMutation.mutateAsync(data);
    setIsProfileLoading(false);
  };

  const onSkillSubmit = async (data: SkillFormValues) => {
    setIsSkillLoading(true);
    await addSkillMutation.mutateAsync(data);
    setIsSkillLoading(false);
  };

  const onRoleSubmit = async (data: RoleFormValues) => {
    setIsRoleLoading(true);
    await updateRoleMutation.mutateAsync(data);
    setIsRoleLoading(false);
  };

  const handleDeleteSkill = async (skillId: number) => {
    await deleteSkillMutation.mutateAsync(skillId);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-primary">Your Profile</h1>
          <p className="text-text-secondary">
            Complete your profile to get personalized career transition recommendations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="profile">Profile Info</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="role">Current Role</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-surface border-primary/20 shadow-glow">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Tell us about yourself and your career goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Bio</FormLabel>
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
                      control={profileForm.control}
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
                        control={profileForm.control}
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
                        control={profileForm.control}
                        name="education"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Education</FormLabel>
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
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        className="bg-primary hover:bg-primary-dark shadow-glow-sm"
                        disabled={isProfileLoading}
                      >
                        {isProfileLoading ? "Saving..." : "Save Profile"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills">
            <Card className="bg-surface border-primary/20 shadow-glow">
              <CardHeader>
                <CardTitle>Your Skills</CardTitle>
                <CardDescription>
                  Add skills to help us analyze gaps for your target roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-4">Current Skills</h3>
                  {userData?.skills && userData.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {userData.skills.map((skill: UserSkill) => (
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
                              onClick={() => handleDeleteSkill(skill.id)}
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
                
                <h3 className="text-lg font-medium mb-4">Add New Skill</h3>
                <Form {...skillForm}>
                  <form onSubmit={skillForm.handleSubmit(onSkillSubmit)} className="space-y-6">
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
                            <FormControl>
                              <select 
                                className="flex h-10 w-full rounded-md border border-primary/20 bg-surface-light px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                {...field}
                              >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                                <option value="Expert">Expert</option>
                              </select>
                            </FormControl>
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
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit"
                        className="bg-primary hover:bg-primary-dark shadow-glow-sm"
                        disabled={isSkillLoading}
                      >
                        {isSkillLoading ? "Adding..." : "Add Skill"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Current Role Tab */}
          <TabsContent value="role">
            <Card className="bg-surface border-primary/20 shadow-glow">
              <CardHeader>
                <CardTitle>Current Role</CardTitle>
                <CardDescription>
                  Specify your current position to help us provide relevant transition insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...roleForm}>
                  <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-6">
                    <FormField
                      control={roleForm.control}
                      name="currentRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Role</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Software Engineer at Google L4"
                              className="bg-surface-light border-primary/20 focus-visible:ring-primary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit"
                        className="bg-primary hover:bg-primary-dark shadow-glow-sm"
                        disabled={isRoleLoading}
                      >
                        {isRoleLoading ? "Saving..." : "Save Role"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col items-start text-sm text-text-secondary">
                <p className="mb-2">
                  <strong>Note:</strong> Your current role will be used to analyze potential career transitions.
                </p>
                <p>
                  For best results, include your company name, position, and level (if applicable).
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;