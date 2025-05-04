import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type User = {
  id: string;
  username: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: { username: string; password: string; name?: string; email?: string }) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/auth/user');
        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }
          throw new Error('Failed to fetch user');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest('POST', '/api/auth/login', credentials);
      if (!res.ok) {
        throw new Error('Login failed');
      }
      return res.json();
    },
    onSuccess: (newUser: User) => {
      queryClient.setQueryData(['/api/auth/user'], newUser);
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${newUser.name || newUser.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout');
      if (!res.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/user'], null);
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Logout Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { username: string; password: string; name?: string; email?: string }) => {
      const res = await apiRequest('POST', '/api/auth/register', userData);
      if (!res.ok) {
        throw new Error('Registration failed');
      }
      return res.json();
    },
    onSuccess: (newUser: User) => {
      queryClient.setQueryData(['/api/auth/user'], newUser);
      toast({
        title: 'Registration Successful',
        description: `Welcome, ${newUser.name || newUser.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const login = async (credentials: { username: string; password: string }) => {
    await loginMutation.mutateAsync(credentials);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const register = async (userData: { username: string; password: string; name?: string; email?: string }) => {
    await registerMutation.mutateAsync(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        register,
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