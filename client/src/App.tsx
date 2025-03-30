import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ScrollToTop } from "@/components/ui/scroll-top";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import SignUp from "@/pages/SignUp";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import OnboardingWizard from "@/pages/OnboardingWizard";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NewTransition from "@/pages/NewTransition";
import ContactUs from "@/pages/ContactUs";
import Partnerships from "@/pages/Partnerships";
import CareerGuides from "@/pages/CareerGuides";
import LearningResources from "@/pages/LearningResources";
import SuccessStories from "@/pages/SuccessStories";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import CookiePolicy from "@/pages/CookiePolicy";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Authentication-aware route component
function AuthRoute({ component: Component, authRequired = false, redirectIfAuth = false, ...rest }: any) {
  const [location] = useLocation();
  const { data: userData, isLoading } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  const isAuthenticated = !!(userData && userData.user);
  
  // While checking auth status, we can return nothing or a loading indicator
  if (isLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  
  // Redirect to home if already authenticated and trying to access signup/login
  if (redirectIfAuth && isAuthenticated) {
    return <Redirect to="/" />;
  }
  
  // Redirect to login if authentication is required but user is not authenticated
  if (authRequired && !isAuthenticated) {
    return <Redirect to={`/login?redirect=${encodeURIComponent(location)}`} />;
  }
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/dashboard/:transitionId" component={Dashboard} />
          <Route path="/transitions/new" component={NewTransition} />
          <Route path="/signup">
            <AuthRoute component={SignUp} redirectIfAuth={true} />
          </Route>
          <Route path="/login">
            <AuthRoute component={Login} redirectIfAuth={true} />
          </Route>
          <Route path="/profile">
            <AuthRoute component={Profile} authRequired={true} />
          </Route>
          <Route path="/onboarding">
            <AuthRoute component={OnboardingWizard} authRequired={true} />
          </Route>
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/contact" component={ContactUs} />
          <Route path="/partnerships" component={Partnerships} />
          <Route path="/career-guides" component={CareerGuides} />
          <Route path="/learning-resources" component={LearningResources} />
          <Route path="/success-stories" component={SuccessStories} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/cookie-policy" component={CookiePolicy} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScrollToTop />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
