import React, { useState } from "react";
import { Link as WouterLink, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

const NavLink = ({ href, children }: NavLinkProps) => {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <WouterLink href={href} className={`font-medium ${isActive 
      ? "text-primary-600 dark:text-primary-400" 
      : "text-gray-600 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"} 
      transition-colors`}>
      {children}
    </WouterLink>
  );
};

export const TubelightNavbar = () => {
  const { user, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

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
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <WouterLink href="/" className="flex items-center">
                <div className="bg-gradient-to-r from-primary-600 to-secondary-500 p-1.5 rounded-lg mr-2">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zm5.99 7.176A9.007 9.007 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                  </svg>
                </div>
                <span className="font-heading font-bold text-xl text-slate-900 dark:text-white tracking-tight">Careerate</span>
            </WouterLink>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <Button variant="default" asChild>
                <WouterLink href="/dashboard">Dashboard</WouterLink>
              </Button>
            ) : (
              <Button className="hidden sm:inline-flex" asChild>
                <a href="/api/login">Sign In</a>
              </Button>
            )}
            
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full text-gray-600 dark:text-gray-200 focus:outline-none"
            >
              {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>
            
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <button className="inline-flex md:hidden items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-200 focus:outline-none">
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-heading font-bold text-xl">Menu</span>
                    <button onClick={() => setSheetOpen(false)}>
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col space-y-4">
                    {navLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white rounded-md"
                        onClick={() => setSheetOpen(false)}
                      >
                        {link.label}
                      </a>
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
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TubelightNavbar;
