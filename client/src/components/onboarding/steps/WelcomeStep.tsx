import { motion } from 'framer-motion';
import { OnboardingData } from '../OnboardingWizard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Target, Users, BookOpen } from 'lucide-react';

interface WelcomeStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  nextStep: () => void;
}

export function WelcomeStep({ nextStep }: WelcomeStepProps) {
  return (
    <motion.div
      className="py-4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-3xl font-bold mb-4">Welcome to Careerate!</h1>
      
      <div className="mb-8">
        <p className="text-lg text-muted-foreground mb-6">
          Let's personalize your career acceleration journey with a quick onboarding process.
          We'll use this information to provide you with tailored recommendations and insights.
        </p>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-primary" size={20} />
            <h3 className="font-semibold">Why complete this onboarding?</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                <Target size={16} className="text-primary" />
              </div>
              <div>
                <p className="font-medium">Personalized Career Pathway</p>
                <p className="text-sm text-muted-foreground">Get a tailored career growth plan based on your goals</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                <Users size={16} className="text-primary" />
              </div>
              <div>
                <p className="font-medium">Executive Network Access</p>
                <p className="text-sm text-muted-foreground">Connect with industry leaders and mentors in your field</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                <BookOpen size={16} className="text-primary" />
              </div>
              <div>
                <p className="font-medium">Skills Gap Accelerator</p>
                <p className="text-sm text-muted-foreground">Identify and close skill gaps with personalized learning paths</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">5 steps</Badge>
          <Badge variant="outline" className="text-xs">~3 minutes</Badge>
        </div>
        
        <Button onClick={nextStep} className="gap-2">
          Get Started
          <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>
  );
}