import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useOnboarding } from "../hooks/use-onboarding";
import { Loader2 } from "lucide-react";

export default function AuthTestPage() {
  const { user, isLoading, login, logout } = useAuth();
  const { openOnboarding } = useOnboarding();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [formData, setFormData] = useState({
    username: "testuser",
    email: "test@example.com"
  });
  
  const handleLogoutClick = () => {
    setIsNavigating(true);
    logout();
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      const response = await fetch("/api/development/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error("Login failed");
      }
      
      // Refresh the page to get updated auth state
      window.location.href = "/";
    } catch (error) {
      console.error("Login error:", error);
      setIsLoggingIn(false);
    }
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
              <h3 className="font-medium text-yellow-800">Development Authentication</h3>
              <p className="text-sm mt-2">
                This is a simplified login form for development. In production, Replit Authentication would be used.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Sign in for Development"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}