import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface WarpBackgroundProps {
  children: ReactNode;
}

export const WarpBackground: React.FC<WarpBackgroundProps> = ({ children }) => {
  return (
    <div className="relative overflow-hidden">
      {/* Warp Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 opacity-90"></div>
        <div className="absolute inset-0">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"></path>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)"></rect>
          </svg>
        </div>
        <div className="absolute h-full w-full">
          {/* Animated dots */}
          <motion.div 
            className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary-600/20 rounded-full filter blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div 
            className="absolute top-1/2 left-2/3 w-64 h-64 bg-secondary-600/20 rounded-full filter blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          />
          <motion.div 
            className="absolute top-3/4 left-1/4 w-72 h-72 bg-accent-500/20 rounded-full filter blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, delay: 2 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default WarpBackground;
