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
      // Clear old tokens first to avoid conflicts
      await clearAllAuth();
      
      const response = await apiRequest("/api/v2/auth/login", {
        method: "POST",
        data: data
      });

      if (response.success) {
        toast({
          title: "Login successful!",
          description: "Welcome back to Careerate!",
          variant: "default"
        });
        
        // Redirect to profile page after successful login
        navigate("/profile");
      } else {
        toast({
          title: "Login failed",
          description: response.error || "Invalid email or password",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Get the specific error message if available
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // @ts-ignore - Try to extract error from response if possible
        errorMessage = error.response?.data?.error || errorMessage;
      }
      
      toast({
        title: "Login failed",
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
          <p className="text-sm">
            Don't have an account?{" "}
            <Button variant="link" className="text-primary p-0" onClick={() => navigate("/signup")}>
              Sign Up
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

export default Login;