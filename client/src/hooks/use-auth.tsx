import { createContext, ReactNode, useContext, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "../lib/queryClient";
import { useToast } from "./use-toast";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (returnTo?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Fetch user data from the API
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: 1, // Only retry once
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnMount: true,
    // Handle errors silently
    onError: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    }
  });

  // Direct login by redirecting to the API endpoint
  const login = useCallback((returnTo?: string) => {
    const loginUrl = new URL("/api/login", window.location.origin);
    
    // Add return URL if provided
    if (returnTo) {
      loginUrl.searchParams.append("returnTo", returnTo);
    }
    
    // Redirect to login endpoint
    window.location.href = loginUrl.toString();
  }, []);

  // Direct logout by redirecting to the API endpoint
  const logout = useCallback(() => {
    const logoutUrl = new URL("/api/logout", window.location.origin);
    window.location.href = logoutUrl.toString();
  }, []);

  // Authentication context value
  const value: AuthContextType = {
    user: user || null,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for using the authentication context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}