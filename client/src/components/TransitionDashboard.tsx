import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Transition } from "@/types";

interface TransitionDashboardProps {
  transition: Transition;
  scrapedCount: number;
}

const TransitionDashboard: React.FC<TransitionDashboardProps> = ({
  transition,
  scrapedCount,
}) => {
  // Mock success rate based on scraped count
  const successRate = Math.min(65 + (scrapedCount * 5), 90);
  const avgTransitionTime = 4.5; // Months

  // Common transition paths
  const commonPaths = [
    {
      id: 1,
      path: "Direct application after system design prep",
      successCount: "3/5",
    },
    {
      id: 2,
      path: "Via internal referral",
      successCount: "2/5",
    },
  ];

  return (
    <Card className="card rounded-xl p-6 shadow-glow-sm hover:shadow-glow transition duration-300">
      <CardContent className="p-0">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-heading font-semibold">
            Transition Overview
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary-light">
            {scrapedCount} transitions found
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">Success Rate</span>
              <span className="text-primary-light font-medium">
                {successRate}%
              </span>
            </div>
            <div className="skill-progress">
              <div
                className="skill-progress-bar"
                style={{ width: `${successRate}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">Avg. Transition Time</span>
              <span className="text-primary-light font-medium">
                {avgTransitionTime} months
              </span>
            </div>
            <div className="skill-progress">
              <div
                className="skill-progress-bar"
                style={{ width: `${(avgTransitionTime / 6) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-sm font-medium text-text-secondary mb-2">
              Common Paths
            </h4>
            <ul className="space-y-3">
              {commonPaths.map((path) => (
                <li
                  key={path.id}
                  className="flex items-center p-2 rounded bg-surface-dark/50"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-primary-light"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{path.path}</p>
                    <p className="text-xs text-text-muted">
                      {path.successCount} successful transitions
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransitionDashboard;
