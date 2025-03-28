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
        {/* Actual Careerate logo from PNG file with glow effects */}
        <div className="w-full h-full relative filter drop-shadow-logo animate-logo-pulse">
          {/* Glow effect background */}
          <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20 blur-md animate-pulse-slow scale-110"></div>
          
          {/* Actual logo image */}
          <img 
            src="/careerate-icon.png"
            alt="Careerate Logo" 
            className="w-full h-full relative z-10"
          />
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`font-bold ${textSizes[size]} bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-300 transition-all group-hover:from-primary group-hover:to-white filter drop-shadow-text`}>
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
