import { motion } from 'framer-motion';
import { useState } from 'react';
import { OnboardingData } from '../OnboardingWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Slider
} from '@/components/ui/slider';
import { Trash2 } from 'lucide-react';

interface SkillsAssessmentStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

export function SkillsAssessmentStep({ data, updateData }: SkillsAssessmentStepProps) {
  const [newSkill, setNewSkill] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(3);
  const [newSkillInterest, setNewSkillInterest] = useState(5);

  const addSkill = () => {
    if (!newSkill.trim()) return;
    
    // Check if skill already exists
    if (data.skills.some(skill => skill.name.toLowerCase() === newSkill.toLowerCase())) {
      return;
    }
    
    const updatedSkills = [
      ...data.skills,
      {
        name: newSkill,
        level: newSkillLevel,
        interest: newSkillInterest
      }
    ];
    
    updateData({ skills: updatedSkills });
    
    // Reset form
    setNewSkill('');
    setNewSkillLevel(3);
    setNewSkillInterest(5);
  };

  const removeSkill = (index: number) => {
    const updatedSkills = [...data.skills];
    updatedSkills.splice(index, 1);
    updateData({ skills: updatedSkills });
  };

  return (
    <motion.div
      className="py-4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold mb-6">Skills Assessment</h2>
      
      <div className="space-y-6">
        <div className="bg-muted/40 p-4 rounded-lg">
          <p className="text-sm">
            Add your skills to help us understand your current proficiency and interests.
            This will allow us to provide more personalized recommendations.
          </p>
        </div>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="skill-name">Skill Name</Label>
            <Input
              id="skill-name"
              placeholder="e.g., Python, Project Management, UX Design"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <div className="flex justify-between">
              <Label htmlFor="skill-level">Current Proficiency (1-10)</Label>
              <span className="text-sm font-medium">{newSkillLevel}</span>
            </div>
            <Slider
              id="skill-level"
              min={1}
              max={10}
              step={1}
              value={[newSkillLevel]}
              onValueChange={(value) => setNewSkillLevel(value[0])}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Expert</span>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between">
              <Label htmlFor="skill-interest">Interest Level (1-10)</Label>
              <span className="text-sm font-medium">{newSkillInterest}</span>
            </div>
            <Slider
              id="skill-interest"
              min={1}
              max={10}
              step={1}
              value={[newSkillInterest]}
              onValueChange={(value) => setNewSkillInterest(value[0])}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low interest</span>
              <span>Moderate</span>
              <span>High interest</span>
            </div>
          </div>
          
          <Button 
            onClick={addSkill} 
            type="button" 
            className="w-full mt-2"
          >
            Add Skill
          </Button>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Your Skills</h3>
          
          {data.skills.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Proficiency</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.skills.map((skill, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{skill.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ width: `${(skill.level / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs">{skill.level}/10</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ width: `${(skill.interest / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs">{skill.interest}/10</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSkill(index)}
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-4 border rounded-md text-muted-foreground">
              No skills added yet. Add skills using the form above.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}