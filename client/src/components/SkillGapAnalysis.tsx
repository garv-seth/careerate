import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SkillGap } from "@/types";

interface SkillGapAnalysisProps {
  skillGaps: SkillGap[];
}

const SkillGapAnalysis: React.FC<SkillGapAnalysisProps> = ({ skillGaps }) => {
  // Sort skill gaps by gap level and mention count
  const sortedGaps = [...skillGaps].sort((a, b) => {
    const gapLevelScore = { "High": 3, "Medium": 2, "Low": 1 };
    return (
      gapLevelScore[b.gapLevel] - gapLevelScore[a.gapLevel] ||
      b.mentionCount - a.mentionCount
    );
  });

  // Limit to top 4 skills for display
  const displayGaps = sortedGaps.slice(0, 4);

  // Calculate confidence score percentage
  const getConfidencePercentage = (gap: SkillGap) => {
    return gap.confidenceScore ? 
      Math.min(Math.max(gap.confidenceScore, 0), 100) : 
      (gap.mentionCount * 15) + 30;
  };

  return (
    <Card className="card rounded-xl p-6 shadow-glow-sm hover:shadow-glow transition duration-300">
      <CardContent className="p-0">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-heading font-semibold">
            Skill Gap Analysis
          </h3>
          <button className="text-xs text-primary-light hover:text-primary flex items-center">
            <span>View all skills</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1"
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

        <div className="space-y-4">
          {displayGaps.length > 0 ? (
            displayGaps.map((gap) => (
              <div key={gap.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{gap.skillName}</span>
                  <span className="text-primary-light">
                    <span className="font-medium">{gap.gapLevel}</span> gap
                  </span>
                </div>
                <div className="skill-progress">
                  <div
                    className="skill-progress-bar"
                    style={{
                      width: `${100 - getConfidencePercentage(gap)}%`,
                    }}
                  ></div>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Mentioned in {gap.mentionCount}/
                  {Math.max(gap.mentionCount, 5)} transition stories
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-text-secondary">
                Analyzing skill gaps...
              </p>
              <div className="mt-2 flex justify-center">
                <svg
                  className="animate-spin h-6 w-6 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SkillGapAnalysis;
