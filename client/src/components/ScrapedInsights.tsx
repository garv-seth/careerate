import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Insight, Transition } from "@/types";

interface ScrapedInsightsProps {
  insights: Insight[];
  transition: Transition;
}

const ScrapedInsights: React.FC<ScrapedInsightsProps> = ({
  insights,
  transition,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Group insights by type
  const observations = insights.filter((i) => i.type === "observation");
  const challenges = insights.filter((i) => i.type === "challenge");
  const stories = insights.filter((i) => i.type === "story");

  // Display only one story if not expanded
  const displayStories = expanded ? stories : stories.slice(0, 1);

  return (
    <Card className="card rounded-xl p-6 shadow-glow mb-8">
      <CardContent className="p-0">
        <h2 className="text-xl font-heading font-semibold mb-6">
          Insights from Similar Transitions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-primary-light"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Key Observations
            </h3>

            <ul className="space-y-3">
              {observations.length > 0 ? (
                observations.map((observation) => (
                  <li key={observation.id} className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary-light mr-2 mt-0.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-text-secondary">
                      <span className="text-text font-medium">
                        Interview focus shift:
                      </span>{" "}
                      {observation.content}
                    </p>
                  </li>
                ))
              ) : (
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-primary-light mr-2 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-text-secondary">
                    <span className="text-text font-medium">
                      Interview focus shift:
                    </span>{" "}
                    {transition.currentRole} interviews typically emphasize different skills than {transition.targetRole}.
                  </p>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-primary-light"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              Common Challenges
            </h3>

            <ul className="space-y-3">
              {challenges.length > 0 ? (
                challenges.map((challenge) => (
                  <li key={challenge.id} className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary-light mr-2 mt-0.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-text-secondary">
                      <span className="text-text font-medium">
                        Technical challenges:
                      </span>{" "}
                      {challenge.content}
                    </p>
                  </li>
                ))
              ) : (
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-primary-light mr-2 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-text-secondary">
                    <span className="text-text font-medium">
                      Technical challenges:
                    </span>{" "}
                    Transitioning from {transition.currentRole} to {transition.targetRole} involves adapting to new technical expectations and requirements.
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-surface-lighter">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-primary-light"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clipRule="evenodd"
              />
            </svg>
            Transition Stories
          </h3>

          <div className="space-y-4">
            {displayStories.length > 0 ? (
              displayStories.map((story) => (
                <div
                  key={story.id}
                  className="bg-surface-dark/50 rounded-lg p-4"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary-light"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center mb-1">
                        <h4 className="text-sm font-medium mr-2">
                          {transition.currentRole} → {transition.targetRole}
                        </h4>
                        <span className="text-xs text-text-muted">
                          from {story.source}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mb-2">
                        "{story.content}"
                      </p>
                      <div className="flex items-center text-xs text-text-muted">
                        <span className="inline-flex items-center mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {story.date || "2023"}
                        </span>
                        <span className="inline-flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {story.experienceYears || 4} years exp.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-surface-dark/50 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary-light"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center mb-1">
                      <h4 className="text-sm font-medium mr-2">
                        {transition.currentRole} → {transition.targetRole}
                      </h4>
                      <span className="text-xs text-text-muted">from forums</span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      "Analyzing forums for transition stories..."
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stories.length > 1 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-2 text-sm text-primary-light hover:text-primary flex items-center justify-center"
              >
                <span>
                  {expanded ? "Show less" : "View more transition stories"}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScrapedInsights;
