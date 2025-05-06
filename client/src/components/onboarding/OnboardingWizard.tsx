import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  Home
} from 'lucide-react';
import { WelcomeStep } from './steps/WelcomeStep';
import { ResumeUploadStep } from './steps/ResumeUploadStep';
import { CareerStageStep } from './steps/CareerStageStep';
import { IndustryFocusStep } from './steps/IndustryFocusStep';
import { CareerGoalsStep } from './steps/CareerGoalsStep';
import { LearningPreferencesStep } from './steps/LearningPreferencesStep';
import { TimeAvailabilityStep } from './steps/TimeAvailabilityStep';
import { SkillsAssessmentStep } from './steps/SkillsAssessmentStep';
import { AgentStatusGroup, AgentStatus } from '@/components/avatars/AgentAvatars';

export function OnboardingWizard() {
  const [, setLocation] = useLocation();
  const {
    data,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    totalSteps,
    isLoading,
    isComplete,
    resumeFile,
    setResumeFile,
    uploadResume,
    isUploading,
    uploadError,
    uploadSuccess,
    submitOnboarding,
    isSubmitting
  } = useOnboarding();

  // Agent status management
  const [caraStatus, setCaraStatus] = useState<'idle' | 'active' | 'thinking' | 'complete'>('idle');
  const [mayaStatus, setMayaStatus] = useState<'idle' | 'active' | 'thinking' | 'complete'>('idle');
  const [ellieStatus, setEllieStatus] = useState<'idle' | 'active' | 'thinking' | 'complete'>('idle');
  const [sophiaStatus, setSophiaStatus] = useState<'idle' | 'active' | 'thinking' | 'complete'>('idle');

  // Set agent statuses based on current step
  useEffect(() => {
    // Reset all to idle
    let newCaraStatus: 'idle' | 'active' | 'thinking' | 'complete' = 'idle';
    let newMayaStatus: 'idle' | 'active' | 'thinking' | 'complete' = 'idle';
    let newEllieStatus: 'idle' | 'active' | 'thinking' | 'complete' = 'idle';
    let newSophiaStatus: 'idle' | 'active' | 'thinking' | 'complete' = 'idle';
    
    // Set active based on step
    if (data.currentStep === 1) {
      // Resume upload - Maya is active
      newMayaStatus = resumeFile && uploadSuccess ? 'complete' : (isUploading ? 'active' : 'idle');
    } else if (data.currentStep >= 2 && data.currentStep <= 3) {
      // Career stage and industry focus - Cara is active
      newCaraStatus = 'active';
      newMayaStatus = uploadSuccess ? 'complete' : 'idle';
    } else if (data.currentStep === 4) {
      // Career goals - Cara is active
      newCaraStatus = 'active';
      newMayaStatus = uploadSuccess ? 'complete' : 'idle';
    } else if (data.currentStep >= 5 && data.currentStep <= 6) {
      // Learning preferences and time availability - Sophia is active
      newSophiaStatus = 'active';
      newCaraStatus = data.careerGoals ? 'complete' : 'active';
      newMayaStatus = uploadSuccess ? 'complete' : 'idle';
    } else if (data.currentStep === 7) {
      // Skills assessment - Ellie is active
      newEllieStatus = 'active';
      newSophiaStatus = data.preferredLearningStyle && data.timeAvailability ? 'complete' : 'active';
      newCaraStatus = data.careerGoals ? 'complete' : 'idle';
      newMayaStatus = uploadSuccess ? 'complete' : 'idle';
    }
    
    setCaraStatus(newCaraStatus);
    setMayaStatus(newMayaStatus);
    setEllieStatus(newEllieStatus);
    setSophiaStatus(newSophiaStatus);
  }, [data.currentStep, isUploading, uploadSuccess, resumeFile, data.careerGoals, data.preferredLearningStyle, data.timeAvailability]);

  // Handle resume file selection
  const handleFileSelect = (file: File | null) => {
    setResumeFile(file);
  };

  // Handle wizard completion
  const handleComplete = async () => {
    try {
      await submitOnboarding();
      setLocation('/dashboard');
    } catch (error) {
      console.error('Failed to submit onboarding data:', error);
    }
  };

  // Return to dashboard
  const handleExit = () => {
    setLocation('/dashboard');
  };

  // Determine which step component to render
  const renderStep = () => {
    switch(data.currentStep) {
      case 0:
        return <WelcomeStep onNext={nextStep} />;
      case 1:
        return (
          <ResumeUploadStep 
            onFileSelect={handleFileSelect}
            onFileUpload={uploadResume}
            uploadedFile={resumeFile}
            isUploading={isUploading}
            uploadError={uploadError}
            uploadSuccess={uploadSuccess}
            onNext={nextStep}
            onBack={prevStep}
            extractedSkills={data.extractedSkills}
          />
        );
      case 2:
        return (
          <CareerStageStep 
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <IndustryFocusStep 
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <CareerGoalsStep 
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <LearningPreferencesStep 
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 6:
        return (
          <TimeAvailabilityStep 
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 7:
        return (
          <SkillsAssessmentStep 
            data={data}
            updateData={updateData}
            onNext={handleComplete}
            onBack={prevStep}
          />
        );
      default:
        return <WelcomeStep onNext={nextStep} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header with progress */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Careerate Onboarding
            {isComplete && <CheckCircle2 className="text-green-500 h-5 w-5" />}
          </h1>
          <p className="text-muted-foreground">
            {data.currentStep > 0 ? `Step ${data.currentStep} of ${totalSteps - 1}` : 'Welcome'}
          </p>
        </div>
        
        {data.currentStep > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExit}>
              <Home className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {data.currentStep > 0 && (
        <div className="w-full bg-muted rounded-full h-2 mb-6">
          <div 
            className="bg-primary rounded-full h-2 transition-all duration-300 ease-in-out"
            style={{ width: `${((data.currentStep) / (totalSteps - 1)) * 100}%` }}
          ></div>
        </div>
      )}

      {/* Step content */}
      <Card className="p-6 shadow-lg">
        {renderStep()}
      </Card>

      {/* Agent status panel */}
      {data.currentStep > 0 && (
        <div className="mt-8 bg-muted/40 p-4 rounded-lg border">
          <h3 className="text-sm font-medium mb-3">AI Agent Activity</h3>
          <AgentStatusGroup
            statuses={[
              { 
                agent: 'cara',
                status: caraStatus,
                message: caraStatus === 'active' ? 'Analyzing your career preferences' : undefined
              },
              { 
                agent: 'maya',
                status: mayaStatus,
                message: mayaStatus === 'active' ? 'Processing your resume' : undefined
              },
              { 
                agent: 'ellie',
                status: ellieStatus,
                message: ellieStatus === 'active' ? 'Analyzing industry trends and skills' : undefined
              },
              { 
                agent: 'sophia',
                status: sophiaStatus,
                message: sophiaStatus === 'active' ? 'Preparing learning recommendations' : undefined
              }
            ]}
          />
        </div>
      )}
    </div>
  );
}