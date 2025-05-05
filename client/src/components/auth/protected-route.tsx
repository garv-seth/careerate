import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../hooks/use-auth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, login } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to Replit login
      login();
    }
  }, [user, isLoading, login]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border mb-4" />
        <p className="text-lg">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}