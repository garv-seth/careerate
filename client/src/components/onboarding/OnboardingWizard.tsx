
import { useState, useEffect } from "react";
import { useOnboarding, OnboardingStep } from "../../hooks/use-onboarding";
import { X } from "lucide-react";

// Placeholder onboarding wizard component
export function OnboardingWizard() {
  const {
    currentStep,
    isVisible,
    profile,
    closeOnboarding,
    nextStep,
    prevStep,
    updateProfile,
    uploadResume,
  } = useOnboarding();

  // Don't render if not visible
  if (!isVisible) return null;

  // Helper function to render the current step
  const renderStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.WELCOME:
        return (
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Welcome to Careerate!</h2>
            <p className="text-muted-foreground">
              Let's set up your profile to provide you with personalized career guidance.
            </p>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              onClick={nextStep}
            >
              Get Started
            </button>
          </div>
        );

      case OnboardingStep.RESUME_UPLOAD:
        return (
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Upload Your Resume</h2>
            <p className="text-muted-foreground">
              Upload your resume to help us understand your skills and experience.
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  uploadResume(e.target.files[0]);
                }
              }}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20"
            />
            <div className="flex space-x-4">
              <button
                className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
                onClick={prevStep}
              >
                Back
              </button>
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                onClick={nextStep}
              >
                Skip for Now
              </button>
            </div>
          </div>
        );

      case OnboardingStep.COMPLETE:
        return (
          <div className="flex flex-col space-y-4 items-center">
            <h2 className="text-2xl font-bold text-foreground">All Done!</h2>
            <p className="text-muted-foreground">
              Your profile has been set up successfully. You're ready to start using Careerate!
            </p>
          </div>
        );

      // Placeholder for other steps 
      default:
        return (
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Step: {currentStep}</h2>
            <p className="text-muted-foreground">
              This step is under construction. Please check back later.
            </p>
            <div className="flex space-x-4">
              <button
                className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
                onClick={prevStep}
              >
                Back
              </button>
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                onClick={nextStep}
              >
                Continue
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 w-full max-w-md relative border">
        <button
          onClick={closeOnboarding}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>
        
        {/* Progress indicator */}
        <div className="w-full h-2 bg-secondary rounded-full mb-6">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${getProgressPercentage()}%`,
            }}
          />
        </div>
        
        {renderStepContent()}
      </div>
    </div>
  );

  // Calculate progress percentage based on current step
  function getProgressPercentage() {
    const totalSteps = Object.keys(OnboardingStep).length / 2 - 2; // Exclude CLOSED and COMPLETE
    const currentStepIndex = Object.values(OnboardingStep).indexOf(currentStep);
    const adjustedIndex = currentStepIndex - 1; // Adjust for CLOSED
    
    if (currentStep === OnboardingStep.CLOSED) return 0;
    if (currentStep === OnboardingStep.COMPLETE) return 100;
    
    return Math.max(5, Math.min(95, (adjustedIndex / totalSteps) * 100));
  }
}
