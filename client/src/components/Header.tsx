import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import Logo from "./Logo";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { checkAuthMigrationNeeded, clearAllAuth } from "@/utils/authMigration";

// Define the auth response type
interface AuthResponse {
  success: boolean;
  user?: {
    id: number;
    email: string;
    username?: string;
    currentRole?: string;
    profileCompleted?: boolean;
  };
  profile?: any;
  skills?: any[];
}

const Header: React.FC = () => {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  
  // Check if user is authenticated
  const { data: userData, isLoading, refetch } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/me'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on 401 errors
    refetchOnWindowFocus: false,
  });
  
  // Check if user data exists and has a user property
  const isAuthenticated = !!(userData && userData.user);
  
  // Check if auth migration is needed
  useEffect(() => {
    const checkMigration = async () => {
      const migrationNeeded = await checkAuthMigrationNeeded();
      setNeedsMigration(migrationNeeded);
      
      // If migration is needed and we're not in login/signup pages, redirect to login
      if (migrationNeeded && 
          !location.startsWith('/login') && 
          !location.startsWith('/signup')) {
        window.location.href = '/login?migration=true';
      }
    };
    
    checkMigration();
  }, [location]);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  return (
    <header className="relative bg-background border-b border-primary/10 backdrop-blur-sm z-20">
      {needsMigration && (
        <div className="bg-amber-500/90 text-black py-2 px-4 text-center text-sm font-medium">
          Your account needs to be migrated to our new system. 
          <Link href="/login?migration=true">
            <span className="ml-2 underline cursor-pointer font-bold">Click here to login</span>
          </Link>
        </div>
      )}
      <div className="absolute inset-0 bg-cyber-grid bg-20 opacity-5 pointer-events-none"></div>
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="cursor-pointer z-10"
          >
            <Link href="/">
              <Logo />
            </Link>
          </motion.div>
          
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:block z-10"
          >
            <ul className="flex items-center space-x-8">
              <li>
                <Link href="/">
                  <div className={`relative px-3 py-2 font-medium text-sm tracking-wide transition-all duration-300 ease-in-out cursor-pointer ${
                    location === '/' 
                      ? 'text-primary' 
                      : 'text-text-secondary hover:text-primary'
                  }`}>
                    HOME
                    {location === '/' && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/transitions/new">
                  <div className={`relative px-3 py-2 font-medium text-sm tracking-wide transition-all duration-300 ease-in-out cursor-pointer ${
                    location.startsWith('/transitions') 
                      ? 'text-primary' 
                      : 'text-text-secondary hover:text-primary'
                  }`}>
                    TRANSITIONS
                    {location.startsWith('/transitions') && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/dashboard/1">
                  <div className={`relative px-3 py-2 font-medium text-sm tracking-wide transition-all duration-300 ease-in-out cursor-pointer ${
                    location.startsWith('/dashboard') 
                      ? 'text-primary' 
                      : 'text-text-secondary hover:text-primary'
                  }`}>
                    DASHBOARD
                    {location.startsWith('/dashboard') && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </div>
                </Link>
              </li>
              {isAuthenticated && (
                <li>
                  <Link href="/profile">
                    <div className={`relative px-3 py-2 font-medium text-sm tracking-wide transition-all duration-300 ease-in-out cursor-pointer ${
                      location === '/profile' 
                        ? 'text-primary' 
                        : 'text-text-secondary hover:text-primary'
                    }`}>
                      PROFILE
                      {location === '/profile' && (
                        <motion.span
                          layoutId="nav-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </div>
                  </Link>
                </li>
              )}
            </ul>
          </motion.nav>
          
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden md:block z-10"
          >
            {isAuthenticated ? (
              <button
                onClick={async () => {
                  try {
                    // Clear both old and new auth tokens
                    await clearAllAuth();
                    window.location.href = "/";
                  } catch (error) {
                    console.error("Logout failed:", error);
                  }
                }}
                className="inline-flex items-center justify-center px-5 py-2 border border-primary/40 bg-primary/5 text-primary font-medium text-sm rounded-md hover:bg-primary/10 transition-all duration-300 ease-in-out filter hover:drop-shadow-glow cursor-pointer"
              >
                <span className="mr-2">LOGOUT</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <Link href={isAuthenticated ? "/transitions/new" : "/signup"}>
                <div className="inline-flex items-center justify-center px-5 py-2 border border-primary/40 bg-primary/5 text-primary font-medium text-sm rounded-md hover:bg-primary/10 transition-all duration-300 ease-in-out filter hover:drop-shadow-glow cursor-pointer">
                  <span className="mr-2">{isAuthenticated ? "EXPLORE TRANSITIONS" : "GET STARTED"}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            )}
          </motion.div>
          
          {/* Mobile menu button */}
          <div className="md:hidden z-30">
            <button 
              className={`p-2 rounded-md ${
                mobileMenuOpen 
                  ? 'text-primary bg-primary/10 border border-primary/30' 
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5 border border-transparent'
              } focus:outline-none transition-all duration-200`}
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu backdrop */}
      <div 
        className={`fixed inset-0 bg-background/90 backdrop-blur-md z-30 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />
      
      {/* Mobile menu dropdown */}
      <div 
        className={`md:hidden fixed left-0 right-0 top-[72px] bg-background/95 backdrop-blur border-b border-primary/20 overflow-hidden shadow-lg z-40 transition-all duration-300 ${
          mobileMenuOpen ? 'opacity-100 max-h-[300px]' : 'opacity-0 max-h-0 pointer-events-none'
        }`}
      >
        <div className="container mx-auto px-6 py-4">
          <nav className="flex flex-col space-y-2">
            <Link href="/" onClick={closeMobileMenu}>
              <div className={`py-3 px-4 font-medium text-base rounded-md hover:bg-primary/5 transition-colors duration-200 ${
                location === '/' ? 'text-primary border-l-2 border-primary pl-3' : 'text-text-secondary border-l-2 border-transparent pl-3'
              }`}>
                Home
              </div>
            </Link>
            <Link href="/transitions/new" onClick={closeMobileMenu}>
              <div className={`py-3 px-4 font-medium text-base rounded-md hover:bg-primary/5 transition-colors duration-200 ${
                location.startsWith('/transitions') ? 'text-primary border-l-2 border-primary pl-3' : 'text-text-secondary border-l-2 border-transparent pl-3'
              }`}>
                Transitions
              </div>
            </Link>
            <Link href="/dashboard/1" onClick={closeMobileMenu}>
              <div className={`py-3 px-4 font-medium text-base rounded-md hover:bg-primary/5 transition-colors duration-200 ${
                location.startsWith('/dashboard') ? 'text-primary border-l-2 border-primary pl-3' : 'text-text-secondary border-l-2 border-transparent pl-3'
              }`}>
                Dashboard
              </div>
            </Link>
            {isAuthenticated && (
              <Link href="/profile" onClick={closeMobileMenu}>
                <div className={`py-3 px-4 font-medium text-base rounded-md hover:bg-primary/5 transition-colors duration-200 ${
                  location === '/profile' ? 'text-primary border-l-2 border-primary pl-3' : 'text-text-secondary border-l-2 border-transparent pl-3'
                }`}>
                  Profile
                </div>
              </Link>
            )}
            <div className="pt-3 mt-1 border-t border-primary/10">
              {isAuthenticated ? (
                <button
                  onClick={async () => {
                    try {
                      closeMobileMenu();
                      // Clear both old and new auth tokens
                      await clearAllAuth();
                      window.location.href = "/";
                    } catch (error) {
                      console.error("Logout failed:", error);
                    }
                  }}
                  className="w-full text-left bg-primary/10 text-primary font-medium text-base rounded-md hover:bg-primary/20 transition-colors py-3 px-4"
                >
                  Logout
                </button>
              ) : (
                <Link href={isAuthenticated ? "/transitions/new" : "/signup"} onClick={closeMobileMenu}>
                  <div className="bg-primary/10 text-primary font-medium text-base rounded-md hover:bg-primary/20 transition-colors py-3 px-4">
                    {isAuthenticated ? "Explore Transitions" : "Get Started"}
                  </div>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
      
      {/* Animated scan line effect */}
      <div className="absolute top-0 left-0 right-0 h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary animate-scan-line"></div>
      </div>
    </header>
  );
};

export default Header;
