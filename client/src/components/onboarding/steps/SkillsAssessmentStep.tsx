import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { OnboardingData } from '../OnboardingWizard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

type SkillsAssessmentStepProps = {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
};

type Skill = {
  name: string;
  level: number;
  interest: number;
};

export function SkillsAssessmentStep({ data, updateData, onNext, onBack }: SkillsAssessmentStepProps) {
  const [newSkill, setNewSkill] = useState('');
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    setCanProceed(data.skills.length > 0);
  }, [data.skills]);

  const addSkill = () => {
    if (newSkill.trim() && !data.skills.some(skill => skill.name.toLowerCase() === newSkill.toLowerCase())) {
      const updatedSkills = [...data.skills, { name: newSkill, level: 3, interest: 5 }];
      updateData({ skills: updatedSkills });
      setNewSkill('');
    }
  };

  const removeSkill = (skillName: string) => {
    const updatedSkills = data.skills.filter(skill => skill.name !== skillName);
    updateData({ skills: updatedSkills });
  };

  const updateSkillLevel = (skillName: string, level: number) => {
    const updatedSkills = data.skills.map(skill => 
      skill.name === skillName ? { ...skill, level } : skill
    );
    updateData({ skills: updatedSkills });
  };

  const updateSkillInterest = (skillName: string, interest: number) => {
    const updatedSkills = data.skills.map(skill => 
      skill.name === skillName ? { ...skill, interest } : skill
    );
    updateData({ skills: updatedSkills });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Skills Assessment</h2>
        <p className="text-muted-foreground">
          Add your skills and rate your current level and interest in developing them further.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill (e.g., JavaScript, Project Management, Data Analysis)"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button variant="outline" onClick={addSkill}>
                <Plus size={16} />
              </Button>
            </div>

            <div className="space-y-4">
              {data.skills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No skills added yet. Add your skills to continue.
                </div>
              ) : (
                data.skills.map((skill, index) => (
                  <div key={index} className="bg-muted/50 rounded-md p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{skill.name}</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSkill(skill.name)}
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Current Skill Level</Label>
                        <span className="text-sm font-medium">
                          {skill.level}/5 - {
                            skill.level === 1 ? 'Beginner' : 
                            skill.level === 2 ? 'Basic' : 
                            skill.level === 3 ? 'Intermediate' : 
                            skill.level === 4 ? 'Advanced' : 'Expert'
                          }
                        </span>
                      </div>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[skill.level]}
                        onValueChange={(value) => updateSkillLevel(skill.name, value[0])}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Interest in Developing</Label>
                        <span className="text-sm font-medium">
                          {skill.interest}/10 - {
                            skill.interest <= 3 ? 'Low Interest' : 
                            skill.interest <= 7 ? 'Moderate Interest' : 'High Interest'
                          }
                        </span>
                      </div>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[skill.interest]}
                        onValueChange={(value) => updateSkillInterest(skill.name, value[0])}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          Next
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}