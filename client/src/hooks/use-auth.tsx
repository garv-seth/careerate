import { createContext, ReactNode, useContext, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "../lib/queryClient";

// Define user type for our context
// This needs to match what's coming from the API
type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

// Define authentication context type
type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (returnTo?: string) => void;
  logout: () => void;
};

// Create context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  // Fetch user data from the server
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    retry: false, // Don't retry on failure
    refetchOnWindowFocus: false,
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Login function - redirect to API login endpoint
  const login = useCallback((returnTo?: string) => {
    // Create login URL with optional return path
    const loginUrl = returnTo
      ? `/api/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/api/login";
    
    // Use window.location for direct navigation to API endpoint
    window.location.href = loginUrl;
  }, []);

  // Logout function - redirect to API logout endpoint
  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  // Context value
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