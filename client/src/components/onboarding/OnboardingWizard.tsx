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
            <h2 className="text-2xl font-bold">Welcome to Careerate!</h2>
            <p>
              Let's set up your profile to provide you with personalized career guidance.
            </p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={nextStep}
            >
              Get Started
            </button>
          </div>
        );

      case OnboardingStep.RESUME_UPLOAD:
        return (
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-bold">Upload Your Resume</h2>
            <p>
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
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <div className="flex space-x-4">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md"
                onClick={prevStep}
              >
                Back
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
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
            <h2 className="text-2xl font-bold">All Done!</h2>
            <p>
              Your profile has been set up successfully. You're ready to start using Careerate!
            </p>
          </div>
        );

      // Placeholder for other steps 
      default:
        return (
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-bold">Step: {currentStep}</h2>
            <p>
              This step is under construction. Please check back later.
            </p>
            <div className="flex space-x-4">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md"
                onClick={prevStep}
              >
                Back
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          onClick={closeOnboarding}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        
        {/* Progress indicator */}
        <div className="w-full h-2 bg-gray-200 rounded-full mb-6">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{
              width: `${getProgressPercentage()}%`,
              transition: "width 0.3s ease-in-out",
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