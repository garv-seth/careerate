import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { clearAllAuth, checkAuthMigrationNeeded } from "@/utils/authMigration";
import { useQuery } from "@tanstack/react-query";

// Form validation schema
const formSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required")
});

type FormValues = z.infer<typeof formSchema>;

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showMigrationNotice, setShowMigrationNotice] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Check if user is authenticated
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    refetchOnWindowFocus: false
  });
  
  // Type assertion since we know the structure
  const isAuthenticated = !!(userData && (userData as any).user);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/profile");
    }
  }, [isAuthenticated, navigate]);
  
  // Check if user needs to migrate from old auth system
  useEffect(() => {
    const checkMigration = async () => {
      const migrationNeeded = await checkAuthMigrationNeeded();
      setShowMigrationNotice(migrationNeeded);
    };
    checkMigration();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Function to handle auth system migration
  const handleAuthMigration = async () => {
    setIsLoading(true);
    try {
      await clearAllAuth();
      setShowMigrationNotice(false);
      toast({
        title: "Authentication reset",
        description: "Your login session has been reset. Please log in again.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error during auth migration:", error);
      toast({
        title: "Error",
        description: "Failed to reset authentication. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      // Log the attempt for debugging
      console.log("Attempting login with email:", data.email);
      
      // Clear old tokens first to avoid conflicts (but don't redirect)
      await clearAllAuth(false);
      
      // Use the updated API request function that handles auth endpoints better
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        data: data
      });

      console.log("Login response:", response);

      if (response.success) {
        // Store token in localStorage for client-side access
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
          console.log("Stored token in localStorage");
        } else {
          console.warn("No token received in successful login response");
        }

        toast({
          title: "Login successful!",
          description: "Welcome back to Careerate!",
          variant: "default"
        });
        
        // Small delay before redirecting to ensure token is processed
        setTimeout(() => {
          console.log("Redirecting to profile page");
          navigate("/profile");
        }, 100);
      } else {
        // Show more detailed error from the response
        toast({
          title: "Login failed",
          description: response.error || "Invalid email or password. Please check your credentials and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Enhanced error handling
      let errorMessage = "An unexpected error occurred during login. Please try again.";
      let errorTitle = "Login failed";
      
      console.error("Detailed login error:", error);
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.log("Error message:", errorMessage);
        
        // Handle specific known errors with more user-friendly messages
        if (errorMessage.includes("401")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (errorMessage.includes("429")) {
          errorMessage = "Too many login attempts. Please wait a few minutes before trying again.";
          errorTitle = "Rate limit reached";
        } else if (errorMessage.includes("500")) {
          errorMessage = "Server error. Our team has been notified. Please try again later.";
          errorTitle = "Server error";
        }
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract error from response if possible
        console.log("Error object:", JSON.stringify(error));
        try {
          // @ts-ignore - Try different ways to access error data
          const errorData = error.response?.data || error.data || error;
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.error("Error extracting error message:", e);
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md bg-surface border-primary/20 shadow-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Log in to continue your career transformation journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showMigrationNotice && (
            <Alert className="mb-6 border-amber-500 bg-amber-50 text-amber-800">
              <AlertTitle>Authentication Update</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">
                  We've updated our authentication system. To ensure a seamless experience, please reset your login session.
                </p>
                <Button
                  variant="outline"
                  className="border-amber-500 hover:bg-amber-100 hover:text-amber-900"
                  onClick={handleAuthMigration}
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting..." : "Reset Authentication"}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your email" 
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
                        placeholder="Enter your password" 
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
                {isLoading ? "Logging in..." : "Log In"}
              </Button>
              
              <div className="text-center mt-2">
                <Button 
                  variant="link" 
                  className="text-primary p-0 text-sm" 
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot your password?
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          {!isAuthenticated && (
            <p className="text-sm">
              Don't have an account?{" "}
              <Button variant="link" className="text-primary p-0" onClick={() => navigate("/signup")}>
                Sign Up
              </Button>
            </p>
          )}
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

export default Login;