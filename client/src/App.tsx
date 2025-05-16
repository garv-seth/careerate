import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "./components/auth/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { OnboardingProvider } from "./hooks/use-onboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import Dashboard from "@/pages/dashboard.new";
import AgentTestPage from "@/pages/agent-test.new";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import Subscription from "@/pages/subscription";
import AboutPage from "@/pages/about";
import PricingPage from "@/pages/pricing";
import SignupPage from "@/pages/signup";
import CheckoutSuccessPage from "@/pages/checkout-success";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />

      {/* Public Pages */}
      <Route path="/about" component={AboutPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />

      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/onboarding">
        <ProtectedRoute>
          <OnboardingWizard />
        </ProtectedRoute>
      </Route>

      <Route path="/agents">
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

      <Route path="/subscription">
        <ProtectedRoute>
          <Subscription />
          <Route path="/checkout-success" >
             <CheckoutSuccessPage />
          </Route>
        </ProtectedRoute>
      </Route>


      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <OnboardingProvider>
            <div className="min-h-screen flex flex-col">
              <Toaster />
              <Router />
            </div>
          </OnboardingProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;