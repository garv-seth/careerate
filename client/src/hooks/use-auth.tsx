import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useToast } from "./use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
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

  // Login is handled by redirecting to /api/login
  const login = () => {
    window.location.href = "/api/login";
  };

  // Logout is handled by redirecting to /api/logout
  const logout = () => {
    window.location.href = "/api/logout";
  };

  // Determine if user is authenticated based on user object
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        isAuthenticated,
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