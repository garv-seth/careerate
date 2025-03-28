import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * ScrollToTop component that ensures page navigation scrolls to the top
 * This component should be used at the app's root level to automatically
 * scroll to top when navigating between pages
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

/**
 * Enhanced Link component that scrolls to top on navigation
 * Use this for all navigation buttons/links that should scroll to top
 */
export function ScrollToTopLink({ 
  href, 
  children, 
  className = "", 
  onClick = () => {} 
}: { 
  href: string; 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
}) {
  const [, setLocation] = useLocation();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setLocation(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}