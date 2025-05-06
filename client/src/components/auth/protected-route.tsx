import { ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "../../hooks/use-auth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    // Redirect to homepage where the login button is displayed
    // Redirect to home to show login button
    setLocation("/");
    return null;
  }

  return <>{children}</>;
}