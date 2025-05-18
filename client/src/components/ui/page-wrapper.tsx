
import React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className={cn("pt-20 sm:pt-24", className)}>
      {children}
    </div>
  );
}

export default PageWrapper;
