import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Transition } from "@/types";
import { apiRequest } from "@/lib/queryClient";

interface TransitionDashboardProps {
  transition: Transition;
  scrapedCount: number;
}

interface TransitionInsight {
  successRate: number;
  avgTransitionTime: number;
  commonPaths: {
    path: string;
    count: number;
  }[];
}

const TransitionDashboard: React.FC<TransitionDashboardProps> = ({
  transition,
  scrapedCount,
}) => {
  const [insights, setInsights] = useState<TransitionInsight | null>(null);
  const [loading, setLoading] = useState(true);

  // Load transition insights data
  useEffect(() => {
    if (!transition.id) return;

    const loadInsights = async () => {
      try {
        const response = await apiRequest(`/api/insights/${transition.id}`);

        if (response && response.success && response.insights) {
          setInsights(response.insights);
        }
      } catch (error) {
        console.error("Error loading insights:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [transition.id, scrapedCount]);

  // Use data from API only
  const successRate = insights?.successRate || 0;
  const avgTransitionTime = insights?.avgTransitionTime || 0;
  const commonPaths = insights?.commonPaths || [];

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

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg
              className="animate-spin h-8 w-8 text-primary"
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
            <span className="ml-3 text-sm text-text-secondary">Loading real transition data...</span>
          </div>
        ) : insights ? (
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
              {commonPaths.length > 0 ? (
                <ul className="space-y-3">
                  {commonPaths.map((path, index) => (
                    <li
                      key={index}
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
                          {path.count}/5 successful transitions
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary py-2">
                  No common paths available yet. Please wait while Cara analyzes more transitions.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-text-secondary">
              No transition data available yet. Please wait while Cara gathers insights from real career transitions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransitionDashboard;
