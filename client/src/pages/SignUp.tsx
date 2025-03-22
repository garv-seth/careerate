import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal(""))
});

type FormValues = z.infer<typeof formSchema>;

const SignUp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      email: ""
    }
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data)
      });

      if (response.success) {
        toast({
          title: "Registration successful!",
          description: "Welcome to Careerate! Redirecting to the setup wizard...",
          variant: "default"
        });
        
        // Redirect to onboarding wizard after successful registration
        setTimeout(() => {
          navigate("/onboarding");
        }, 1500);
      } else {
        toast({
          title: "Registration failed",
          description: response.error || "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md bg-surface border-primary/20 shadow-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">Create Your Account</CardTitle>
          <CardDescription className="text-center">
            Join Careerate and start your career transformation journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Choose a username" 
                        {...field} 
                        className="bg-surface-light border-primary/20 focus-visible:ring-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Create a password" 
                        {...field}
                        className="bg-surface-light border-primary/20 focus-visible:ring-primary"
                      />
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
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter your email address" 
                        {...field}
                        className="bg-surface-light border-primary/20 focus-visible:ring-primary" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-dark text-white shadow-glow-sm"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-sm">
            Already have an account?{" "}
            <Button variant="link" className="text-primary p-0" onClick={() => navigate("/login")}>
              Log In
            </Button>
          </p>
          <div className="w-full border-t border-primary/10 pt-4">
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;