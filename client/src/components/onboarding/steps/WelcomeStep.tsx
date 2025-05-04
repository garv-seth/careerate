import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingData } from "../OnboardingWizard";
import { motion } from "framer-motion";

interface WelcomeStepProps {
  data: OnboardingData;
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome to Careerate!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Your AI-powered career acceleration platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium text-lg mb-2 flex items-center">
                  <span className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center mr-2">1</span>
                  Personalized Career Insights
                </h3>
                <p className="text-muted-foreground">
                  Get strategic career advice powered by multiple specialized AI agents that analyze your skills and career goals.
                </p>
              </div>
              
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium text-lg mb-2 flex items-center">
                  <span className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center mr-2">2</span>
                  Career Trajectory Mapping
                </h3>
                <p className="text-muted-foreground">
                  Map your career path with clear milestones and alternative routes to achieve your professional goals.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium text-lg mb-2 flex items-center">
                  <span className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center mr-2">3</span>
                  Executive Network Access
                </h3>
                <p className="text-muted-foreground">
                  Connect with industry leaders and mentors through curated networking events and mentorship opportunities.
                </p>
              </div>
              
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium text-lg mb-2 flex items-center">
                  <span className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center mr-2">4</span>
                  Skills Gap Accelerator
                </h3>
                <p className="text-muted-foreground">
                  Identify and bridge your skills gaps with personalized learning paths and resources tailored to your career goals.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-primary/5 rounded-lg p-4 mt-4 border border-primary/20">
            <h3 className="font-medium text-center mb-2">Let's Get Started</h3>
            <p className="text-center text-muted-foreground">
              Complete this quick onboarding process to help us personalize your experience. 
              We'll ask about your career stage, goals, and skills to provide tailored recommendations.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={onNext} size="lg">
            Begin Onboarding
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}