
import React from "react";
import { Link as WouterLink, useLocation } from "wouter";
import { LayoutDashboard, Settings, User2, Brain, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import careerateLogoSrc from "@assets/CareerateICON.png";

export function TubelightNavbar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { name: 'Agents', url: '/agent-test', icon: Brain },
    { name: 'Settings', url: '/settings', icon: Settings },
    { name: 'Profile', url: '/profile', icon: User2 }
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className={cn(
      "sticky top-0 z-50 w-full bg-background/60 dark:bg-background/60 backdrop-blur-md border-b border-border",
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3 bg-background/5 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
            {navItems.slice(0, 2).map((item) => {
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
                  <span className="flex items-center gap-2">
                    <Icon size={18} strokeWidth={2} />
                    <span>{item.name}</span>
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-left"
                      className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </WouterLink>
              );
            })}
          </div>

          <WouterLink href="/" className="flex items-center mx-6">
            <img src={careerateLogoSrc} alt="Careerate" className="w-8 h-8" />
          </WouterLink>

          <div className="flex items-center gap-3 bg-background/5 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
            {navItems.slice(2).map((item) => {
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
                  <span className="flex items-center gap-2">
                    <Icon size={18} strokeWidth={2} />
                    <span>{item.name}</span>
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-right"
                      className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </WouterLink>
              );
            })}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-foreground/80 hover:text-primary focus:outline-none"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default TubelightNavbar;
