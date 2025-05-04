import { motion } from 'framer-motion';
import { OnboardingData } from '../OnboardingWizard';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface CareerGoalsStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

const careerStages = [
  { value: 'student', label: 'Student' },
  { value: 'entry', label: 'Entry-Level Professional (0-2 years)' },
  { value: 'mid', label: 'Mid-Level Professional (3-5 years)' },
  { value: 'senior', label: 'Senior Professional (6-10 years)' },
  { value: 'executive', label: 'Executive (10+ years)' },
  { value: 'career-change', label: 'Career Changer' }
];

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Marketing',
  'Retail',
  'Manufacturing',
  'Legal',
  'Creative Arts',
  'Engineering',
  'Hospitality',
  'Real Estate',
  'Consulting',
  'Non-profit',
  'Government',
  'Media'
];

export function CareerGoalsStep({ data, updateData }: CareerGoalsStepProps) {
  const handleIndustrySelect = (industry: string) => {
    const currentIndustries = [...(data.industryFocus || [])];
    
    if (currentIndustries.includes(industry)) {
      // Remove industry if already selected
      updateData({
        industryFocus: currentIndustries.filter(item => item !== industry)
      });
    } else {
      // Add industry if not already selected (limit to 3)
      if (currentIndustries.length < 3) {
        updateData({
          industryFocus: [...currentIndustries, industry]
        });
      }
    }
  };
  
  return (
    <motion.div
      className="py-4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold mb-6">Career Profile</h2>
      
      <div className="space-y-8">
        <div>
          <Label className="text-base font-medium block mb-3">
            What stage are you at in your career?
          </Label>
          
          <RadioGroup
            value={data.careerStage}
            onValueChange={(value) => updateData({ careerStage: value })}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {careerStages.map(stage => (
              <div key={stage.value} className="flex items-start space-x-2">
                <RadioGroupItem value={stage.value} id={stage.value} className="mt-1" />
                <div className="grid gap-1">
                  <label htmlFor={stage.value} className="font-medium">
                    {stage.label}
                  </label>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        <div>
          <Label className="text-base font-medium block mb-2">
            Which industries are you most interested in?
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Select up to 3)
            </span>
          </Label>
          
          <div className="flex flex-wrap gap-2 mt-3">
            {industries.map(industry => (
              <Badge
                key={industry}
                variant={data.industryFocus?.includes(industry) ? "default" : "outline"}
                className="cursor-pointer py-1.5 px-3"
                onClick={() => handleIndustrySelect(industry)}
              >
                {industry}
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <Label htmlFor="career-goals" className="text-base font-medium block mb-2">
            What are your primary career goals?
          </Label>
          <Textarea
            id="career-goals"
            placeholder="e.g., I want to advance to a senior leadership position in product management within the next 5 years..."
            value={data.careerGoals}
            onChange={(e) => updateData({ careerGoals: e.target.value })}
            className="min-h-[120px]"
          />
        </div>
      </div>
    </motion.div>
  );
}