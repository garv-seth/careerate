import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = "md", showTagline = true }) => {
  // Size mappings
  const sizes = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center">
      <div className={`${sizes[size]} mr-3 relative logo-glow`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="50" cy="50" r="45" stroke="hsl(var(--primary))" strokeWidth="5" fill="transparent"/>
          <path d="M30 50 A 20 20 0 1 1 50 70" stroke="hsl(var(--primary-foreground))" strokeWidth="8" strokeLinecap="round" />
          <path d="M50 30 L 80 50" stroke="hsl(var(--primary-foreground))" strokeWidth="8" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className={`font-bold text-primary ${textSizes[size]}`}>
          Careerate
        </span>
        {showTagline && (
          <span className="text-xs text-muted-foreground -mt-1">powered by Cara AI</span>
        )}
      </div>
    </div>
  );
};

export default Logo;
