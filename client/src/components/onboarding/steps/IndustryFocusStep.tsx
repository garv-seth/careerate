import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Check, Search, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge as BadgeIcon } from 'lucide-react';
import { agentColors } from '@/components/avatars/AgentAvatars';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type IndustryFocusStepProps = {
  data: {
    industryFocus?: string[];
  };
  updateData: (data: Partial<{ industryFocus: string[] }>) => void;
  onNext: () => void;
  onBack: () => void;
};

// Predefined industry options
const INDUSTRY_OPTIONS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail',
  'Government',
  'Entertainment',
  'Marketing',
  'Software Development',
  'Artificial Intelligence',
  'Data Science',
  'Cybersecurity',
  'Cloud Computing',
  'E-commerce',
  'Telecommunications',
  'Renewable Energy',
  'Pharmaceutical',
  'Biotechnology',
  'Automotive',
  'Aerospace',
  'Consulting',
  'Human Resources',
  'Real Estate',
  'Legal Services',
  'Food & Beverage',
  'Hospitality',
  'Travel & Tourism',
  'Logistics',
  'Construction'
];

export function IndustryFocusStep({ data, updateData, onNext, onBack }: IndustryFocusStepProps) {
  const [selected, setSelected] = useState<string[]>(data.industryFocus || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const mayaColors = agentColors.maya;

  const filteredOptions = INDUSTRY_OPTIONS.filter(
    option => option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (industry: string) => {
    if (selected.includes(industry)) {
      setSelected(selected.filter(item => item !== industry));
    } else {
      setSelected([...selected, industry]);
    }
  };

  const handleAddCustom = () => {
    if (customIndustry.trim() && !selected.includes(customIndustry.trim())) {
      const updatedSelected = [...selected, customIndustry.trim()];
      setSelected(updatedSelected);
      setCustomIndustry('');
    }
  };

  const handleRemove = (industry: string) => {
    setSelected(selected.filter(item => item !== industry));
  };

  const handleSubmit = () => {
    updateData({ industryFocus: selected });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Industry Focus</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`${mayaColors.border} ${mayaColors.text} hover:${mayaColors.bg} hover:text-white transition-colors cursor-help`}
                >
                  <BadgeIcon className="w-3 h-3 mr-1" />
                  Maya
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">
                  Maya, our Resume Analyzer AI, uses your industry preferences to better understand your career context.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-muted-foreground">
          Select the industries you're interested in or currently working in. You can select multiple options.
        </p>
      </div>

      {selected.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Selected Industries ({selected.length})</Label>
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map(industry => (
              <Badge key={industry} variant="secondary" className="pl-2 pr-1 py-1">
                {industry}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => handleRemove(industry)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search industries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="border-t border-b py-4">
            <ScrollArea className="h-60 pr-4">
              <div className="space-y-3">
                {filteredOptions.map(industry => (
                  <div key={industry} className="flex items-start space-x-2">
                    <Checkbox 
                      id={`industry-${industry}`} 
                      checked={selected.includes(industry)} 
                      onCheckedChange={() => handleToggle(industry)} 
                    />
                    <Label 
                      htmlFor={`industry-${industry}`} 
                      className="text-sm font-normal leading-none cursor-pointer"
                    >
                      {industry}
                    </Label>
                  </div>
                ))}
                {filteredOptions.length === 0 && searchTerm && (
                  <p className="text-sm text-muted-foreground italic">
                    No matching industries found.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Add custom industry..."
              value={customIndustry}
              onChange={(e) => setCustomIndustry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
            />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleAddCustom}
              disabled={!customIndustry.trim() || selected.includes(customIndustry.trim())}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={selected.length === 0}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}