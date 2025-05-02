import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, LogOut, UserCheck2, UserX } from "lucide-react";
import TubelightNavbar from "@/components/ui/tubelight-navbar";

const AuthTestPage = () => {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <TubelightNavbar />
      
      <div className="max-w-3xl mx-auto pt-20">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Authentication Test</CardTitle>
            <CardDescription>
              Test Replit authentication integration for the gocareerate.com domain
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">Auth Status:</h3>
                <div className="p-4 rounded-md mt-2 flex items-center space-x-3 bg-gray-50 dark:bg-slate-800">
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="h-5 w-5 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                      <span>Loading authentication status...</span>
                    </div>
                  ) : isAuthenticated ? (
                    <>
                      <UserCheck2 className="h-6 w-6 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Authenticated
                      </span>
                    </>
                  ) : (
                    <>
                      <UserX className="h-6 w-6 text-red-500" />
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Not Authenticated
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {isAuthenticated && user && (
                <div>
                  <h3 className="font-medium text-lg">User Profile:</h3>
                  <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-md mt-2 text-sm">
                    <pre className="overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(user, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-medium text-lg">Domain Information:</h3>
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-md mt-2">
                  <p><strong>Current URL:</strong> {window.location.href}</p>
                  <p><strong>Hostname:</strong> {window.location.hostname}</p>
                  <p><strong>Auth Endpoints:</strong></p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><code>/api/login</code> - Start authentication flow</li>
                    <li><code>/api/callback</code> - OAuth callback URL</li>
                    <li><code>/api/logout</code> - Log out user</li>
                    <li><code>/api/auth/user</code> - Get current user data</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="space-x-4">
            <Button 
              onClick={login}
              className="flex items-center space-x-2"
              disabled={isAuthenticated}
            >
              <LogIn className="h-4 w-4 mr-2" />
              <span>Login</span>
            </Button>
            
            <Button 
              onClick={logout}
              variant="outline"
              className="flex items-center space-x-2"
              disabled={!isAuthenticated}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Logout</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AuthTestPage;