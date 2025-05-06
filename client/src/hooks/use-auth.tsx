import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useToast } from "./use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: () => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Query user data using the Replit Auth endpoint
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: async ({ signal }) => {
      try {
        const res = await fetch("/api/auth/user", { signal });
        if (res.status === 401) return null;
        if (!res.ok) throw new Error("Failed to fetch user");
        return await res.json();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        throw err;
      }
    },
  });

  // Login can be handled by redirecting to /api/login or by using a development method
  const login = async () => {
    if (process.env.NODE_ENV === "development") {
      // For development, use the test login endpoint
      try {
        // Use the test endpoint for development with a fixed test user
        const testUser = {
          id: "test_user_123",
          username: "testuser",
          name: "Test User",
          email: "test@example.com"
        };
        
        const res = await fetch("/api/test/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(testUser)
        });
        
        if (!res.ok) {
          throw new Error("Test login failed");
        }
        
        // Refetch user data after login
        refetch();
        
        toast({
          title: "Development login",
          description: "You're now logged in with a test account.",
        });
      } catch (error) {
        console.error("Development login error:", error);
        toast({
          title: "Login failed",
          description: "Could not log in with test account. Try the Replit Auth link instead.",
          variant: "destructive",
        });
      }
    } else {
      // In production, always use Replit Auth
      window.location.href = "/api/login";
    }
  };

  // Logout is handled by redirecting to /api/logout
  const logout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}