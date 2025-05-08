import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";
import { 
  Home, 
  User, 
  Settings, 
  LayoutDashboard,
  Cpu, 
  type LucideIcon
} from 'lucide-react';

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items?: NavItem[];
  className?: string;
}

export function NavBar({ items, className }: NavBarProps) {
  const [activeTab, setActiveTab] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  useEffect(() => {
    // Set active tab based on current location
    const currentPath = location;
    const activeItem = items?.find(item => item.url === currentPath);
    if (activeItem) {
      setActiveTab(activeItem.name);
    } else if (items && items.length > 0) {
      setActiveTab(items[0].name);
    }
  }, [location, items]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navigate = (path: string) => {
    setLocation(path);
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-1/2 -translate-x-1/2 z-50 pt-6",
        className,
      )}
    >
      <div className="flex items-center gap-3 bg-background/5 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
        {items?.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <a
              key={item.name}
              href={item.url}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(item.name);
                navigate(item.url);
              }}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                "text-foreground/80 hover:text-primary",
                isActive && "bg-muted text-primary",
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
            </a>
          );
        })}
      </div>
    </div>
  );
}

const TubelightNavbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  const navItems: NavItem[] = [
    { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { name: 'Agents', url: '/agents', icon: Cpu },
    { name: 'Profile', url: '/profile', icon: User },
    { name: 'Settings', url: '/settings', icon: Settings }
  ];

  if (!isAuthenticated) {
    return null; // Don't show navbar for unauthenticated users
  }

  return (
    <>
      <div className="h-20"></div> {/* Spacer for fixed navbar */}
      <NavBar items={navItems} />
    </>
  );
};

export default TubelightNavbar;