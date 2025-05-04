import { motion } from 'framer-motion';
import { OnboardingData } from '../OnboardingWizard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';

interface CareerGoalsStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

const industryOptions = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Marketing',
  'Design',
  'Entertainment',
  'Consulting',
  'Government',
  'Non-profit',
  'Energy',
  'Legal'
];

export function CareerGoalsStep({ data, updateData }: CareerGoalsStepProps) {
  const [newIndustry, setNewIndustry] = useState('');

  const handleCareerStageChange = (value: string) => {
    updateData({ 
      careerStage: value as OnboardingData['careerStage']
    });
  };

  const handleAddIndustry = () => {
    if (!newIndustry) return;
    
    if (!data.industryFocus.includes(newIndustry)) {
      updateData({
        industryFocus: [...data.industryFocus, newIndustry]
      });
    }
    
    setNewIndustry('');
  };

  const handleRemoveIndustry = (industry: string) => {
    updateData({
      industryFocus: data.industryFocus.filter(i => i !== industry)
    });
  };

  const handleSelectIndustry = (industry: string) => {
    if (!data.industryFocus.includes(industry)) {
      updateData({
        industryFocus: [...data.industryFocus, industry]
      });
    }
    setNewIndustry('');
  };

  return (
    <motion.div
      className="py-4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold mb-6">Career Profile</h2>
      
      <div className="space-y-6">
        <div>
          <Label htmlFor="career-stage">Career Stage</Label>
          <Select
            value={data.careerStage}
            onValueChange={handleCareerStageChange}
          >
            <SelectTrigger id="career-stage" className="mt-1">
              <SelectValue placeholder="Select your career stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="early">Early Career (0-3 years)</SelectItem>
              <SelectItem value="mid">Mid Career (4-10 years)</SelectItem>
              <SelectItem value="senior">Senior Professional (10+ years)</SelectItem>
              <SelectItem value="leadership">Leadership/Executive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Industry Focus</Label>
          <div className="flex items-center mt-1 mb-2 gap-2">
            <Select onValueChange={handleSelectIndustry}>
              <SelectTrigger className="flex-grow">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industryOptions.map(industry => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Input
                placeholder="Or type custom industry..."
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                className="flex-grow"
              />
              <Button type="button" onClick={handleAddIndustry}>Add</Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {data.industryFocus.map(industry => (
              <Badge key={industry} variant="secondary" className="flex items-center gap-1">
                {industry}
                <X 
                  size={14} 
                  className="cursor-pointer" 
                  onClick={() => handleRemoveIndustry(industry)}
                />
              </Badge>
            ))}
            {data.industryFocus.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No industries selected
              </div>
            )}
          </div>
        </div>
        
        <div>
          <Label htmlFor="career-goals">Career Goals</Label>
          <Textarea
            id="career-goals"
            placeholder="Describe your career goals and aspirations in the next 1-3 years..."
            className="mt-1"
            rows={4}
            value={data.careerGoals}
            onChange={(e) => updateData({ careerGoals: e.target.value })}
          />
        </div>
      </div>
    </motion.div>
  );
}