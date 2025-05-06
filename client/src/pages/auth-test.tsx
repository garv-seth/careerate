import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useOnboarding } from "../hooks/use-onboarding";
import { Loader2 } from "lucide-react";

export default function AuthTestPage() {
  const { user, isLoading, login, logout } = useAuth();
  const { openOnboarding } = useOnboarding();
  const [isNavigating, setIsNavigating] = useState(false);
  
  const handleLoginClick = () => {
    setIsNavigating(true);
    login();
  };
  
  const handleLogoutClick = () => {
    setIsNavigating(true);
    logout();
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-medium">Loading authentication state...</h3>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-md mx-auto py-10">
      <h1 className="text-3xl font-bold text-center mb-6">Authentication Test</h1>
      
      {user ? (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Welcome, {user.name || user.username}!</h2>
            <p className="text-gray-500">You are logged in.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">User Details:</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-xs mt-2 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
            
            <hr className="my-4" />
            
            <div className="space-y-2">
              <h3 className="font-medium">Onboarding:</h3>
              <p className="text-sm text-gray-500">
                Test the onboarding wizard functionality.
              </p>
              <button 
                onClick={openOnboarding}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Show Onboarding Wizard
              </button>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <button 
              onClick={handleLogoutClick} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Development Auth Test</h2>
            <p className="text-gray-500">This is a simplified authentication test page for development purposes.</p>
          </div>
          
          <div className="mb-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-medium text-yellow-800">Authentication Information</h3>
              <p className="text-sm mt-2">
                This application uses Replit's authentication system. You'll be redirected to Replit to sign in securely.
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <a 
              href="/api/login"
              className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isNavigating ? 'opacity-70' : ''} text-center flex items-center justify-center`}
              onClick={() => setIsNavigating(true)}
            >
              {isNavigating ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Sign in with Replit"
              )}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}