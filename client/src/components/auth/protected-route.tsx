
import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect once to prevent infinite loops
    if (!isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      
      // Include the redirect URL in the login URL to handle in the server
      const loginUrl = `/api/login?returnTo=${encodeURIComponent(location)}`;
      
      // Use direct window location for API endpoint redirect
      window.location.href = loginUrl;
    }
  }, [isLoading, isAuthenticated, hasRedirected, location]);

  if (isLoading || (!isAuthenticated && !hasRedirected)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated but already redirected, keep showing loading
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
