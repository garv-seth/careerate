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
      <div className={`${sizes[size]} mr-3 relative overflow-visible`}>
        {/* SVG recreation of the new Careerate logo with dynamic glow effects */}
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-logo animate-logo-pulse">
          {/* Enhanced glow effects for the logo */}
          <defs>
            <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="blueGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#4298ff" />
              <stop offset="50%" stopColor="#0074e8" />
              <stop offset="100%" stopColor="#0062cc" />
            </radialGradient>
            <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="rgba(66, 152, 255, 0.8)" />
              <stop offset="100%" stopColor="rgba(66, 152, 255, 0)" />
            </radialGradient>
          </defs>
          
          {/* Glow background effect */}
          <circle 
            cx="50" 
            cy="50" 
            r="48" 
            fill="url(#glowGradient)" 
            opacity="0.6"
            className="animate-pulse-slow"
          />
          
          {/* Main blue circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="url(#blueGradient)" 
            filter="url(#logoGlow)"
          />
          
          {/* Black cutout/gap on the left */}
          <path 
            d="M50 5 A45 45 0 0 0 5 50 A45 45 0 0 0 50 95 L50 65 A15 15 0 0 1 35 50 A15 15 0 0 1 50 35 Z" 
            fill="black" 
          />
          
          {/* White line through the center */}
          <path 
            d="M35 50 L 95 50" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            className="opacity-90"
          />
          
          {/* Subtle highlight effects */}
          <path 
            d="M50 10 A40 40 0 0 1 90 50" 
            stroke="rgba(255, 255, 255, 0.3)" 
            strokeWidth="1" 
            fill="none"
            strokeLinecap="round" 
            strokeDasharray="2 4"
          />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className={`font-bold ${textSizes[size]} bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-300 transition-all group-hover:from-primary group-hover:to-purple-400 filter drop-shadow-text`}>
          Careerate
        </span>
        {showTagline && (
          <span className="text-xs text-cyan-300/80 -mt-1 tracking-wide">POWERED BY CARA<sup>agent</sup></span>
        )}
      </div>
    </div>
  );
};

export default Logo;
