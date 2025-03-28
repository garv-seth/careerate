import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillGap } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowUp, Award, Star, Zap } from "lucide-react";
import LoadingIndicator from "@/components/common/LoadingIndicator";

interface SkillGapAnalysisProps {
  skillGaps: SkillGap[];
  loading?: boolean;
}

// Extract unique skills from skill gaps
interface MatchingSkill {
  name: string;
  strength: number;
  relevance: string;
  mentionCount: number;
}

interface SkillToImprove {
  name: string;
  priority: string;
  mentionCount: number;
}

const extractSkillsFromGaps = (gaps: SkillGap[]): string[] => {
  return [...new Set(gaps.map(gap => gap.skillName))];
};

const SkillGapAnalysis: React.FC<SkillGapAnalysisProps> = ({ skillGaps = [], loading = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("matching");

  // Use empty arrays for the initial state until skill gaps data is loaded
  const emptyMatchingSkills: MatchingSkill[] = [];
  const emptySkillsToImprove: SkillToImprove[] = [];

  // Safely check if skillGaps exists and has items
  const hasSkillGaps = Array.isArray(skillGaps) && skillGaps.length > 0;

  // Create matching skills directly from skill gaps with lower priority
  const matchingSkills = hasSkillGaps
    ? skillGaps
        .filter(gap => gap.gapLevel === "Low")
        .map(gap => ({
          name: gap.skillName,
          strength: 4, // Higher strength for low gap skills
          relevance: "High",
          mentionCount: gap.mentionCount || 1
        }))
    : emptyMatchingSkills;

  // Create skills to improve directly from skill gaps with medium to high priority
  const skillsToImprove = hasSkillGaps
    ? skillGaps
        .filter(gap => gap.gapLevel === "Medium" || gap.gapLevel === "High")
        .map(gap => ({
          name: gap.skillName,
          priority: gap.gapLevel,
          mentionCount: gap.mentionCount || 1
        }))
    : emptySkillsToImprove;

  // Sort skills to improve by priority
  const sortedImprovementSkills = [...skillsToImprove].sort((a, b) => {
    const levelOrder = { High: 3, Medium: 2, Low: 1 };
    const aPriority = typeof a.priority === 'string' ? levelOrder[a.priority as keyof typeof levelOrder] || 2 : 2;
    const bPriority = typeof b.priority === 'string' ? levelOrder[b.priority as keyof typeof levelOrder] || 2 : 2;
    return bPriority - aPriority;
  });

  // Display all or limited number based on expanded state
  const displayMatchingSkills = expanded ? matchingSkills : matchingSkills.slice(0, 5);
  const displayImprovementSkills = expanded ? sortedImprovementSkills : sortedImprovementSkills.slice(0, 5);

  // Get the strength indicator icon and color
  const getStrengthIndicator = (strength: number) => {
    if (strength >= 5) return <Award className="h-4 w-4 text-yellow-500" />;
    if (strength >= 4) return <Star className="h-4 w-4 text-blue-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    if (priority === "High") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    if (priority === "Medium") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  };

  return (
    <Card className="card rounded-xl p-6 shadow-glow-sm hover:shadow-glow transition duration-300">
      <CardContent className="p-0">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-heading font-semibold">
            Skills Analysis
          </h3>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary-light hover:text-primary flex items-center"
          >
            <span>{expanded ? "Show fewer skills" : "View all skills"}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ml-1 transform ${expanded ? "rotate-90" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <Tabs defaultValue="matching" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="matching" className="text-sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Matching Skills
            </TabsTrigger>
            <TabsTrigger value="improve" className="text-sm">
              <ArrowUp className="h-4 w-4 mr-2" />
              Skills to Improve
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="matching" className="mt-0">
            {loading || displayMatchingSkills.length === 0 ? (
              <LoadingIndicator message="We're analyzing your skills compared to the target role..." />
            ) : (
              <div className="space-y-4">
                {displayMatchingSkills.map((skill, idx) => (
                  <div key={idx} className="bg-surface-dark/30 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center">
                        {getStrengthIndicator(skill.strength)}
                        <span className="ml-2 font-medium">{skill.name}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="bg-primary/10 text-primary-light border-primary/20"
                      >
                        {skill.relevance} match
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-surface-lighter rounded-full h-1.5">
                        <div 
                          className="bg-gradient-to-r from-primary/50 to-primary h-1.5 rounded-full" 
                          style={{ width: `${skill.strength * 20}%` }}
                        ></div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">
                      This skill is highly relevant for successful transitions
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="improve" className="mt-0">
            {loading || displayImprovementSkills.length === 0 ? (
              <LoadingIndicator message="We're analyzing skills you need to develop for the target role..." />
            ) : (
              <div className="space-y-4">
                {displayImprovementSkills.map((skill, idx) => (
                  <div key={idx} className="bg-surface-dark/30 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{skill.name}</span>
                      <Badge 
                        className={`${getPriorityColor(skill.priority)}`}
                      >
                        {skill.priority} priority
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-text-muted mt-2">
                      <Zap className="h-3.5 w-3.5 mr-1.5 text-primary-light" />
                      <span>
                        Mentioned in {skill.mentionCount} transition {skill.mentionCount === 1 ? 'story' : 'stories'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">
                      Learn this skill to increase your chances of a successful transition
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SkillGapAnalysis;
