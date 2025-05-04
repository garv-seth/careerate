import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useOnboarding } from "../hooks/use-onboarding";
import { Loader2 } from "lucide-react";

export default function AuthTestPage() {
  const { user, isLoading, loginMutation, logoutMutation, registerMutation } = useAuth();
  const { openOnboarding } = useOnboarding();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
  });
  
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });
  
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterForm({
      ...registerForm,
      [e.target.name]: e.target.value,
    });
  };
  
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerMutation.mutateAsync(registerForm);
    } catch (error) {
      console.error("Registration error:", error);
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync(loginForm);
    } catch (error) {
      console.error("Login error:", error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Logout error:", error);
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
              onClick={handleLogout} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <>
                  <Loader2 size={16} className="inline mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Logout"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Auth Test</h2>
            <p className="text-gray-500">Please login or register to continue.</p>
          </div>
          
          <div className="border-b mb-4">
            <div className="flex mb-4">
              <button 
                className={`px-4 py-2 ${activeTab === 'login' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
              <button
                className={`px-4 py-2 ${activeTab === 'register' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
            </div>
          </div>
          
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="login-username" className="block text-sm font-medium">Username</label>
                <input
                  id="login-username"
                  name="username"
                  className="w-full p-2 border rounded"
                  value={loginForm.username}
                  onChange={handleLoginChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="login-password" className="block text-sm font-medium">Password</label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  className="w-full p-2 border rounded"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="inline mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="register-username" className="block text-sm font-medium">Username (required)</label>
                <input
                  id="register-username"
                  name="username"
                  className="w-full p-2 border rounded"
                  value={registerForm.username}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="register-password" className="block text-sm font-medium">Password (required)</label>
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  className="w-full p-2 border rounded"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="register-name" className="block text-sm font-medium">Name (optional)</label>
                <input
                  id="register-name"
                  name="name"
                  className="w-full p-2 border rounded"
                  value={registerForm.name}
                  onChange={handleRegisterChange}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="register-email" className="block text-sm font-medium">Email (optional)</label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  className="w-full p-2 border rounded"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                />
              </div>
              
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="inline mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}