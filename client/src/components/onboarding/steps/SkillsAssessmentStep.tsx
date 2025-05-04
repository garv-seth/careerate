import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingData } from "../OnboardingWizard";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import { useState } from "react";

interface SkillsAssessmentStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SkillsAssessmentStep({ data, updateData, onNext, onBack }: SkillsAssessmentStepProps) {
  const [skillName, setSkillName] = useState<string>("");
  const [skillLevel, setSkillLevel] = useState<number>(5);
  const [skillInterest, setSkillInterest] = useState<number>(5);

  const addSkill = () => {
    if (skillName.trim()) {
      // Check if the skill already exists
      const existingSkillIndex = data.skills.findIndex(
        skill => skill.name.toLowerCase() === skillName.toLowerCase()
      );

      if (existingSkillIndex >= 0) {
        // Update existing skill
        const updatedSkills = [...data.skills];
        updatedSkills[existingSkillIndex] = {
          name: skillName,
          level: skillLevel,
          interest: skillInterest
        };
        updateData({ skills: updatedSkills });
      } else {
        // Add new skill
        updateData({
          skills: [
            ...data.skills,
            {
              name: skillName,
              level: skillLevel,
              interest: skillInterest
            }
          ]
        });
      }
      
      // Reset inputs
      setSkillName("");
      setSkillLevel(5);
      setSkillInterest(5);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    updateData({
      skills: data.skills.filter(skill => skill.name !== skillToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillName) {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Skills Assessment</CardTitle>
          <CardDescription>
            Rate your current skills and interest levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skillName">Skill Name</Label>
              <Input
                id="skillName"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a skill (e.g. Project Management, JavaScript)"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="skillLevel">Current Proficiency (1-10)</Label>
                <span className="text-sm font-medium">{skillLevel}</span>
              </div>
              <Slider
                id="skillLevel"
                min={1}
                max={10}
                step={1}
                value={[skillLevel]}
                onValueChange={(values) => setSkillLevel(values[0])}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Beginner</span>
                <span>Intermediate</span>
                <span>Expert</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="skillInterest">Interest Level (1-10)</Label>
                <span className="text-sm font-medium">{skillInterest}</span>
              </div>
              <Slider
                id="skillInterest"
                min={1}
                max={10}
                step={1}
                value={[skillInterest]}
                onValueChange={(values) => setSkillInterest(values[0])}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Interest</span>
                <span>Moderate</span>
                <span>High Interest</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              onClick={addSkill} 
              disabled={!skillName.trim()}
              className="w-full"
            >
              Add Skill
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label>Your Skills</Label>
            {data.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills added yet. Add at least 3 skills to continue.</p>
            ) : (
              <div className="space-y-3 mt-2">
                {data.skills.map((skill, index) => (
                  <div key={index} className="flex items-center justify-between border rounded-md p-3">
                    <div className="flex-1">
                      <div className="font-medium">{skill.name}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                        <div>
                          <span className="text-muted-foreground">Proficiency:</span> {skill.level}/10
                        </div>
                        <div>
                          <span className="text-muted-foreground">Interest:</span> {skill.interest}/10
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeSkill(skill.name)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={data.skills.length < 3}
          >
            Continue
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}