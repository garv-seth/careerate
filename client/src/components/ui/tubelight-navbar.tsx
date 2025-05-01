import React, { useEffect, useState } from "react";
import { Link as WouterLink, useLocation } from "wouter";
import { Home, User, FileText, Settings, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import careerateLogoSrc from "@assets/CareerateICON.png";

interface NavItem {
  name: string;
  url: string;
  icon: React.ElementType;
}

interface NavBarProps {
  items?: NavItem[];
  className?: string;
}

export function TubelightNavbar({ className }: NavBarProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  const navItems = isAuthenticated ? [
    { name: 'Dashboard', url: '/dashboard', icon: Home },
    { name: 'Profile', url: '/profile', icon: User },
    { name: 'Resume', url: '/resume', icon: FileText },
    { name: 'Settings', url: '/settings', icon: Settings }
  ] : [
    { name: 'Home', url: '/', icon: Home },
    { name: 'Features', url: '/#features', icon: FileText },
    { name: 'About', url: '/#about', icon: User }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 dark:bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <WouterLink href="/" className="flex items-center">
            <img src={careerateLogoSrc} alt="Careerate" className="w-8 h-8 mr-2" />
          </WouterLink>

          <div className="fixed bottom-0 sm:relative left-1/2 -translate-x-1/2 z-50 mb-6 sm:mb-0 sm:translate-x-0 sm:left-0">
            <div className="flex items-center gap-3 bg-background/5 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.url;

                return (
                  <WouterLink
                    key={item.name}
                    href={item.url}
                    className={cn(
                      "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                      "text-foreground/80 hover:text-primary",
                      isActive && "bg-muted text-primary"
                    )}
                  >
                    <span className="hidden md:inline">{item.name}</span>
                    <span className="md:hidden">
                      <Icon size={18} strokeWidth={2.5} />
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="lamp"
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
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-foreground/80 hover:text-primary focus:outline-none"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default TubelightNavbar;