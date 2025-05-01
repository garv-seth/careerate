import React, { useState, useEffect } from "react";
import { Link as WouterLink, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import careerateLogoSrc from "@assets/CareerateICON.png";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

const NavLink = ({ href, children }: NavLinkProps) => {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <WouterLink href={href}>
      <motion.div
        className={`relative font-medium ${isActive 
          ? "text-primary-600 dark:text-primary-400" 
          : "text-gray-600 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"} 
          transition-colors`}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {children}
        {isActive && (
          <motion.div
            className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary-500 rounded-full"
            layoutId="underline"
          />
        )}
      </motion.div>
    </WouterLink>
  );
};

export const TubelightNavbar = () => {
  const { user, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#about", label: "About" },
    { href: "#contact", label: "Contact" }
  ];

  return (
    <motion.nav 
      className={`sticky top-0 z-50 ${
        scrolled 
          ? "bg-white/90 dark:bg-slate-900/90 shadow-md" 
          : "bg-transparent"
      } backdrop-filter backdrop-blur-md transition-all duration-300`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <WouterLink href="/" className="flex items-center">
              <motion.div 
                className="mr-2 p-1 rounded-full tubelight"
                whileHover={{ rotate: 10 }}
                transition={{ duration: 0.3 }}
              >
                <img 
                  src={careerateLogoSrc} 
                  alt="Careerate" 
                  className="w-8 h-8"
                />
              </motion.div>
            </WouterLink>
          </motion.div>
          
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            <AnimatePresence mode="wait">
              {isAuthenticated ? (
                <motion.div
                  key="dashboard-button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button variant="default" asChild className="shadow-md">
                    <WouterLink href="/dashboard">Dashboard</WouterLink>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="signin-button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button className="hidden sm:inline-flex shadow-md" asChild>
                    <a href="/api/login">Sign In</a>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.button 
              onClick={toggleTheme} 
              className="p-2 rounded-full text-gray-600 dark:text-gray-200 focus:outline-none"
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.button>
            
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <motion.button 
                  className="inline-flex md:hidden items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-200 focus:outline-none"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Menu className="h-5 w-5" />
                </motion.button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                <motion.div 
                  className="flex flex-col h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, staggerChildren: 0.1 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <img 
                        src={careerateLogoSrc} 
                        alt="Careerate" 
                        className="w-6 h-6 mr-2" 
                      />
                      <span className="font-heading font-bold text-xl">Menu</span>
                    </div>
                    <motion.button 
                      onClick={() => setSheetOpen(false)}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="h-5 w-5" />
                    </motion.button>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {navLinks.map((link, index) => (
                      <motion.a
                        key={link.href}
                        href={link.href}
                        className="px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white rounded-md"
                        onClick={() => setSheetOpen(false)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.03, x: 5 }}
                      >
                        {link.label}
                      </motion.a>
                    ))}
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
                    {isAuthenticated ? (
                      <div className="space-y-3">
                        <Button className="w-full" onClick={() => setSheetOpen(false)} asChild>
                          <WouterLink href="/dashboard">Dashboard</WouterLink>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => setSheetOpen(false)} asChild>
                          <a href="/api/logout">Logout</a>
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full" onClick={() => setSheetOpen(false)} asChild>
                        <a href="/api/login">Sign In</a>
                      </Button>
                    )}
                  </div>
                </motion.div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default TubelightNavbar;
