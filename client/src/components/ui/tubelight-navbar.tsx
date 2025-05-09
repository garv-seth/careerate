import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Menu,
  X,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navigate = (path: string) => {
    setLocation(path);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Animation variants for the mobile menu
  const menuVariants = {
    hidden: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
      }
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        staggerChildren: 0.07,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50",
        className,
      )}
    >
      {/* Mobile Hamburger Toggle */}
      {isMobile && (
        <div className="absolute right-2 top-2 z-20">
          <button
            className="bg-background/70 backdrop-blur-lg border border-border rounded-full p-2 shadow-lg"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      )}

      {/* Desktop or Expanded Mobile Menu */}
      {!isMobile && (
        <motion.div
          className="flex items-center gap-3 bg-background/70 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-xl"
          initial={false}
          animate="visible"
          variants={menuVariants}
        >
            {items?.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;

              return (
                <motion.a
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
                    isActive && "bg-muted/50 text-primary font-bold",
                    isMobile && "w-full flex justify-center"
                  )}
                  variants={isMobile ? itemVariants : undefined}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Icon size={18} strokeWidth={2.5} />
                    <span>{item.name}</span>
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="lamp"
                      className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                      }}
                    >
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-primary rounded-t-full">
                        <div className="absolute w-14 h-7 bg-primary/30 rounded-full blur-md -top-3 -left-2" />
                        <div className="absolute w-10 h-6 bg-primary/30 rounded-full blur-md -top-2 left-0" />
                        <div className="absolute w-6 h-4 bg-primary/40 rounded-full blur-sm -top-1 left-2" />
                      </div>
                    </motion.div>
                  )}
                </motion.a>
              );
            })}
          </motion.div>
      )}
      
      {/* Mobile Menu - Separate component */}
      {isMobile && (
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="flex-col px-4 py-3 absolute top-12 right-2 w-max min-w-[200px] rounded-xl bg-background/70 border border-border backdrop-blur-lg shadow-xl z-10"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {items?.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;

                return (
                  <motion.a
                    key={item.name}
                    href={item.url}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(item.name);
                      navigate(item.url);
                    }}
                    className={cn(
                      "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors w-full flex justify-center my-1",
                      "text-foreground/80 hover:text-primary",
                      isActive && "bg-muted/50 text-primary font-bold"
                    )}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Icon size={18} strokeWidth={2.5} />
                      <span>{item.name}</span>
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="mobileLamp"
                        className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 40,
                        }}
                      >
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-primary rounded-t-full">
                          <div className="absolute w-14 h-7 bg-primary/30 rounded-full blur-md -top-3 -left-2" />
                          <div className="absolute w-10 h-6 bg-primary/30 rounded-full blur-md -top-2 left-0" />
                          <div className="absolute w-6 h-4 bg-primary/40 rounded-full blur-sm -top-1 left-2" />
                        </div>
                      </motion.div>
                    )}
                  </motion.a>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}
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

  // Get current location to check if we're on the landing page
  // This hook must be called unconditionally at the top level
  const [location] = useLocation();
  const isLandingPage = location === '/';

  if (!isAuthenticated) {
    return null; // Don't show navbar for unauthenticated users
  }

  return (
    <>
      {!isLandingPage && <div className="h-24"></div>} {/* Spacer only for non-landing pages */}
      <NavBar items={navItems} />
    </>
  );
};

export default TubelightNavbar;