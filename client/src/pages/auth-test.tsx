import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useOnboarding } from "../hooks/use-onboarding";
import { Loader2 } from "lucide-react";

export default function AuthTestPage() {
  const { user, isLoading, login, logout } = useAuth();
  const { openOnboarding } = useOnboarding();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [authTestUser] = useState({
    id: "test_user_123",
    username: "testuser",
    name: "Test User",
    email: "test@example.com",
    password: "password123"
  });
  
  // Auto-create a test user for development purposes
  useEffect(() => {
    const createTestUser = async () => {
      try {
        const response = await fetch("/api/test/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(authTestUser)
        });
        const data = await response.json();
        console.log("Test user created:", data);
      } catch (error) {
        console.error("Failed to create test user:", error);
      }
    };
    
    if (!user && process.env.NODE_ENV === "development") {
      createTestUser();
    }
  }, [authTestUser, user]);
  
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleLogout = () => {
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
              onClick={handleLogout} 
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
              <h3 className="font-medium text-yellow-800">Test User Details</h3>
              <pre className="bg-yellow-100 p-2 rounded mt-2 text-xs">
                {JSON.stringify(authTestUser, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Simulate Login with Test User"
              )}
            </button>
            
            <a 
              href="/api/login"
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-center"
            >
              Replit Auth Login
            </a>
          </div>
        </div>
      )}
    </div>
  );
}