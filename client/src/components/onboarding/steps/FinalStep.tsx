import { motion } from 'framer-motion';
import { OnboardingData } from '../OnboardingWizard';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Clock, GraduationCap, Sparkles } from 'lucide-react';

interface FinalStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

export function FinalStep({ data, updateData }: FinalStepProps) {
  const handleLearningStyleChange = (value: string) => {
    updateData({
      preferredLearningStyle: value as OnboardingData['preferredLearningStyle']
    });
  };
  
  const handleTimeAvailabilityChange = (value: string) => {
    updateData({
      timeAvailability: value as OnboardingData['timeAvailability']
    });
  };

  return (
    <motion.div
      className="py-4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold mb-6">Learning Preferences</h2>
      
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <GraduationCap size={20} className="text-primary" />
            </div>
            <Label className="text-lg font-medium">Preferred Learning Style</Label>
          </div>
          
          <Select 
            value={data.preferredLearningStyle}
            onValueChange={handleLearningStyleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your preferred learning style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visual">
                Visual (charts, diagrams, videos)
              </SelectItem>
              <SelectItem value="auditory">
                Auditory (podcasts, discussions, lectures)
              </SelectItem>
              <SelectItem value="reading">
                Reading (articles, books, written material)
              </SelectItem>
              <SelectItem value="kinesthetic">
                Kinesthetic (practice, hands-on projects)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Clock size={20} className="text-primary" />
            </div>
            <Label className="text-lg font-medium">Time Availability</Label>
          </div>
          
          <RadioGroup 
            value={data.timeAvailability}
            onValueChange={handleTimeAvailabilityChange}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="minimal" id="minimal" className="mt-1" />
              <div className="grid gap-1">
                <label htmlFor="minimal" className="font-medium">Minimal</label>
                <p className="text-sm text-muted-foreground">
                  Less than 2 hours per week
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="moderate" id="moderate" className="mt-1" />
              <div className="grid gap-1">
                <label htmlFor="moderate" className="font-medium">Moderate</label>
                <p className="text-sm text-muted-foreground">
                  2-5 hours per week
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="significant" id="significant" className="mt-1" />
              <div className="grid gap-1">
                <label htmlFor="significant" className="font-medium">Significant</label>
                <p className="text-sm text-muted-foreground">
                  5+ hours per week
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-primary" />
            <h3 className="font-semibold">You're almost there!</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            After completing this step, our AI will analyze your profile and create a personalized
            career acceleration plan with tailored learning resources, industry insights, and
            skill development recommendations.
          </p>
        </div>
      </div>
    </motion.div>
  );
}