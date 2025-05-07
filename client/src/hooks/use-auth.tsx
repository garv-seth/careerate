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

  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Direct browser to login endpoint
  const login = useCallback((returnTo?: string) => {
    const loginUrl = new URL("/api/login", window.location.origin);
    
    if (returnTo) {
      loginUrl.searchParams.append("returnTo", returnTo);
    }
    
    window.location.href = loginUrl.toString();
  }, []);

  // Direct browser to logout endpoint
  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  const value: AuthContextType = {
    user: user || null,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}