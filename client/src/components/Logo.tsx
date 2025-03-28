import React from "react";
import { motion } from "framer-motion";

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

  // Glow sizes based on logo size
  const glowSizes = {
    sm: "inset-1",
    md: "inset-1.5",
    lg: "inset-2",
  };

  return (
    <div className="flex items-center group">
      <motion.div 
        className={`${sizes[size]} mr-3 relative overflow-visible`}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {/* Enhanced Logo with dynamic white glow effects */}
        <div className="w-full h-full relative">
          {/* Primary outer glow - white with blue tint */}
          <motion.div 
            className={`absolute -inset-3 bg-white rounded-full opacity-20 blur-xl`}
            animate={{ 
              opacity: [0.15, 0.25, 0.15], 
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
          
          {/* Secondary inner glow - pure white */}
          <motion.div 
            className={`absolute ${glowSizes[size]} bg-white rounded-full opacity-30 blur-md`}
            animate={{ 
              opacity: [0.3, 0.5, 0.3], 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut",
              repeatType: "reverse"
            }}
          />
          
          {/* Blue accent glow */}
          <motion.div 
            className={`absolute ${glowSizes[size]} bg-primary rounded-full opacity-50 blur-sm mix-blend-screen`}
            animate={{ 
              opacity: [0.5, 0.7, 0.5], 
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
          
          {/* Actual logo image with shadow */}
          <motion.img 
            src="/careerate-icon.png"
            alt="Careerate Logo" 
            className="w-full h-full relative z-10 drop-shadow-logo"
            animate={{ 
              scale: [1, 1.02, 1],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
        </div>
      </motion.div>
      <div className="flex flex-col">
        <motion.span 
          className={`font-bold ${textSizes[size]} bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-300 filter drop-shadow-text`}
          whileHover={{
            textShadow: "0 0 8px rgba(255, 255, 255, 0.7), 0 0 12px rgba(0, 195, 255, 0.3)"
          }}
        >
          Careerate
        </motion.span>
        {showTagline && (
          <span className="text-xs text-cyan-300/80 -mt-1 tracking-wide">POWERED BY CARA<sup>agent</sup></span>
        )}
      </div>
    </div>
  );
};

export default Logo;
