
import { useState, useEffect } from "react";
import { useOnboarding, OnboardingStep } from "../../hooks/use-onboarding";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";

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

  const [error, setError] = useState<string | null>(null);

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
            <Button
              className="w-full"
              onClick={nextStep}
            >
              Get Started
            </Button>
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
              onChange={async (e) => {
                setError(null);
                if (e.target.files && e.target.files[0]) {
                  try {
                    await uploadResume(e.target.files[0]);
                    nextStep();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to upload resume');
                  }
                }
              }}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex space-x-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={prevStep}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={nextStep}
              >
                Skip for Now
              </Button>
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

      default:
        return (
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Step: {currentStep}</h2>
            <p className="text-muted-foreground">
              This step is under construction. Please check back later.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={prevStep}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={nextStep}
              >
                Continue
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 w-full max-w-md relative border">
        <Button
          variant="ghost"
          size="icon"
          onClick={closeOnboarding}
          className="absolute right-4 top-4 hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
        
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

  function getProgressPercentage() {
    const totalSteps = Object.keys(OnboardingStep).length / 2 - 2;
    const currentStepIndex = Object.values(OnboardingStep).indexOf(currentStep);
    const adjustedIndex = currentStepIndex - 1;
    
    if (currentStep === OnboardingStep.CLOSED) return 0;
    if (currentStep === OnboardingStep.COMPLETE) return 100;
    
    return Math.max(5, Math.min(95, (adjustedIndex / totalSteps) * 100));
  }
}
