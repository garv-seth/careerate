import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Cpu,
  User,
  Settings,
  Menu as MenuIcon,
  X as XIcon,
  Home,
  Info,
  DollarSign,
  type LucideIcon
} from 'lucide-react';

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
}

export function NavBar({ items, className }: NavBarProps) {
  const [active, setActive] = useState(items[0]?.name);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  // Update active on route change
  useEffect(() => {
    const match = items.find(item => item.url === location);
    setActive(match ? match.name : items[0]?.name);
  }, [location, items]);

  // Handle resize
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Navigate function
  const navigate = (name: string, url: string) => {
    setActive(name);
    setOpen(false);
    setLocation(url);
  };

  return (
    <nav className={cn(
      'fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-screen-lg px-4 pointer-events-auto',
      className
    )}>
      {/* Desktop Navigation */}
      {!isMobile && (
        <div className="pointer-events-auto flex justify-center gap-10 bg-background/40 backdrop-blur-lg rounded-full py-2 px-8 shadow-lg">
          {items.map(item => {
            const isActive = active === item.name;
            return (
              <div key={item.name} className="relative">
                <button
                  onClick={() => navigate(item.name, item.url)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-1 rounded-full transition-colors',
                    isActive ? 'text-primary' : 'text-foreground/80 hover:text-primary'
                  )}
                >
                  <item.icon size={20} strokeWidth={2.5} />
                  <span>{item.name}</span>
                </button>
                {/* Tubelight underline */}
                {isActive && (
                  <motion.div
                    layoutId="underline"
                    initial={false}
                    className="absolute left-1/2 transform -translate-x-1/2 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Toggle Button */}
      {isMobile && (
        <div className="pointer-events-auto flex justify-end p-3">
          <button className="text-foreground/80 hover:text-primary p-2" onClick={() => setOpen(v => !v)}>
            {open ? <XIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      )}

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMobile && open && (
          <motion.div
            className="fixed top-16 right-4 w-48 bg-background/60 backdrop-blur-lg rounded-lg shadow-lg"
            style={{ pointerEvents: 'auto' }}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex flex-col">
              {items.map(item => {
                const isActive = active === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.name, item.url)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-2 transition-colors',
                      isActive ? 'text-primary' : 'text-foreground/80 hover:text-primary'
                    )}
                  >
                    <item.icon size={20} strokeWidth={2.5} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

const TubelightNavbar = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  // Different nav items based on authentication status
  const navItems: NavItem[] = isAuthenticated 
    ? [
        { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { name: 'Agents', url: '/agents', icon: Cpu },
        { name: 'Profile', url: '/profile', icon: User },
        { name: 'Settings', url: '/settings', icon: Settings }
      ]
    : [
        { name: 'Home', url: '/', icon: Home },
        { name: 'About', url: '/about', icon: Info },
        { name: 'Pricing', url: '/pricing', icon: DollarSign }
      ];

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };
  
  // Check if we're on landing page to decide on spacer
  const showSpacer = location !== '/';

  return (
    <>
      {showSpacer && <div className="h-20" />} {/* spacer */}
      <NavBar items={navItems} />
    </>
  );
};

export default TubelightNavbar;
