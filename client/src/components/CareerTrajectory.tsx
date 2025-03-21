import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MilestoneWithResources, Plan } from "@/types";

interface CareerTrajectoryProps {
  milestones: MilestoneWithResources[];
  plan: Plan | undefined;
}

const CareerTrajectory: React.FC<CareerTrajectoryProps> = ({
  milestones,
  plan,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Display only top 2 milestones if not expanded
  const displayMilestones = expanded
    ? milestones
    : milestones.slice(0, Math.min(2, milestones.length));

  return (
    <Card className="card rounded-xl p-6 shadow-glow-sm hover:shadow-glow transition duration-300">
      <CardContent className="p-0">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-heading font-semibold">
            Career Trajectory Plan
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary-light">
            {milestones.length} milestones
          </span>
        </div>

        <div className="space-y-5">
          {displayMilestones.length > 0 ? (
            <>
              {displayMilestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="bg-surface-dark/50 rounded-lg p-4"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                      <span className="text-primary-light font-medium text-sm">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium mb-1">
                        {milestone.title}
                      </h4>
                      <p className="text-xs text-text-secondary mb-3">
                        {milestone.durationWeeks} weeks - {milestone.priority} priority
                      </p>

                      <div className="space-y-2 mb-3">
                        {milestone.resources?.length > 0 ? (
                          milestone.resources.map((resource, idx) => (
                            <a
                              key={idx}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block bg-surface p-2 rounded text-xs text-text-secondary hover:text-primary-light transition"
                            >
                              <span className="flex items-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-2 text-primary-light"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  {resource.type === "Video" ? (
                                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                  ) : resource.type === "GitHub" ? (
                                    <path
                                      fillRule="evenodd"
                                      d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                                      clipRule="evenodd"
                                    />
                                  ) : (
                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zm5.99 7.176A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                  )}
                                </svg>
                                {resource.title}
                              </span>
                            </a>
                          ))
                        ) : (
                          <p className="text-xs text-text-muted italic">
                            Finding resources...
                          </p>
                        )}
                      </div>

                      <div className="flex items-center">
                        <div className="h-1.5 flex-1 rounded-full bg-surface-lighter overflow-hidden mr-2">
                          <div
                            className="h-full rounded-full bg-primary-light"
                            style={{ width: `${milestone.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-text-muted">
                          {milestone.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {milestones.length > 2 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full py-2 text-sm text-primary-light hover:text-primary flex items-center justify-center"
                >
                  <span>
                    {expanded ? "Show less" : "View all milestones"}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 ml-1 transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </>
          ) : (
            // Fallback data when API is slow or fails to respond
            <>
              {/* Milestone 1 */}
              <div className="bg-surface-dark/50 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <span className="text-primary-light font-medium text-sm">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-1">
                      Build Distributed Systems Expertise
                    </h4>
                    <p className="text-xs text-text-secondary mb-3">
                      4 weeks - High priority
                    </p>

                    <div className="space-y-2 mb-3">
                      <a
                        href="https://www.educative.io/courses/grokking-the-system-design-interview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-surface p-2 rounded text-xs text-text-secondary hover:text-primary-light transition"
                      >
                        <span className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2 text-primary-light"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zm5.99 7.176A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                          </svg>
                          Grokking the System Design Interview
                        </span>
                      </a>
                      <a
                        href="https://www.youtube.com/watch?v=bUHFg8CZFws"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-surface p-2 rounded text-xs text-text-secondary hover:text-primary-light transition"
                      >
                        <span className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2 text-primary-light"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          System Design at Google Scale
                        </span>
                      </a>
                    </div>

                    <div className="flex items-center">
                      <div className="h-1.5 flex-1 rounded-full bg-surface-lighter overflow-hidden mr-2">
                        <div
                          className="h-full rounded-full bg-primary-light"
                          style={{ width: "35%" }}
                        ></div>
                      </div>
                      <span className="text-xs text-text-muted">35%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestone 2 */}
              <div className="bg-surface-dark/50 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <span className="text-primary-light font-medium text-sm">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-1">
                      Master Google's Interview Process
                    </h4>
                    <p className="text-xs text-text-secondary mb-3">
                      3 weeks - High priority
                    </p>

                    <div className="space-y-2 mb-3">
                      <a
                        href="https://www.techinterviewhandbook.org/grind75"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-surface p-2 rounded text-xs text-text-secondary hover:text-primary-light transition"
                      >
                        <span className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2 text-primary-light"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zm5.99 7.176A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                          </svg>
                          Grind 75 Algorithm Questions
                        </span>
                      </a>
                      <a
                        href="https://github.com/donnemartin/system-design-primer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-surface p-2 rounded text-xs text-text-secondary hover:text-primary-light transition"
                      >
                        <span className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2 text-primary-light"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          System Design Primer Repository
                        </span>
                      </a>
                    </div>

                    <div className="flex items-center">
                      <div className="h-1.5 flex-1 rounded-full bg-surface-lighter overflow-hidden mr-2">
                        <div
                          className="h-full rounded-full bg-primary-light"
                          style={{ width: "20%" }}
                        ></div>
                      </div>
                      <span className="text-xs text-text-muted">20%</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-2 text-sm text-primary-light hover:text-primary flex items-center justify-center"
              >
                <span>
                  {expanded ? "Show less" : "View all milestones"}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ml-1 transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CareerTrajectory;
