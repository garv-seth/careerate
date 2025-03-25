import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import Logo from "./Logo";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const Header: React.FC = () => {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check if user is authenticated
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const isAuthenticated = !!userData?.user;
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  return (
    <header className="relative bg-background border-b border-primary/10 backdrop-blur-sm z-20">
      <div className="absolute inset-0 bg-cyber-grid bg-20 opacity-5"></div>
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="cursor-pointer"
          >
            <Link href="/">
              <Logo />
            </Link>
          </motion.div>
          
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:block"
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
            className="hidden md:block"
          >
            {isAuthenticated ? (
              <Link href="/api/auth/logout">
                <div className="inline-flex items-center justify-center px-5 py-2 border border-primary/40 bg-primary/5 text-primary font-medium text-sm rounded-md hover:bg-primary/10 transition-all duration-300 ease-in-out filter hover:drop-shadow-glow cursor-pointer">
                  <span className="mr-2">LOGOUT</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            ) : (
              <Link href="/signup">
                <div className="inline-flex items-center justify-center px-5 py-2 border border-primary/40 bg-primary/5 text-primary font-medium text-sm rounded-md hover:bg-primary/10 transition-all duration-300 ease-in-out filter hover:drop-shadow-glow cursor-pointer">
                  <span className="mr-2">GET STARTED</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            )}
          </motion.div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              className="p-2 rounded-md text-text-secondary hover:text-primary focus:outline-none"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-surface-dark border-b border-primary/20 overflow-hidden"
          >
            <div className="container mx-auto px-6 py-4">
              <nav className="flex flex-col space-y-4">
                <Link href="/" onClick={closeMobileMenu}>
                  <div className={`py-2 px-3 font-medium text-base ${location === '/' ? 'text-primary' : 'text-text-secondary'}`}>
                    Home
                  </div>
                </Link>
                <Link href="/dashboard/1" onClick={closeMobileMenu}>
                  <div className={`py-2 px-3 font-medium text-base ${location.startsWith('/dashboard') ? 'text-primary' : 'text-text-secondary'}`}>
                    Dashboard
                  </div>
                </Link>
                {isAuthenticated && (
                  <Link href="/profile" onClick={closeMobileMenu}>
                    <div className={`py-2 px-3 font-medium text-base ${location === '/profile' ? 'text-primary' : 'text-text-secondary'}`}>
                      Profile
                    </div>
                  </Link>
                )}
                <div className="pt-2 border-t border-primary/10">
                  {isAuthenticated ? (
                    <Link href="/api/auth/logout" onClick={closeMobileMenu}>
                      <div className="py-2 px-3 bg-primary/10 text-primary font-medium text-base rounded-md">
                        Logout
                      </div>
                    </Link>
                  ) : (
                    <Link href="/signup" onClick={closeMobileMenu}>
                      <div className="py-2 px-3 bg-primary/10 text-primary font-medium text-base rounded-md">
                        Get Started
                      </div>
                    </Link>
                  )}
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Animated scan line effect */}
      <div className="absolute top-0 left-0 right-0 h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary animate-scan-line"></div>
      </div>
    </header>
  );
};

export default Header;
