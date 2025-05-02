import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/auth/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import AgentTestPage from "@/pages/agent-test";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import AuthTestPage from "@/pages/auth-test";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";

function Router() {
  return (
    <div className="pt-20"> {/* Add padding top for navbar */}
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth-test" component={AuthTestPage} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/agents">
        <ProtectedRoute>
          <AgentTestPage />
        </ProtectedRoute>
      </Route>
      
      {/* Keep the old route temporarily for backward compatibility */}
      <Route path="/agent-test">
        <ProtectedRoute>
          <AgentTestPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      
      {/* Public Legal Pages */}
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      
      <Route component={NotFound} />
    </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
