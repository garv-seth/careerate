import React from "react";
import { cn } from "@/lib/utils";

interface PageBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function PageBackground({ children, className }: PageBackgroundProps) {
  return (
    <div className={cn(
      "min-h-screen flex flex-col relative",
      // Light mode gradient (subtle blue to purple)
      "bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50",
      // Dark mode gradient (deep blues to purple)
      "dark:from-slate-950 dark:via-blue-950/50 dark:to-indigo-950/40",
      className
    )}>
      {/* Gradient orbs/flares - visible in both light and dark modes */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-50 animate-slow-pulse"></div>
      <div className="absolute bottom-20 right-1/3 w-64 h-64 bg-blue-300/10 dark:bg-blue-400/5 rounded-full blur-3xl animate-slow-pulse-delay-2"></div>
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-indigo-300/10 dark:bg-indigo-500/5 rounded-full blur-3xl animate-slow-pulse-delay-4"></div>
      
      {/* Mesh grain overlay for texture */}
      <div className="absolute inset-0 bg-noise-pattern opacity-[0.02] pointer-events-none"></div>
      
      {/* Actual content gets rendered on top of the background */}
      <div className="relative flex-grow flex flex-col z-10">
        {children}
      </div>
    </div>
  );
}

export default PageBackground;