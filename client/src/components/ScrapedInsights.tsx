import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Insight, Transition, ScrapedData } from "@/types";
import { apiRequest } from "@/lib/queryClient";

interface ScrapedInsightsProps {
  insights: Insight[];
  transition: Transition;
}

interface TransitionStoriesData {
  keyObservations: string[];
  commonChallenges: string[];
}

const ScrapedInsights: React.FC<ScrapedInsightsProps> = ({
  insights,
  transition,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [storiesData, setStoriesData] = useState<TransitionStoriesData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load real scraped data from the server
  useEffect(() => {
    if (!transition.id) return;

    const loadScrapedData = async () => {
      try {
        // Load scraped data
        const response = await apiRequest(`/api/scraped-data/${transition.id}`);

        if (response && response.success && response.data) {
          setScrapedData(response.data);
        }

        // Load stories analysis data
        const storiesResponse = await apiRequest(`/api/stories-analysis/${transition.id}`);

        if (storiesResponse && storiesResponse.success && storiesResponse.data) {
          setStoriesData(storiesResponse.data);
        }
      } catch (error) {
        console.error("Error loading scraped data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadScrapedData();
  }, [transition.id]);

  // Group insights by type from both server and client data
  const observations = insights.filter((i) => i.type === "observation");
  const challenges = insights.filter((i) => i.type === "challenge");
  const stories = insights.filter((i) => i.type === "story");
  
  // Create story insights from scraped data if we don't have them already
  const scrapedStories = scrapedData.map((item, index) => ({
    id: index,
    transitionId: transition.id,
    type: "story" as "observation" | "challenge" | "story",
    content: item.content.length > 300 
      ? item.content.substring(0, 300) + "..." 
      : item.content,
    source: item.source,
    // Use the creation date from the data or default to the current date
    date: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    // Don't use randomized experience years
    experienceYears: null,
    url: item.url
  }));

  // Use real scraped stories if available, otherwise use the ones from insights
  const allStories = scrapedStories.length > 0 ? scrapedStories : stories;
  
  // Display only one story if not expanded
  const displayStories = expanded ? allStories : allStories.slice(0, 1);

  // Get observations and challenges from analyzed data if available
  const keyObservations = storiesData?.keyObservations || [];
  const commonChallenges = storiesData?.commonChallenges || [];

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
              {observations.length > 0 || keyObservations.length > 0 ? (
                (observations.length > 0 ? observations : keyObservations.map((content, i) => ({
                  id: i,
                  content
                }))).map((observation, idx) => (
                  <li key={idx} className="flex items-start">
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
                        Key insight:
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
                      Waiting for insights:
                    </span>{" "}
                    Cara is gathering and analyzing real transition data. No observations available yet.
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
              {challenges.length > 0 || commonChallenges.length > 0 ? (
                (challenges.length > 0 ? challenges : commonChallenges.map((content, i) => ({
                  id: i,
                  content
                }))).map((challenge, idx) => (
                  <li key={idx} className="flex items-start">
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
                        Challenge:
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
                      Waiting for data:
                    </span>{" "}
                    Cara is analyzing real career transition data. No challenges identified yet.
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
              displayStories.map((story, idx) => (
                <div
                  key={idx}
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
                      <div className="flex flex-wrap items-center text-xs text-text-muted">
                        <span className="inline-flex items-center mr-4 mb-1">
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
                        {story.experienceYears && (
                          <span className="inline-flex items-center mr-4 mb-1">
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
                            {story.experienceYears} years exp.
                          </span>
                        )}
                        {story.url && (
                          <a 
                            href={story.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary-light hover:underline mb-1"
                          >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-3.5 w-3.5 mr-1" 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                            </svg>
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : loading ? (
              <div className="bg-surface-dark/50 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary-light animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
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
                      "Loading transition stories from real sources..."
                    </p>
                  </div>
                </div>
              </div>
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
                      "No transition stories found yet. Check back later as Cara continues to gather data."
                    </p>
                  </div>
                </div>
              </div>
            )}

            {allStories.length > 1 && (
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
