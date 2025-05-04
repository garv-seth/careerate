import { motion } from 'framer-motion';
import { RocketIcon } from 'lucide-react';

interface WelcomeStepProps {
  contextual?: boolean;
}

export function WelcomeStep({ contextual = false }: WelcomeStepProps) {
  return (
    <motion.div
      className="text-center py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-center mb-6">
        <div className="bg-primary/10 p-4 rounded-full">
          <RocketIcon size={48} className="text-primary" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold mb-4">
        {contextual 
          ? "Let's Customize Your Experience" 
          : "Welcome to Careerate!"}
      </h2>
      
      <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
        {contextual 
          ? "This short questionnaire will help us tailor Careerate to match your unique career goals and learning preferences."
          : "We're excited to help accelerate your career growth. Let's set up your profile to provide you with the most personalized experience possible."}
      </p>
      
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
        <div className="p-4 border rounded-lg">
          <div className="font-semibold mb-1">Personalized</div>
          <div className="text-sm text-muted-foreground">Analysis tailored to your career path</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="font-semibold mb-1">Data-driven</div>
          <div className="text-sm text-muted-foreground">Insights based on real-world data</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="font-semibold mb-1">Actionable</div>
          <div className="text-sm text-muted-foreground">Clear steps to advance your career</div>
        </div>
      </div>
    </motion.div>
  );
}