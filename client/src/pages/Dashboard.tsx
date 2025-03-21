import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import TransitionDashboard from "@/components/TransitionDashboard";
import SkillGapAnalysis from "@/components/SkillGapAnalysis";
import CareerTrajectory from "@/components/CareerTrajectory";
import ScrapedInsights from "@/components/ImprovedScrapedInsights";
import CompanyLogoNetwork from "@/components/CompanyLogoNetwork";
import DigitalRain from "@/components/DigitalRain";
import EngagingLoader from "@/components/EngagingLoader";
import { apiRequest } from "@/lib/queryClient";
import { DashboardData } from "@/types";

const Dashboard: React.FC = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/dashboard/:transitionId");
  const transitionId = params?.transitionId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect if no transitionId
  useEffect(() => {
    if (!match) {
      setLocation("/");
    }
  }, [match, setLocation]);

  // Fetch dashboard data with automatic refresh - always get fresh data
  const { data, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${transitionId}`],
    enabled: !!transitionId,
    staleTime: 0, // Always consider data stale
    // Important: Force refetch on mount to ensure fresh data
    refetchOnMount: true
  });

  // State for tracking loading stages
  const [loadingStage, setLoadingStage] = useState<'stories' | 'skills' | 'plan' | 'insights' | 'metrics' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Process API with corrected logical sequence to ensure proper data flow
  useEffect(() => {
    const processApiSteps = async () => {
      if (!data || data.isComplete || isProcessing) return;

      setIsProcessing(true);
      
      try {
        // Clear any existing data first to ensure true fresh start
        const clearResult = await apiRequest("/api/clear-data", {
          method: "POST",
          data: { 
            transitionId
          }
        });
        
        // STEP 1: Scrape real-world transition stories using Perplexity
        setLoadingStage('stories');
        toast({
          title: "Finding transition stories",
          description: "Collecting real-world career transition data...",
          duration: 3000,
        });
        
        // Force refresh to ensure we're getting truly fresh data
        const scrapeResult = await apiRequest("/api/scrape", {
          method: "POST",
          data: { 
            transitionId,
            forceRefresh: true 
          }
        });
        
        // Proper delay to ensure stories are completely scraped and stored
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // STEP 2: Generate key observations and challenges based on these stories
        // This step processes the scraped stories to extract meaningful insights
        setLoadingStage('insights');
        toast({
          title: "Analyzing transition patterns",
          description: "Discovering successful strategies from similar transitions...",
          duration: 3000,
        });
        
        // Process the scraped stories to generate key observations and challenges
        // This is crucial to do BEFORE skill gap analysis, as it provides context
        const storiesAnalysisResult = await apiRequest("/api/stories-analysis/" + transitionId);
        
        // Short delay to ensure stories analysis is completely processed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // STEP 3: Analyze skill gaps using the stories data as context
        // This relies on the story analysis being complete first
        setLoadingStage('skills');
        toast({
          title: "Analyzing skill gaps",
          description: "Identifying critical skills based on real transition data...",
          duration: 3000,
        });
        
        const skillsResult = await apiRequest("/api/analyze", {
          method: "POST",
          data: { 
            transitionId,
            useScrapedData: true, // Use the freshly scraped data and story analysis
            priority: "accuracy" // Prioritize accuracy over speed
          }
        });
        
        // Short delay to ensure skill gap analysis is completely processed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // STEP 4: Generate personalized career trajectory based on skills analysis
        // This depends on having skill gaps identified first
        setLoadingStage('plan');
        toast({
          title: "Creating career trajectory",
          description: "Designing your personalized transition roadmap...",
          duration: 3000,
        });
        
        const planResult = await apiRequest("/api/plan", {
          method: "POST",
          data: { 
            transitionId,
            personalizedTimeline: true,
            includeContext: true // Include the stories and skill gaps context
          }
        });
        
        // STEP 5: Generate final metrics and insights using all collected data
        // This depends on having all previous data available
        setLoadingStage('metrics');
        toast({
          title: "Calculating personalized metrics",
          description: "Creating your personalized success probability...",
          duration: 3000,
        });
        
        // Generate personalized metrics based on all previous data
        const metricsResult = await apiRequest("/api/insights/" + transitionId);
        
        // Refresh the dashboard with all our newly generated data
        queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${transitionId}`] });
        
        toast({
          title: "Analysis complete",
          description: "Your real-time personalized career transition data is ready!",
          duration: 5000,
        });
        
        setLoadingStage(null);
        setIsProcessing(false);
      } catch (error) {
        console.error("Error processing API steps:", error);
        toast({
          title: "Error",
          description: "Failed to complete analysis. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        setLoadingStage(null);
        setIsProcessing(false);
      }
    };

    processApiSteps();
  }, [data, transitionId, toast, queryClient, isProcessing]);

  // EngagingLoader component is already imported at the top of the file

  // Show engaging loader when data is loading or being processed
  if (isLoading || loadingStage) {
    // Different loading states for initial data load vs processing steps
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {loadingStage ? (
            // Advanced agentic workflow loader with step visualization
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h1 className="text-2xl font-heading font-bold mb-4 md:mb-0 flex items-center">
                  <span className="text-primary-light">Cara</span>
                  <span className="ml-2 text-xs px-2 py-1 bg-surface-darker text-text-secondary rounded-md">agent</span>
                </h1>
                <div className="flex items-center">
                  <span className="text-sm text-text-secondary mr-2">
                    Current operation:
                  </span>
                  <span className="text-sm text-primary-light font-medium animate-pulse">
                    Processing live data
                  </span>
                </div>
              </div>
              
              {/* Agent Workflow Status */}
              <div className="bg-surface-dark border border-primary/20 rounded-xl p-6 shadow-glow">
                <h2 className="text-lg font-medium mb-6 flex items-center">
                  <svg 
                    className="mr-2 h-5 w-5 text-primary" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M12 6v6l4 2" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Workflow Status</span>
                </h2>
                
                {/* Vertical timeline with connecting line */}
                <div className="relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-primary/20 z-0" aria-hidden="true"></div>
                  {/* Stage 1: Scraping Stories */}
                  <div className={`flex items-start p-4 rounded-lg mb-3 transition-all duration-300 ${
                    loadingStage === 'stories' 
                      ? 'bg-primary/10 border border-primary/20 shadow-glow-sm' 
                      : loadingStage === 'insights' || loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics'
                        ? 'bg-green-500/5 border border-green-500/10' 
                        : 'border border-surface-lighter'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 z-10 ${
                      loadingStage === 'stories' 
                        ? 'bg-primary text-black' 
                        : loadingStage === 'insights' || loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-surface-lighter text-text-secondary'
                    }`}>
                      {loadingStage === 'stories' ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : loadingStage === 'insights' || loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : '1'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-medium ${
                          loadingStage === 'stories' 
                            ? 'text-primary-light' 
                            : loadingStage === 'insights' || loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics' 
                              ? 'text-green-500' 
                              : 'text-text'
                        }`}>
                          Finding Career Transition Stories
                        </h3>
                        {loadingStage === 'stories' && (
                          <span className="text-xs text-primary-light bg-primary/10 px-2 py-1 rounded-full animate-pulse">In Progress</span>
                        )}
                        {(loadingStage === 'insights' || loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics') && (
                          <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">Completed</span>
                        )}
                      </div>
                      {/* Only show details for active or current stage */}
                      {(loadingStage === 'stories' || !loadingStage) && (
                        <p className="text-sm text-text-secondary mt-2">
                          Scraping web forums and platforms for real stories from professionals who made the transition from {data?.transition.currentRole || "current role"} to {data?.transition.targetRole || "target role"}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Stage 2: Analyze Insights */}
                  <div className={`flex items-start p-4 rounded-lg mb-3 transition-all duration-300 ${
                    loadingStage === 'insights' 
                      ? 'bg-primary/10 border border-primary/20 shadow-glow-sm' 
                      : loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics'
                        ? 'bg-green-500/5 border border-green-500/10' 
                        : 'border border-surface-lighter'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 z-10 ${
                      loadingStage === 'insights' 
                        ? 'bg-primary text-black' 
                        : loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-surface-lighter text-text-secondary'
                    }`}>
                      {loadingStage === 'insights' ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : '2'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-medium ${
                          loadingStage === 'insights' 
                            ? 'text-primary-light' 
                            : loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics' 
                              ? 'text-green-500' 
                              : 'text-text'
                        }`}>
                          Extracting Key Observations & Challenges
                        </h3>
                        {loadingStage === 'insights' && (
                          <span className="text-xs text-primary-light bg-primary/10 px-2 py-1 rounded-full animate-pulse">In Progress</span>
                        )}
                        {(loadingStage === 'skills' || loadingStage === 'plan' || loadingStage === 'metrics') && (
                          <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">Completed</span>
                        )}
                      </div>
                      {/* Only show details for active stage */}
                      {loadingStage === 'insights' && (
                        <p className="text-sm text-text-secondary mt-2">
                          Analyzing transition stories to identify key observations, challenges, and success patterns
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Stage 3: Analyze Skills */}
                  <div className={`flex items-start p-4 rounded-lg mb-3 transition-all duration-300 ${
                    loadingStage === 'skills' 
                      ? 'bg-primary/10 border border-primary/20 shadow-glow-sm' 
                      : loadingStage === 'plan' || loadingStage === 'metrics'
                        ? 'bg-green-500/5 border border-green-500/10' 
                        : 'border border-surface-lighter'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 z-10 ${
                      loadingStage === 'skills' 
                        ? 'bg-primary text-black' 
                        : loadingStage === 'plan' || loadingStage === 'metrics' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-surface-lighter text-text-secondary'
                    }`}>
                      {loadingStage === 'skills' ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : loadingStage === 'plan' || loadingStage === 'metrics' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : '3'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-medium ${
                          loadingStage === 'skills' 
                            ? 'text-primary-light' 
                            : loadingStage === 'plan' || loadingStage === 'metrics' 
                              ? 'text-green-500' 
                              : 'text-text'
                        }`}>
                          Analyzing Skill Requirements & Gaps
                        </h3>
                        {loadingStage === 'skills' && (
                          <span className="text-xs text-primary-light bg-primary/10 px-2 py-1 rounded-full animate-pulse">In Progress</span>
                        )}
                        {(loadingStage === 'plan' || loadingStage === 'metrics') && (
                          <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">Completed</span>
                        )}
                      </div>
                      {/* Only show details for active stage */}
                      {loadingStage === 'skills' && (
                        <p className="text-sm text-text-secondary mt-2">
                          Identifying critical skills needed and determining skill gaps based on transition requirements
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Stage 4: Create Career Plan */}
                  <div className={`flex items-start p-4 rounded-lg mb-3 transition-all duration-300 ${
                    loadingStage === 'plan' 
                      ? 'bg-primary/10 border border-primary/20 shadow-glow-sm' 
                      : loadingStage === 'metrics'
                        ? 'bg-green-500/5 border border-green-500/10' 
                        : 'border border-surface-lighter'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 z-10 ${
                      loadingStage === 'plan' 
                        ? 'bg-primary text-black' 
                        : loadingStage === 'metrics' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-surface-lighter text-text-secondary'
                    }`}>
                      {loadingStage === 'plan' ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : loadingStage === 'metrics' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : '4'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-medium ${
                          loadingStage === 'plan' 
                            ? 'text-primary-light' 
                            : loadingStage === 'metrics' 
                              ? 'text-green-500' 
                              : 'text-text'
                        }`}>
                          Creating Career Trajectory Plan
                        </h3>
                        {loadingStage === 'plan' && (
                          <span className="text-xs text-primary-light bg-primary/10 px-2 py-1 rounded-full animate-pulse">In Progress</span>
                        )}
                        {loadingStage === 'metrics' && (
                          <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">Completed</span>
                        )}
                      </div>
                      {/* Only show details for active stage */}
                      {loadingStage === 'plan' && (
                        <p className="text-sm text-text-secondary mt-2">
                          Building a personalized career transition roadmap with specific milestones and learning resources
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Stage 5: Metrics & Success Rate */}
                  <div className={`flex items-start p-4 rounded-lg mb-3 transition-all duration-300 ${
                    loadingStage === 'metrics' 
                      ? 'bg-primary/10 border border-primary/20 shadow-glow-sm' 
                      : 'border border-surface-lighter'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 z-10 ${
                      loadingStage === 'metrics' 
                        ? 'bg-primary text-black' 
                        : 'bg-surface-lighter text-text-secondary'
                    }`}>
                      {loadingStage === 'metrics' ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : '5'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-medium ${loadingStage === 'metrics' ? 'text-primary-light' : 'text-text'}`}>
                          Calculating Success Metrics & Predictions
                        </h3>
                        {loadingStage === 'metrics' && (
                          <span className="text-xs text-primary-light bg-primary/10 px-2 py-1 rounded-full animate-pulse">In Progress</span>
                        )}
                      </div>
                      {/* Only show details for active stage */}
                      {loadingStage === 'metrics' && (
                        <p className="text-sm text-text-secondary mt-2">
                          Estimating transition success rate, timeline, and generating personalized metrics
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <EngagingLoader 
                currentStage={loadingStage}
                transition={data?.transition || { currentRole: "", targetRole: "" }}
              />
            </div>
          ) : (
            // Simple skeleton loader for initial page load
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-surface-dark rounded w-3/4"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="h-64 bg-surface-dark rounded"></div>
                <div className="h-64 bg-surface-dark rounded"></div>
                <div className="h-64 bg-surface-dark rounded"></div>
              </div>
              <div className="h-96 bg-surface-dark rounded"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto card rounded-xl p-6 shadow-glow-sm">
          <h2 className="text-xl font-heading font-semibold mb-4 text-red-400">
            Error Loading Dashboard
          </h2>
          <p className="text-text-secondary mb-4">
            {error instanceof Error ? error.message : "Failed to load dashboard data"}
          </p>
          <button
            onClick={() => setLocation("/")}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg shadow"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Function to handle refreshing all data
  const handleRefreshData = async () => {
    if (isRefreshing || !transitionId) return;
    
    setIsRefreshing(true);
    
    try {
      toast({
        title: "Refreshing data",
        description: "Getting fresh career transition data from the web...",
        duration: 3000,
      });
      
      // Clear all existing data
      const clearResult = await apiRequest("/api/clear-data", {
        method: "POST",
        data: { 
          transitionId
        }
      });
      
      if (clearResult.success) {
        // Set loadingStage to start the loading sequence
        setLoadingStage('stories');
        setIsProcessing(true);
        
        // Refresh the dashboard data to trigger the useEffect
        queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${transitionId}`] });
        
        toast({
          title: "Data cleared",
          description: "Fetching fresh career transition data...",
          duration: 3000,
        });
      } else {
        throw new Error("Failed to clear existing data");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      setIsRefreshing(false);
    }
  };

  // Helper function to determine target company from transition data
  const getTargetCompany = () => {
    const { targetRole } = data.transition;
    
    // Extract company name from target role, if present
    if (targetRole.includes('Google')) return 'Google';
    if (targetRole.includes('Amazon')) return 'Amazon';  
    if (targetRole.includes('Microsoft')) return 'Microsoft';
    if (targetRole.includes('Apple')) return 'Apple';
    if (targetRole.includes('Meta')) return 'Meta';
    
    // Default to a likely tech company if none found
    return 'Google';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-heading font-bold mb-4 md:mb-0">
            Transition Dashboard:{" "}
            <span className="text-primary-light">
              {data.transition.currentRole} → {data.transition.targetRole}
            </span>
          </h1>
          <div className="flex items-center">
            <div className="flex items-center">
              <span className="text-sm text-text-secondary mr-2">
                Last updated:
              </span>
              <span className="text-sm text-text">
                {new Date(data.transition.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Company Logo Network with Matrix-style data visualization - shows career path connections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative bg-surface-dark border border-primary/20 rounded-lg overflow-hidden mb-8"
        >
          <div className="absolute inset-0 bg-cyber-grid bg-20 opacity-5"></div>
          
          <div className="flex flex-col">
            <div className="p-4 border-b border-primary/20 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium flex items-center">
                  <svg 
                    className="mr-2 h-5 w-5 text-primary" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M2 22L12 2L22 22M6 16H18M9 11H15" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>CARA.AI CAREER NETWORK</span>
                </h2>
                <p className="text-sm text-text-secondary">
                  Mapping transition paths from {data.transition.currentRole} to {data.transition.targetRole}
                </p>
              </div>
              
              {selectedCompany && (
                <div className="bg-surface/70 backdrop-blur-sm rounded-lg px-3 py-1 border border-primary/30">
                  <span className="text-sm">Selected: <span className="text-primary-light">{selectedCompany}</span></span>
                </div>
              )}
            </div>
            
            <div className="p-2 text-xs text-center text-text-secondary border-b border-primary/20">
              <div className="mb-2">Interactive company network - click any company to explore career paths</div>
              <div className="flex justify-center space-x-4 flex-wrap">
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#00c3ff]80 mr-1"></span>
                  <span>Tech</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#4caf50]80 mr-1"></span>
                  <span>Enterprise</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#ff9800]80 mr-1"></span>
                  <span>Fintech</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#e91e63]80 mr-1"></span>
                  <span>Consumer</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#9c27b0]80 mr-1"></span>
                  <span>Social</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <CompanyLogoNetwork 
                height={350} 
                className="bg-surface-dark/80" 
                selectedCompany={selectedCompany || getTargetCompany()}
                onSelectCompany={setSelectedCompany}
                interactionStrength={1.5}
              />
              
              {/* Company Details Panel - appears when a company is selected */}
              {selectedCompany && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute top-4 right-4 bg-surface/90 backdrop-blur-md p-4 rounded-lg border border-primary/20 shadow-glow-sm max-w-xs z-10"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-primary-light font-medium">{selectedCompany}</h4>
                    <button 
                      onClick={() => setSelectedCompany(null)}
                      className="text-text-muted hover:text-text transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="text-xs text-text-secondary mb-3">
                    Based on your Amazon L5 experience, these roles at {selectedCompany} would be a good match:
                  </div>
                  
                  <ul className="space-y-2 mb-3">
                    {selectedCompany === 'Google' && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">L6 Senior SWE</span>
                          </div>
                          <span className="text-xs text-text-muted">~$265K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">L5 SWE</span>
                          </div>
                          <span className="text-xs text-text-muted">~$218K</span>
                        </li>
                      </>
                    )}
                    
                    {selectedCompany === 'Microsoft' && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Senior SDE (63)</span>
                          </div>
                          <span className="text-xs text-text-muted">~$210K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">SDE II (62)</span>
                          </div>
                          <span className="text-xs text-text-muted">~$180K</span>
                        </li>
                      </>
                    )}
                    
                    {selectedCompany === 'Meta' && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">E5 Software Engineer</span>
                          </div>
                          <span className="text-xs text-text-muted">~$270K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">E4 Software Engineer</span>
                          </div>
                          <span className="text-xs text-text-muted">~$210K</span>
                        </li>
                      </>
                    )}
                    
                    {selectedCompany === 'Apple' && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">ICT4 Software Engineer</span>
                          </div>
                          <span className="text-xs text-text-muted">~$240K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">ICT3 Software Engineer</span>
                          </div>
                          <span className="text-xs text-text-muted">~$193K</span>
                        </li>
                      </>
                    )}
                    
                    {selectedCompany === 'Amazon' && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">L6 SDE III</span>
                          </div>
                          <span className="text-xs text-text-muted">~$245K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">L5 SDE II</span>
                          </div>
                          <span className="text-xs text-text-muted">~$190K</span>
                        </li>
                      </>
                    )}
                    
                    {selectedCompany === 'Netflix' && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Senior SWE</span>
                          </div>
                          <span className="text-xs text-text-muted">~$425K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">SWE</span>
                          </div>
                          <span className="text-xs text-text-muted">~$325K</span>
                        </li>
                      </>
                    )}
                    
                    {selectedCompany === 'AMD' && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Principal Engineer</span>
                          </div>
                          <span className="text-xs text-text-muted">~$220K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Senior Engineer II</span>
                          </div>
                          <span className="text-xs text-text-muted">~$180K</span>
                        </li>
                      </>
                    )}
                    
                    {selectedCompany === 'LinkedIn' && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Staff SWE (IC5)</span>
                          </div>
                          <span className="text-xs text-text-muted">~$290K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Senior SWE (IC4)</span>
                          </div>
                          <span className="text-xs text-text-muted">~$224K</span>
                        </li>
                      </>
                    )}
                    
                    {selectedCompany === 'Salesforce' && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Lead MTS (Senior)</span>
                          </div>
                          <span className="text-xs text-text-muted">~$235K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Member of Technical Staff</span>
                          </div>
                          <span className="text-xs text-text-muted">~$185K</span>
                        </li>
                      </>
                    )}
                    
                    {(selectedCompany !== 'Google' && 
                      selectedCompany !== 'Microsoft' && 
                      selectedCompany !== 'Meta' && 
                      selectedCompany !== 'Apple' && 
                      selectedCompany !== 'Amazon' && 
                      selectedCompany !== 'Netflix' &&
                      selectedCompany !== 'AMD' &&
                      selectedCompany !== 'LinkedIn' &&
                      selectedCompany !== 'Salesforce') && (
                      <>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Senior Software Engineer</span>
                          </div>
                          <span className="text-xs text-text-muted">$170K-$240K</span>
                        </li>
                        <li className="text-sm bg-surface-dark/70 p-2 rounded flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                            <span className="font-medium text-white">Software Engineer</span>
                          </div>
                          <span className="text-xs text-text-muted">$130K-$180K</span>
                        </li>
                      </>
                    )}
                  </ul>
                  
                  <div className="text-xs text-text-muted">
                    <div className="flex items-center mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Recommendations based on your experience and skill profile
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                        Best match
                      </span>
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                        Good match
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="h-12 relative overflow-hidden border-t border-primary/20">
              <DigitalRain height={50} density={5} speed={1.5} primaryColor="rgba(0, 195, 255, 0.7)" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-xs text-primary-light font-mono tracking-wider opacity-70">
                  CARA.AI.AGENT // ANALYZING INTERCONNECTED CAREER PATHS
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {!data.isComplete ? (
          <div className="card rounded-xl p-6 shadow-glow mb-6">
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary"
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
              <h2 className="text-xl font-heading font-semibold">
                Analyzing your career transition...
              </h2>
            </div>
            <p className="text-center text-text-secondary mt-4">
              We're scraping forums, analyzing skill gaps, and creating your
              personalized career trajectory plan. This may take a minute.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <TransitionDashboard
                transition={data.transition}
                scrapedCount={data.scrapedCount}
              />
              <SkillGapAnalysis skillGaps={data.skillGaps} />
              <CareerTrajectory
                milestones={data.milestones}
                plan={data.plan}
              />
            </div>

            <ScrapedInsights
              insights={data.insights}
              transition={data.transition}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
