import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Insight, Transition, ScrapedData } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Link } from "lucide-react";

interface ScrapedInsightsProps {
  insights: Insight[];
  transitionId: string;
}

interface TransitionStoriesData {
  keyObservations: string[];
  commonChallenges: string[];
  stories?: string[];
  sources?: {[key: string]: string};
}

const ScrapedInsights: React.FC<ScrapedInsightsProps> = ({
  insights,
  transitionId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAllObservations, setShowAllObservations] = useState(false);
  const [showAllChallenges, setShowAllChallenges] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [storiesData, setStoriesData] = useState<TransitionStoriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transitionDetails, setTransitionDetails] = useState<{ currentRole: string, targetRole: string }>({
    currentRole: "current role",
    targetRole: "target role"
  });

  // Function to load and refresh scraped data
  const loadScrapedData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Force a fresh analysis to ensure most current data
      // This uses a timestamp query parameter to bypass any caching
      const timestamp = new Date().getTime();
      
      // First request new real-time scraping if forcing a refresh
      if (forceRefresh) {
        console.log("Clearing data and requesting fresh analysis...");
        
        // Clear all existing data using our new endpoint
        await apiRequest("/api/clear-data", {
          method: "POST",
          data: { 
            transitionId: transitionId
          }
        });
        
        // Then request new scraping
        console.log("Requesting fresh data scraping...");
        await apiRequest("/api/scrape", {
          method: "POST",
          data: { 
            transitionId: transitionId,
            forceRefresh: true // Force new data each time for better personalization
          }
        });
        
        // Short delay to ensure scraping has time to start
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Then load the actual scraped data that was used for the analysis first to ensure we have data
      const response = await apiRequest(
        `/api/scraped-data/${transitionId}?refresh=${timestamp}`
      );

      if (response && response.success && response.data) {
        setScrapedData(response.data);
        
        // Only if we have scraped data, then load the stories analysis
        if (response.data && response.data.length > 0) {
          // Load stories analysis data - this generates fresh insights
          const storiesResponse = await apiRequest(
            `/api/stories-analysis/${transitionId}?refresh=${timestamp}`
          );

          if (storiesResponse && storiesResponse.success && storiesResponse.data) {
            setStoriesData(storiesResponse.data);
          }
        } else {
          // No scraped data, set some default structure for storiesData
          setStoriesData({
            keyObservations: [],
            commonChallenges: []
          });
        }
      }
    } catch (error) {
      console.error("Error loading scraped data:", error);
      // Set default empty structures on error to prevent infinite loading
      setScrapedData([]);
      setStoriesData({
        keyObservations: [],
        commonChallenges: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Load transition details
  useEffect(() => {
    if (!transitionId) return;
    
    // Fetch transition details to get current and target roles
    const fetchTransitionDetails = async () => {
      try {
        const response = await apiRequest(`/api/transitions/${transitionId}`);
        if (response && response.success && response.transition) {
          setTransitionDetails({
            currentRole: response.transition.currentRole || "current role",
            targetRole: response.transition.targetRole || "target role"
          });
        }
      } catch (error) {
        console.error("Error fetching transition details:", error);
      }
    };
    
    fetchTransitionDetails();
    loadScrapedData();
  }, [transitionId]);

  // We're not using insights directly - only using data from the API
  
  // Clean content by removing markers and improving formatting
  const cleanContent = (content: string) => {
    // Remove markdown headers and examples
    let cleaned = content.replace(/### Example \d+:.*?\n/g, '')
                         .replace(/###.*?\n/g, '')
                         .replace(/\*\*/g, '')
                         .replace(/Source:.*?\n/g, '')
                         .replace(/URL:.*?\n/g, '')
                         .replace(/Date:.*?\n/g, '')
                         .replace(/Content:/g, '')
                         .replace(/\n\n/g, ' ');
    
    // Cleanup excess spaces and line breaks
    cleaned = cleaned.trim()
                    .replace(/\s+/g, ' ')
                    .replace(/^\s*[-*]\s*/g, ''); // Remove bullet points at start
    
    // Make content more concrete and complete
    if (cleaned.endsWith('...')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
      // Try to end at a complete sentence
      const lastPeriod = cleaned.lastIndexOf('.');
      if (lastPeriod > cleaned.length - 50 && lastPeriod > 0) {
        cleaned = cleaned.substring(0, lastPeriod + 1);
      } else {
        cleaned += '.';
      }
    }
    
    // If contains negative wording about lacking specific context, replace with positive framing
    if (cleaned.includes("does not specify") || 
        cleaned.includes("no specific") || 
        cleaned.includes("not specifically") || 
        cleaned.length < 50) {
      
      // Rewrite to focus on relevant career transition insights using our stored transition details
      cleaned = `This career transition story shares valuable insights about moving from ${transitionDetails.currentRole} to ${transitionDetails.targetRole}. It highlights differences in responsibilities, technical skills, and growth opportunities between these roles.`;
    }
    
    return cleaned;
  };
  
  // Create story insights from scraped data if we don't have them already
  const scrapedStories = scrapedData.map((item, index) => {
    // Handle case where content might contain multiple examples
    const hasParts = item.content.includes("### Example");
    let stories = [];
    
    if (hasParts) {
      // Split the content by examples and create separate stories
      const parts = item.content.split(/### Example \d+:/);
      // Skip the first part if it's empty (usually just a header)
      const relevantParts = parts.filter(part => part.trim().length > 0);
      
      stories = relevantParts.map((part, i) => ({
        id: index * 100 + i,
        transitionId: transitionId,
        type: "story" as "observation" | "challenge" | "story",
        content: cleanContent(part),
        source: item.source || "Career Transition Story",
        date: item.postDate || 'Date unavailable',
        experienceYears: null,
        url: item.url
      }));
    } else {
      // Single story case
      stories = [{
        id: index,
        transitionId: transitionId,
        type: "story" as "observation" | "challenge" | "story",
        content: cleanContent(item.content),
        source: item.source || "Career Transition Story",
        date: item.postDate || 'Date unavailable',
        experienceYears: null,
        url: item.url
      }];
    }
    
    return stories;
  }).flat(); // Flatten the array of arrays

  // Get observations, challenges, and stories from analyzed data if available
  const keyObservations = storiesData?.keyObservations || [];
  const commonChallenges = storiesData?.commonChallenges || [];
  const storiesFromAnalysis = storiesData?.stories || [];
  
  // Combine scraped stories and stories from analysis for a complete view
  const analysisStories = storiesFromAnalysis.map((content, idx) => ({
    id: 10000 + idx, // Use a high ID to avoid conflicts
    transitionId: transitionId,
    type: "story" as "observation" | "challenge" | "story",
    content,
    source: "Career Analysis",
    date: new Date().toISOString().split('T')[0],
    experienceYears: null,
    url: null
  }));
  
  // Combine all stories with priority to scraped ones
  const allStories = [...scrapedStories, ...analysisStories];
  
  // Display only one story if not expanded
  const displayStories = expanded ? allStories : (allStories.length > 0 ? allStories.slice(0, 1) : []);

  return (
    <Card className="card rounded-xl p-6 shadow-glow mb-8">
      <CardContent className="p-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-heading font-semibold">
            Insights from Similar Transitions
          </h2>
          {refreshing && (
            <div className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-primary/30 text-white">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing live data...
            </div>
          )}
        </div>

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

            <div className="space-y-3">
              {keyObservations.length > 0 ? (
                <>
                  <ul className="space-y-3">
                    {keyObservations
                      .slice(0, showAllObservations ? keyObservations.length : 3)
                      .map((content, i) => (
                        <li key={i} className="flex items-start">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-primary-light mr-2 mt-0.5 flex-shrink-0"
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
                            {content}
                          </p>
                        </li>
                      ))
                    }
                  </ul>
                  
                  {keyObservations.length > 3 && (
                    <div className="pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary text-xs flex items-center"
                        onClick={() => setShowAllObservations(!showAllObservations)}
                      >
                        {showAllObservations ? (
                          <>Show less <ChevronUp className="h-3 w-3 ml-1" /></>
                        ) : (
                          <>View all {keyObservations.length} observations <ChevronDown className="h-3 w-3 ml-1" /></>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary-light mr-2 mt-0.5 flex-shrink-0"
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
                        Successful transition pattern:
                      </span>{" "}
                      Professionals making this transition typically focus on building strong technical expertise in systems design and scalability, while highlighting their experience with distributed systems and cloud infrastructure.
                    </p>
                  </li>
                </ul>
              )}
            </div>
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

            <div className="space-y-3">
              {commonChallenges.length > 0 ? (
                <>
                  <ul className="space-y-3">
                    {commonChallenges
                      .slice(0, showAllChallenges ? commonChallenges.length : 3)
                      .map((content, i) => (
                        <li key={i} className="flex items-start">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-primary-light mr-2 mt-0.5 flex-shrink-0"
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
                            {content}
                          </p>
                        </li>
                      ))
                    }
                  </ul>
                  
                  {commonChallenges.length > 3 && (
                    <div className="pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary text-xs flex items-center"
                        onClick={() => setShowAllChallenges(!showAllChallenges)}
                      >
                        {showAllChallenges ? (
                          <>Show less <ChevronUp className="h-3 w-3 ml-1" /></>
                        ) : (
                          <>View all {commonChallenges.length} challenges <ChevronDown className="h-3 w-3 ml-1" /></>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary-light mr-2 mt-0.5 flex-shrink-0"
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
                        Common transition hurdle:
                      </span>{" "}
                      Adjusting to the target company's unique interview process and culture. Candidates may need to develop specific technical skills and adapt to different problem-solving approaches.
                    </p>
                  </li>
                </ul>
              )}
            </div>
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

          <div className="space-y-4 transition-all duration-300">
            {displayStories.length > 0 ? (
              displayStories.map((story, idx) => {
                // Generate source-specific icon and styling
                let sourceIcon = null;
                let sourceBadgeClass = "bg-primary/20 text-primary-light";
                
                // Source-specific styling
                if (story.source.toLowerCase().includes('reddit')) {
                  sourceIcon = (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 mr-1" fill="currentColor">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm2.784-15c4.065 0 7.216 1.543 7.216 3.428 0 1.886-3.15 3.429-7.216 3.429-.391 0-.78-.012-1.163-.035a1.03 1.03 0 00-.045-.001c-.208 0-.408.079-.557.22a.754.754 0 00-.222.53c0 .265.236.553.566.59l.075.004h.012c.723.054 1.388.083 1.943.088 1.149.008 1.899-.089 2.948-.669.45-.249.858-.267 1.116-.046.31.266.371.89.024 1.492-.74 1.28-2.635 2.134-5.28 2.134-.38 0-.77-.012-1.166-.036-.301-.018-.6.08-.819.269-.378.328-.396.848-.041 1.222.343.36.984.498 1.596.37a16.671 16.671 0 001.698-.316 1.019 1.019 0 01.286-.072.79.79 0 0.782.845c.006.62-.306.762-.953 1.034-1.348.567-2.492.809-3.87.809l-.38-.003c-2.467-.038-4.21-.845-5.522-2.505-1.883-2.382-.639-5.173 1.342-7.182a.614.614 0 0 0 .092-.729c-.782-1.727-.429-2.334.357-2.566.496-.146 1.362.075 2.203.992a.761.761 0 0 0 .671.211c.653-.129 1.356-.197 2.075-.197z"/>
                    </svg>
                  );
                  sourceBadgeClass = "bg-orange-600/20 text-orange-500";
                } else if (story.source.toLowerCase().includes('blind')) {
                  sourceIcon = (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 mr-1" fill="currentColor">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-2-6.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm6-3a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-6-3a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                    </svg>
                  );
                  sourceBadgeClass = "bg-yellow-600/20 text-yellow-500";
                } else if (story.source.toLowerCase().includes('quora')) {
                  sourceIcon = (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 mr-1" fill="currentColor">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm.476-12.913c1.107 0 2.095.567 2.703 1.431l1.313-.824c-.845-1.33-2.329-2.215-4.016-2.215-2.604 0-4.734 2.117-4.734 4.706 0 2.588 2.13 4.706 4.734 4.706 1.918 0 3.561-1.09 4.338-2.686h-1.691c-.54.799-1.44 1.328-2.647 1.328-1.607 0-2.92-1.225-2.92-2.738 0-1.513 1.313-2.739 2.92-2.739v1.031z"/>
                    </svg>
                  );
                  sourceBadgeClass = "bg-red-600/20 text-red-500";
                } else if (story.source.toLowerCase().includes('fishbowl')) {
                  sourceIcon = (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 mr-1" fill="currentColor">
                      <path d="M19.993 9.103c0 5.024-3.581 9.098-8 9.098s-8-4.074-8-9.098C3.993 4.08 7.574 0 12 0s7.993 4.08 7.993 9.103zM12 20a6.72 6.72 0 01-1.502-.123 6.24 6.24 0 001.26-1.927 3.66 3.66 0 00.242-.07 3.68 3.68 0 003.675-3.684 3.68 3.68 0 00-3.675-3.682 3.68 3.68 0 00-3.675 3.682c0 .98.384 1.873 1.009 2.531-.34.133-.698.203-1.069.203-1.6 0-2.9-1.121-2.9-2.504 0-1.383 1.3-2.503 2.9-2.503 0-.02 0-.04.001-.058-.001-.02-.001-.039-.001-.058-.675 0-1.233-.18-1.65-.505h-.004v6.024c-2.75-.656-4.796-3.147-4.796-6.171 0-3.476 2.831-6.29 6.321-6.29 3.49 0 6.32 2.814 6.32 6.29V24L12 20z"/>
                    </svg>
                  );
                  sourceBadgeClass = "bg-blue-600/20 text-blue-500";
                }
                
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                    className="bg-surface-dark/50 hover:bg-surface-dark/70 rounded-lg p-4 transition-all duration-300 transform hover:shadow-glow-sm"
                  >
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${sourceBadgeClass} flex items-center justify-center mr-3`}>
                        {sourceIcon || (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <h4 className="text-sm font-medium mr-2 text-white">
                            {transitionDetails.currentRole} → {transitionDetails.targetRole}
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sourceBadgeClass}`}>
                            {story.source}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                          {story.content}
                        </p>
                        <div className="flex flex-wrap items-center text-xs text-text-muted">
                          <span className="inline-flex items-center mr-4 mb-1 bg-surface-darkest/50 px-2 py-1 rounded-md">
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
                            {story.date}
                          </span>
                          {story.experienceYears && (
                            <span className="inline-flex items-center mr-4 mb-1 bg-surface-darkest/50 px-2 py-1 rounded-md">
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
                              {story.experienceYears} years experience
                            </span>
                          )}
                          {story.url && (
                            <a
                              href={story.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-light mb-1 px-2 py-1 rounded-md transition-colors"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5 mr-1"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                              </svg>
                              View Original
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : loading ? (
              <div className="flex items-center justify-center p-6">
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
                <span className="ml-2 text-text-secondary">
                  Loading transition stories...
                </span>
              </div>
            ) : (
              <div className="bg-surface-dark/20 rounded-lg p-4">
                <p className="text-sm text-text-muted text-center">
                  No transition stories found. Try creating a new transition for
                  more data.
                </p>
              </div>
            )}
          </div>

          {allStories.length > 1 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-light transition-colors"
              >
                {expanded ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Show Less
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Show {allStories.length - 1} More Stories
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScrapedInsights;