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
import WorkflowStatus, { LoadingStage } from "@/components/WorkflowStatus";
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
  const [showData, setShowData] = useState(false);

  // Redirect if no transitionId
  useEffect(() => {
    if (!match) {
      setLocation("/transitions/new");
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
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Effect to toggle showing data once loading is complete
  useEffect(() => {
    if (data?.isComplete && !loadingStage) {
      setShowData(true);
    } else {
      setShowData(false);
    }
  }, [data?.isComplete, loadingStage]);

  // Process API with corrected logical sequence to ensure proper data flow
  useEffect(() => {
    const processApiSteps = async () => {
      // Don't process if:
      // 1. No data is available yet
      // 2. Analysis is already complete
      // 3. Already processing
      // This fixes the issue of attempting to reprocess completed transitions
      if (!data || data.isComplete || isProcessing) {
        // If analysis is already complete, make sure loading stage is cleared
        if (data?.isComplete && loadingStage !== null) {
          setLoadingStage(null);
        }
        return;
      }

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
  }, [data, transitionId, toast, queryClient, isProcessing, loadingStage]);

  // Only show the loading workflow when data is initially loading or a processing stage is active
  if (isLoading || loadingStage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h1 className="text-2xl font-heading font-bold mb-4 md:mb-0 flex items-center">
              <span className="text-primary-light">Cara</span>
              <span className="text-xs text-text-secondary translate-y-[-8px] translate-x-[-2px]">agent</span>
            </h1>
          </div>
          
          {/* Show workflow status component during loading */}
          <WorkflowStatus 
            loadingStage={loadingStage || 'stories'} 
            currentRole={data?.transition?.currentRole || "Current role"} 
            targetRole={data?.transition?.targetRole || "Target role"}
            onCancel={() => {
              setLoadingStage(null);
              setIsProcessing(false);
            }}
          />
        </div>
      </div>
    );
  }

  // Show error state if there's an issue
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h1 className="text-xl font-medium text-red-500 mb-4">Error Loading Dashboard</h1>
            <p className="text-text-secondary mb-4">
              There was a problem loading your career transition data. Please try again or create a new transition.
            </p>
            <p className="text-xs text-text-tertiary font-mono bg-surface-darker p-3 rounded mb-4 overflow-auto">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={() => setLocation("/transitions/new")}
                className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary-light rounded-md transition-colors"
              >
                Create New Transition
              </button>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${transitionId}`] })}
                className="px-4 py-2 bg-surface-lighter hover:bg-surface-light text-text rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle refresh functionality
  const handleRefresh = async () => {
    if (isRefreshing || !transitionId || !data) return;
    
    setIsRefreshing(true);
    
    try {
      toast({
        title: "Refreshing data",
        description: "Updating your transition analysis with fresh data...",
        duration: 3000,
      });
      
      // Clear any existing data first
      await apiRequest("/api/clear-data", {
        method: "POST",
        data: { transitionId }
      });
      
      // Reset state to start fresh analysis
      setLoadingStage('stories');
      setIsProcessing(true);
      
      // Invalidate query to force refresh
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${transitionId}`] });
      
      toast({
        title: "Analysis started",
        description: "Your career transition is being refreshed with the latest data.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh your analysis. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      setIsRefreshing(false);
    }
  };

  // Function to determine the target company based on role name
  const getTargetCompany = () => {
    // Check if data and transition exist before accessing properties
    if (!data || !data.transition || !data.transition.targetRole) {
      return 'Google'; // Default fallback
    }
    
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

  // If we don't have data yet, show a simple loading state
  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="p-8 flex justify-center items-center">
            <div className="animate-pulse text-primary-light">Loading dashboard data...</div>
          </div>
        </div>
      </div>
    );
  }

  // Extract transition data with fallbacks
  const currentRole = data?.transition?.currentRole || "Current Role";
  const targetRole = data?.transition?.targetRole || "Target Role";
  const createdAt = data?.transition?.createdAt ? new Date(data.transition.createdAt).toLocaleDateString() : "recently";
  
  // Extract insights data with fallbacks
  const insights = data?.insights || {};
  const connections = Array.isArray(data?.insights?.connections) ? data.insights.connections : [];
  
  // Extract skills and plan data with fallbacks
  const skills = Array.isArray(data?.skills) ? data.skills : [];
  const plan = data?.plan || {};

  // Main dashboard content - only shown when data is loaded and complete
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-heading font-bold mb-4 md:mb-0">
            Transition Dashboard:{" "}
            <span className="text-primary-light">
              {currentRole} → {targetRole}
            </span>
          </h1>
          <div className="flex items-center">
            <div className="flex items-center">
              <span className="text-sm text-text-secondary mr-2">
                Last updated:
              </span>
              <span className="text-sm text-text">
                {createdAt}
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
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" 
                    />
                  </svg>
                  Career Trajectory Analysis
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Interactive visualization of your personalized career path
                </p>
              </div>
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs flex items-center px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary-light transition-colors"
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="mr-1.5 h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Refresh Analysis
                  </>
                )}
              </button>
            </div>
            
            <div className="p-4 h-64 relative overflow-hidden">
              <div className="absolute inset-0 z-0 opacity-20">
                <DigitalRain speed={0.3} density={0.3} />
              </div>
              
              <div className="absolute inset-0 z-10">
                <CompanyLogoNetwork 
                  currentRole={currentRole}
                  targetRole={targetRole}
                  targetCompany={getTargetCompany()}
                  roleConnections={connections}
                  onSelectCompany={setSelectedCompany}
                  selectedCompany={selectedCompany}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main insight cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Transition Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <ScrapedInsights
                transitionId={transitionId || ""}
                insights={insights}
              />
            </motion.div>
            
            {/* Skills Gap Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <SkillGapAnalysis 
                skills={skills} 
                currentRole={currentRole}
                targetRole={targetRole}
              />
            </motion.div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-8">
            {/* Dashboard Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <TransitionDashboard
                data={data}
                transitionId={transitionId || ""}
              />
            </motion.div>
            
            {/* Career Trajectory */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <CareerTrajectory 
                plan={plan}
                currentRole={currentRole}
                targetRole={targetRole}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;