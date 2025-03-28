import React from "react";
import { motion } from "framer-motion";

export type LoadingStage = 'stories' | 'skills' | 'plan' | 'insights' | 'metrics' | null;

interface WorkflowStatusProps {
  loadingStage: LoadingStage;
  currentRole: string;
  targetRole: string;
  onCancel?: () => void;
}

const WorkflowStatus: React.FC<WorkflowStatusProps> = ({
  loadingStage,
  currentRole,
  targetRole,
  onCancel
}) => {
  // Function to get the percentage of completion based on current stage
  const getProgressPercentage = () => {
    switch (loadingStage) {
      case 'stories': return 20;
      case 'insights': return 40;
      case 'skills': return 60;
      case 'plan': return 80;
      case 'metrics': return 95;
      default: return 0;
    }
  };

  // Get a user-friendly stage label
  const getStageLabel = () => {
    switch (loadingStage) {
      case 'stories': return "Finding transition stories";
      case 'insights': return "Analyzing career insights";
      case 'skills': return "Identifying skill gaps";
      case 'plan': return "Creating personalized development plan";
      case 'metrics': return "Calculating success metrics";
      default: return "Preparing analysis";
    }
  };

  // Get a detailed description of what's happening
  const getStageDescription = () => {
    switch (loadingStage) {
      case 'stories':
        return `Searching for real-world stories from professionals who transitioned from ${currentRole} to ${targetRole}`;
      case 'insights':
        return "Extracting key observations, challenges, and success patterns from career transition stories";
      case 'skills':
        return "Analyzing required skills and identifying gaps for your target role";
      case 'plan':
        return "Creating a personalized development plan with specific milestones and learning resources";
      case 'metrics':
        return "Calculating success rate and timeline based on similar transitions";
      default:
        return "Initializing your career transition analysis";
    }
  };

  return (
    <motion.div 
      className="card rounded-xl p-8 shadow-glow mb-6 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col items-center text-center">
        <h2 className="text-2xl font-heading font-semibold mb-3">
          Analyzing Your Career Transition
        </h2>
        
        <p className="text-text-secondary max-w-2xl mb-8">
          Cara is analyzing your transition from <span className="font-semibold text-primary-light">{currentRole}</span> to <span className="font-semibold text-primary-light">{targetRole}</span> using a combination of real-world data and AI-powered insights.
        </p>
        
        {/* Progress bar */}
        <div className="w-full max-w-lg h-2 bg-surface-dark rounded-full mb-2 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary/80 to-primary"
            initial={{ width: "5%" }}
            animate={{ width: `${getProgressPercentage()}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        
        <div className="flex justify-between w-full max-w-lg mb-8">
          <span className="text-xs text-text-secondary">0%</span>
          <span className="text-xs text-text-secondary">100%</span>
        </div>
        
        {/* Current stage */}
        <div className="flex items-center justify-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-primary-light">
            {getStageLabel()}
          </h3>
        </div>
        
        <p className="text-sm text-text-secondary mb-8 max-w-xl">
          {getStageDescription()}
        </p>
        
        {/* Workflow steps */}
        <div className="w-full max-w-lg space-y-3">
          <WorkflowStep 
            number={1} 
            title="Finding Career Transition Stories" 
            isActive={loadingStage === 'stories'} 
            isCompleted={loadingStage === 'insights' || loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics'} 
          />
          
          <WorkflowStep 
            number={2} 
            title="Extracting Key Observations & Challenges" 
            isActive={loadingStage === 'insights'} 
            isCompleted={loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics'} 
          />
          
          <WorkflowStep 
            number={3} 
            title="Analyzing Skill Gaps" 
            isActive={loadingStage === 'skills'} 
            isCompleted={loadingStage === 'plan' || loadingStage === 'metrics'} 
          />
          
          <WorkflowStep 
            number={4} 
            title="Creating Development Plan" 
            isActive={loadingStage === 'plan'} 
            isCompleted={loadingStage === 'metrics'} 
          />
          
          <WorkflowStep 
            number={5} 
            title="Calculating Success Metrics" 
            isActive={loadingStage === 'metrics'} 
            isCompleted={false} 
          />
        </div>
        
        {onCancel && (
          <button 
            onClick={onCancel} 
            className="mt-8 text-sm text-text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </motion.div>
  );
};

// Helper component for workflow steps
interface WorkflowStepProps {
  number: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
}

const WorkflowStep: React.FC<WorkflowStepProps> = ({
  number,
  title,
  isActive,
  isCompleted
}) => {
  return (
    <div className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
      isActive 
        ? 'bg-primary/10 border border-primary/20' 
        : isCompleted
          ? 'bg-green-500/5 border border-green-500/10' 
          : 'border border-surface-lighter'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
        isActive 
          ? 'bg-primary text-black' 
          : isCompleted 
            ? 'bg-green-500/20 text-green-500' 
            : 'bg-surface-lighter text-text-secondary'
      }`}>
        {isActive ? (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : isCompleted ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          number
        )}
      </div>
      
      <h3 className={`font-medium ${
        isActive 
          ? 'text-primary-light' 
          : isCompleted 
            ? 'text-green-500' 
            : 'text-text'
      }`}>
        {title}
      </h3>
      
      {isActive && (
        <span className="text-xs text-primary-light bg-primary/10 px-2 py-1 rounded-full animate-pulse ml-auto">
          In Progress
        </span>
      )}
      
      {isCompleted && (
        <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full ml-auto">
          Completed
        </span>
      )}
    </div>
  );
};

export default WorkflowStatus;