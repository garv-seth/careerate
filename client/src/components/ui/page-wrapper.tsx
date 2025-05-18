
import React from "react";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={cn("pt-20 pb-6 md:pt-24 md:pb-8", className)}>
      {children}
    </div>
  );
}

export default PageWrapper;
