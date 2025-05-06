import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, Plus, Trash2, Brain, AlertCircle, Shield, EyeOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { agentColors } from '@/components/avatars/AgentAvatars';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Skill = {
  name: string;
  level: number; // 1-10
  interest: number; // 1-10
};

type SkillsAssessmentStepProps = {
  data: {
    skills: Skill[];
    extractedSkills?: string[];
  };
  updateData: (data: Partial<{ skills: Skill[] }>) => void;
  onNext: () => void;
  onBack: () => void;
};

// Anti-cheating mechanism
const useAntiCheating = () => {
  const [focusEvents, setFocusEvents] = useState(0);
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);
  const timerRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Track tab visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setFocusEvents(prev => prev + 1);
      }
    };
    
    // Track window focus
    const handleBlur = () => {
      setFocusEvents(prev => prev + 1);
    };
    
    // Track mouse leaving the window
    const handleMouseLeave = () => {
      setFocusEvents(prev => prev + 1);
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    // Timer to check suspicious activity
    timerRef.current = window.setInterval(() => {
      if (focusEvents > 3) {
        setSuspiciousActivity(true);
      }
    }, 5000);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [focusEvents]);
  
  return { suspiciousActivity, focusEvents };
};

export function SkillsAssessmentStep({ data, updateData, onNext, onBack }: SkillsAssessmentStepProps) {
  const [newSkill, setNewSkill] = useState('');
  const [canProceed, setCanProceed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('manual');
  const ellieColors = agentColors.ellie;
  const { suspiciousActivity, focusEvents } = useAntiCheating();

  useEffect(() => {
    // Pre-populate skills from resume if available
    if (data.extractedSkills && data.extractedSkills.length > 0 && data.skills.length === 0) {
      const initialSkills = data.extractedSkills.map(skill => ({
        name: skill,
        level: 3, // Default to intermediate
        interest: 5 // Default to moderate interest
      }));
      updateData({ skills: initialSkills });
    }
    
    setCanProceed(data.skills.length > 0);
  }, [data.skills, data.extractedSkills]);

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
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Skills Assessment</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`${ellieColors.border} ${ellieColors.text} hover:${ellieColors.bg} hover:text-white transition-colors cursor-help`}
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Ellie
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">
                  Ellie, our Industry Analyst AI, helps identify skill gaps based on current market trends and opportunities.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-muted-foreground">
          Rate your skills and interest in developing them further based on your resume and career goals.
        </p>
      </div>

      {suspiciousActivity && (
        <Alert variant="destructive" className="animate-pulse">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Suspicious activity detected</AlertTitle>
          <AlertDescription>
            Please complete the assessment without switching tabs or applications for accurate results.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        <span>Anti-cheating measures are in place to ensure assessment accuracy</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="extracted" disabled={!data.extractedSkills?.length}>
            From Resume {data.extractedSkills?.length ? `(${data.extractedSkills.length})` : ''}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual" className="pt-4">
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
                  <Button variant="outline" onClick={addSkill} disabled={!newSkill.trim()}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="extracted" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    These skills were extracted from your resume by our AI
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {data.extractedSkills?.map((skill) => {
                    const isAdded = data.skills.some(s => s.name.toLowerCase() === skill.toLowerCase());
                    return (
                      <Badge
                        key={skill}
                        variant={isAdded ? "default" : "outline"}
                        className={`cursor-pointer ${isAdded ? "bg-primary" : ""}`}
                        onClick={() => {
                          if (!isAdded) {
                            const updatedSkills = [...data.skills, { name: skill, level: 3, interest: 5 }];
                            updateData({ skills: updatedSkills });
                          }
                        }}
                      >
                        {skill}
                        {isAdded && <span className="ml-1">✓</span>}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {data.skills.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Your Skills ({data.skills.length})</h3>
          
          {data.skills.map((skill, index) => (
            <Card key={skill.name} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">{skill.name}</h4>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeSkill(skill.name)} 
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label htmlFor={`level-${index}`}>Current Level</Label>
                      <span className="text-muted-foreground">{skill.level}/10</span>
                    </div>
                    <Slider 
                      id={`level-${index}`}
                      min={1} 
                      max={10} 
                      step={1} 
                      value={[skill.level]} 
                      onValueChange={([value]) => updateSkillLevel(skill.name, value)}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Beginner</span>
                      <span>Intermediate</span>
                      <span>Expert</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label htmlFor={`interest-${index}`}>Interest in Developing</Label>
                      <span className="text-muted-foreground">{skill.interest}/10</span>
                    </div>
                    <Slider 
                      id={`interest-${index}`}
                      min={1} 
                      max={10} 
                      step={1} 
                      value={[skill.interest]} 
                      onValueChange={([value]) => updateSkillInterest(skill.name, value)}
                      className="accent-secondary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low Priority</span>
                      <span>Moderate</span>
                      <span>High Priority</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 flex flex-col items-center text-center text-muted-foreground">
            <p>No skills added yet. Add skills manually or select from extracted skills.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}