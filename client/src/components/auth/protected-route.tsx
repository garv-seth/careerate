import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Protected route wrapper component
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [location] = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect once to prevent loops
    if (!isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      
      // Redirect to login with current location as return URL
      login(location);
    }
  }, [isLoading, isAuthenticated, hasRedirected, location, login]);

  // Show loading spinner while auth check is in progress
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated but already redirected, show loader
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If authenticated, render children
  return <>{children}</>;
}