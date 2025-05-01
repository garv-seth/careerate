import React from "react";
import { Link as WouterLink, useLocation } from "wouter";
import { LayoutDashboard, Settings, User2, Brain } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import careerateLogoSrc from "@assets/CareerateICON.png";

export function TubelightNavbar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { name: 'Agents', url: '/agent-test', icon: Brain },
    { name: 'Settings', url: '/settings', icon: Settings },
    { name: 'Profile', url: '/profile', icon: User2 }
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className={cn(
      "fixed top-4 left-1/2 -translate-x-1/2 z-50",
      className
    )}>
      <div className="flex items-center gap-2 bg-background/80 backdrop-blur-lg border border-border rounded-full shadow-lg px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.url;
          return (
            <WouterLink
              key={item.name}
              href={item.url}
              className={cn(
                "relative px-4 py-2 text-sm font-medium rounded-full transition-colors",
                "text-foreground/70 hover:text-primary",
                isActive && "text-primary"
              )}
            >
              <span className="flex items-center gap-2">
                <Icon size={18} strokeWidth={2} />
                <span>{item.name}</span>
              </span>
            </WouterLink>
          );
        })}

        <motion.div
          layoutId="tubelight"
          className="absolute inset-0 rounded-full bg-primary/10 tubelight"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 30
          }}
        />
      </div>
    </nav>
  );
}

export default TubelightNavbar;