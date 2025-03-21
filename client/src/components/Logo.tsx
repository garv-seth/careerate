import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = "md", showTagline = true }) => {
  // Size mappings
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center group">
      <div className={`${sizes[size]} mr-3 relative animate-pulse-slow`}>
        {/* SVG recreation of the Careerate logo with glow effects */}
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-glow">
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="black" 
            stroke="currentColor" 
            strokeWidth="2" 
            className="text-primary"
          />
          <circle 
            cx="50" 
            cy="50" 
            r="30" 
            stroke="currentColor" 
            strokeWidth="8" 
            className="text-primary" 
            fill="transparent"
            strokeDasharray="60 100"
            strokeDashoffset="25"
          />
          <path 
            d="M35 50 L 65 50" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            className="opacity-80"
          />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className={`font-bold ${textSizes[size]} bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-300 transition-all group-hover:from-primary group-hover:to-purple-400 filter drop-shadow-text`}>
          Careerate
        </span>
        {showTagline && (
          <span className="text-xs text-cyan-300/80 -mt-1 tracking-wide">POWERED BY CARA AI</span>
        )}
      </div>
    </div>
  );
};

export default Logo;
