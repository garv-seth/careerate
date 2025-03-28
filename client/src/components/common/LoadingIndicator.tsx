import React from "react";

interface LoadingIndicatorProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "Loading your personalized career plan...", 
  className = "", 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 text-center ${className}`}>
      <div className={`${sizeClasses[size]} text-primary mb-3`}>
        <svg
          className="animate-spin h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      {message && <p className="text-sm text-text-secondary mt-2">{message}</p>}
    </div>
  );
};

export default LoadingIndicator;