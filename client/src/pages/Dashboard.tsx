import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import TransitionDashboard from "@/components/TransitionDashboard";
import SkillGapAnalysis from "@/components/SkillGapAnalysis";
import CareerTrajectory from "@/components/CareerTrajectory";
import ScrapedInsights from "@/components/ScrapedInsights";
import CompanyLogoNetwork from "@/components/CompanyLogoNetwork";
import DigitalRain from "@/components/DigitalRain";
import { apiRequest } from "@/lib/queryClient";
import { DashboardData } from "@/types";

const Dashboard: React.FC = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/dashboard/:transitionId");
  const transitionId = params?.transitionId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  // Redirect if no transitionId
  useEffect(() => {
    if (!match) {
      setLocation("/");
    }
  }, [match, setLocation]);

  // Fetch dashboard data
  const { data, isLoading, isError, error } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${transitionId}`],
    enabled: !!transitionId,
  });

  // Process API if transition is not complete
  useEffect(() => {
    const processApiSteps = async () => {
      if (!data || data.isComplete) return;

      try {
        // Step 1: Scrape forums
        toast({
          title: "Scraping forums",
          description: "Finding similar career transitions...",
          duration: 3000,
        });
        
        await apiRequest("/api/scrape", {
          method: "POST",
          data: { transitionId }
        });
        
        // Step 2: Analyze skills
        toast({
          title: "Analyzing skills",
          description: "Identifying skill gaps...",
          duration: 3000,
        });
        
        await apiRequest("/api/analyze", {
          method: "POST",
          data: { transitionId }
        });
        
        // Step 3: Generate plan
        toast({
          title: "Generating plan",
          description: "Creating your personalized career trajectory plan...",
          duration: 3000,
        });
        
        await apiRequest("/api/plan", {
          method: "POST",
          data: { transitionId }
        });
        
        // Refresh dashboard data
        queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${transitionId}`] });
        
        toast({
          title: "Analysis complete",
          description: "Your career transition plan is ready!",
          duration: 5000,
        });
      } catch (error) {
        console.error("Error processing API steps:", error);
        toast({
          title: "Error",
          description: "Failed to complete analysis. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    };

    processApiSteps();
  }, [data, transitionId, toast, queryClient]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-surface-dark rounded w-3/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-64 bg-surface-dark rounded"></div>
              <div className="h-64 bg-surface-dark rounded"></div>
              <div className="h-64 bg-surface-dark rounded"></div>
            </div>
            <div className="h-96 bg-surface-dark rounded"></div>
          </div>
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
            <span className="text-sm text-text-secondary mr-2">
              Last updated:
            </span>
            <span className="text-sm text-text">
              {new Date(data.transition.createdAt).toLocaleDateString()}
            </span>
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
            
            <CompanyLogoNetwork 
              height={350} 
              className="bg-surface-dark/80" 
              selectedCompany={selectedCompany || getTargetCompany()}
              onSelectCompany={setSelectedCompany}
              interactionStrength={1.5}
            />
            
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
