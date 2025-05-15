import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  isPremium?: boolean;
}

interface AuthError {
  error: string;
  redirect?: string;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);

  const { data: user, isLoading: isLoadingUser, error, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: async (): Promise<User | null> => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });

        if (!response.ok) {
          // Check if we got a structured error response
          if (response.status === 401) {
            try {
              const errorData = await response.json() as AuthError;

              // If server indicates we should redirect, do so
              if (errorData.redirect) {
                const currentPath = window.location.pathname + window.location.search;
                window.location.href = `${errorData.redirect}&returnTo=${encodeURIComponent(currentPath)}`;
                return null;
              }
            } catch (e) {
              // If we can't parse the response, just return null
            }
          }
          return null;
        }

        return response.json();
      } catch (err) {
        console.error('Auth error:', err);
        return null;
      }
    },
    retry: 1, // Only retry once to avoid infinite loops
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (!isLoadingUser) {
      setIsLoading(false);
    }
  }, [isLoadingUser]);

  const login = (returnTo?: string) => {
    const returnPath = returnTo || window.location.pathname;
    window.location.href = `/api/login?returnTo=${encodeURIComponent(returnPath)}`;
  };

  const logout = () => {
    window.location.href = '/api/logout';
  };

  return {
    isAuthenticated: !!user,
    isLoading,
    user,
    login,
    logout,
    error,
    refetch,
  };
}