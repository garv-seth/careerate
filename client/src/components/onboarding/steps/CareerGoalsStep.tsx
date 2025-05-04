import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingData } from "../OnboardingWizard";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";

interface CareerGoalsStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CareerGoalsStep({ data, updateData, onNext, onBack }: CareerGoalsStepProps) {
  const [industry, setIndustry] = useState<string>("");

  const addIndustry = () => {
    if (industry && !data.industryFocus.includes(industry)) {
      updateData({ industryFocus: [...data.industryFocus, industry] });
      setIndustry("");
    }
  };

  const removeIndustry = (industry: string) => {
    updateData({ 
      industryFocus: data.industryFocus.filter(i => i !== industry) 
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && industry) {
      e.preventDefault();
      addIndustry();
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
          <CardTitle className="text-2xl">Your Career Profile</CardTitle>
          <CardDescription>
            Tell us about your current career stage and goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="careerStage">Current Career Stage</Label>
            <RadioGroup 
              id="careerStage" 
              value={data.careerStage}
              onValueChange={value => updateData({ careerStage: value })}
              className="grid grid-cols-1 gap-2 pt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="early" id="early" />
                <Label htmlFor="early" className="font-normal">Early Career (0-2 years experience)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mid" id="mid" />
                <Label htmlFor="mid" className="font-normal">Mid Career (3-7 years experience)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="senior" id="senior" />
                <Label htmlFor="senior" className="font-normal">Senior Level (8-15 years experience)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="executive" id="executive" />
                <Label htmlFor="executive" className="font-normal">Executive (15+ years experience)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transitioning" id="transitioning" />
                <Label htmlFor="transitioning" className="font-normal">Career Transition</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industryFocus">Industry Focus</Label>
            <div className="flex space-x-2">
              <Input
                id="industryFocus"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add an industry (e.g. Healthcare, Technology)"
              />
              <Button type="button" onClick={addIndustry}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.industryFocus.map((ind, i) => (
                <Badge key={i} variant="secondary" className="px-3 py-1">
                  {ind}
                  <X 
                    className="ml-2 h-3 w-3 cursor-pointer" 
                    onClick={() => removeIndustry(ind)}
                  />
                </Badge>
              ))}
              {data.industryFocus.length === 0 && (
                <p className="text-sm text-muted-foreground">No industries added yet</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="careerGoals">Career Goals & Aspirations</Label>
            <Textarea
              id="careerGoals"
              value={data.careerGoals}
              onChange={(e) => updateData({ careerGoals: e.target.value })}
              placeholder="Describe your short and long-term career goals..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferredLearningStyle">Preferred Learning Style</Label>
              <Select 
                value={data.preferredLearningStyle}
                onValueChange={(value) => updateData({ preferredLearningStyle: value })}
              >
                <SelectTrigger id="preferredLearningStyle">
                  <SelectValue placeholder="Select your learning style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">Visual (videos, diagrams)</SelectItem>
                  <SelectItem value="auditory">Auditory (podcasts, discussions)</SelectItem>
                  <SelectItem value="reading">Reading (articles, books)</SelectItem>
                  <SelectItem value="hands-on">Hands-on (projects, practice)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeAvailability">Time Available for Development</Label>
              <Select 
                value={data.timeAvailability}
                onValueChange={(value) => updateData({ timeAvailability: value })}
              >
                <SelectTrigger id="timeAvailability">
                  <SelectValue placeholder="Select time availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal (1-2 hours/week)</SelectItem>
                  <SelectItem value="moderate">Moderate (3-5 hours/week)</SelectItem>
                  <SelectItem value="substantial">Substantial (6-10 hours/week)</SelectItem>
                  <SelectItem value="dedicated">Dedicated (10+ hours/week)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={!data.careerStage || data.industryFocus.length === 0 || !data.preferredLearningStyle || !data.timeAvailability}
          >
            Continue
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}