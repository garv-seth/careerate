import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingData } from "../OnboardingWizard";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Award } from "lucide-react";

interface FinalStepProps {
  data: OnboardingData;
  onComplete: () => void;
  onBack: () => void;
}

export function FinalStep({ data, onComplete, onBack }: FinalStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">All Set!</CardTitle>
          <CardDescription className="text-lg mt-2">
            You've completed the onboarding process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-lg">Your Profile</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Career Stage:</span>
                  <span className="font-medium">{displayCareerStage(data.careerStage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Industry Focus:</span>
                  <span className="font-medium">{data.industryFocus.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Learning Style:</span>
                  <span className="font-medium">{displayLearningStyle(data.preferredLearningStyle)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Available:</span>
                  <span className="font-medium">{displayTimeAvailability(data.timeAvailability)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skills Added:</span>
                  <span className="font-medium">{data.skills.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resume Uploaded:</span>
                  <span className="font-medium">{data.resumeFile ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-4 space-y-3 border border-primary/20">
              <h3 className="font-medium text-lg flex items-center">
                <Award className="mr-2 h-5 w-5 text-primary" />
                What's Next
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                  <span>Our AI agents will analyze your profile and generate personalized career insights</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                  <span>Explore your career path map with actionable milestones</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                  <span>Discover networking opportunities with industry leaders</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                  <span>Start your personalized skills development path</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <p className="font-medium">
              You can update your profile information at any time from your account settings
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onComplete} size="lg">
            Start Using Careerate
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function displayCareerStage(stage: string): string {
  const stageMap: Record<string, string> = {
    'early': 'Early Career (0-2 years)',
    'mid': 'Mid Career (3-7 years)',
    'senior': 'Senior Level (8-15 years)',
    'executive': 'Executive (15+ years)',
    'transitioning': 'Career Transition'
  };
  return stageMap[stage] || stage;
}

function displayLearningStyle(style: string): string {
  const styleMap: Record<string, string> = {
    'visual': 'Visual',
    'auditory': 'Auditory',
    'reading': 'Reading',
    'hands-on': 'Hands-on'
  };
  return styleMap[style] || style;
}

function displayTimeAvailability(time: string): string {
  const timeMap: Record<string, string> = {
    'minimal': 'Minimal (1-2 hrs/week)',
    'moderate': 'Moderate (3-5 hrs/week)',
    'substantial': 'Substantial (6-10 hrs/week)',
    'dedicated': 'Dedicated (10+ hrs/week)'
  };
  return timeMap[time] || time;
}