
"use client"

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link as WouterLink, useLocation } from "wouter";
import { LayoutDashboard, Settings, User2, Brain, Menu, X, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

interface NavItem {
  name: string;
  url: string;
  icon: React.ElementType;
}

export function TubelightNavbar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { isAuthenticated, login, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { name: 'Agents', url: '/agents', icon: Brain },
    { name: 'Settings', url: '/settings', icon: Settings },
    { name: 'Profile', url: '/profile', icon: User2 }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // We render the navbar whether authenticated or not, but with different options

  const handleMobileNavClick = (url: string) => {
    setActiveTab(url);
    setMobileMenuOpen(false);
  };

  // Animations for mobile menu
  const menuVariants = {
    closed: {
      opacity: 0,
      y: -20,
      display: "none",
    },
    open: {
      opacity: 1,
      y: 0,
      display: "block",
    },
  };

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform translate-y-[calc(100%+1rem)] opacity-0",
      "peer-[.scroll-end]:translate-y-0 peer-[.scroll-end]:opacity-100",
      className
    )}>
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-3 bg-background/5 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
        {isAuthenticated ? (
          // Only show nav items when authenticated
          <>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.url;

              return (
                <WouterLink
                  key={item.name}
                  href={item.url}
                  onClick={() => setActiveTab(item.name)}
                  className={cn(
                    "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                    "text-foreground/80 hover:text-primary",
                    isActive && "bg-muted text-primary"
                  )}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="lamp-desktop"
                      className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    >
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                        <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
                        <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
                        <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
                      </div>
                    </motion.div>
                  )}
                </WouterLink>
              );
            })}
            
            {/* Logout Button when authenticated */}
            <Button
              onClick={logout}
              className={cn(
                "cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                "text-foreground/80 hover:text-primary bg-primary/10"
              )}
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </>
        ) : (
          // Only show login button when not authenticated
          <Button
            onClick={() => window.location.href = "/api/login"}
            className={cn(
              "cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
              "text-foreground/80 hover:text-primary bg-primary/10"
            )}
          >
            <LogIn className="w-4 h-4 mr-2" /> Login
          </Button>
        )}
      </div>

      {/* Mobile Navigation Button - Right aligned */}
      <div 
        ref={menuRef}
        className="md:hidden flex justify-end w-auto right-3 top-0"
      >
        <div className="relative">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center w-12 h-12 bg-background/5 border border-border backdrop-blur-lg rounded-full shadow-lg p-3 text-foreground hover:text-primary transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Mobile Dropdown Menu - Now right-aligned */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={menuVariants}
                transition={{ duration: 0.2 }}
                className="absolute top-16 right-0 bg-background border border-border rounded-lg shadow-lg overflow-hidden w-48"
              >
                <div className="pt-2 pb-2">
                  {isAuthenticated ? (
                    // Only show nav items when authenticated in mobile menu
                    <>
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location === item.url;
                        
                        return (
                          <WouterLink
                            key={item.name}
                            href={item.url}
                            onClick={() => handleMobileNavClick(item.name)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors relative",
                              "text-foreground/80 hover:bg-muted hover:text-primary",
                              isActive && "bg-muted text-primary"
                            )}
                          >
                            <Icon size={16} strokeWidth={2.5} />
                            <span>{item.name}</span>
                            {isActive && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                            )}
                          </WouterLink>
                        );
                      })}
                      
                      {/* Logout button when authenticated */}
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors relative w-full text-left",
                          "text-foreground/80 hover:bg-muted hover:text-primary"
                        )}
                      >
                        <LogOut size={16} strokeWidth={2.5} />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    // Only show login when not authenticated
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        window.location.href = "/api/login";
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors relative w-full text-left",
                        "text-foreground/80 hover:bg-muted hover:text-primary"
                      )}
                    >
                      <LogIn size={16} strokeWidth={2.5} />
                      <span>Login</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default TubelightNavbar;
