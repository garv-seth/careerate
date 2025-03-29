import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ReadinessScore, ReadinessRecommendationItem } from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ReadinessScoreComponentProps {
  readinessScore?: ReadinessScore;
  transitionId: number;
  onUpdate?: () => void;
}

const ReadinessScoreComponent: React.FC<ReadinessScoreComponentProps> = ({
  readinessScore,
  transitionId,
  onUpdate
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateScore = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    toast({
      title: "Generating Readiness Score",
      description: "Analyzing your career readiness...",
      duration: 3000,
    });
    
    try {
      await apiRequest('/api/readiness/generate', {
        method: 'POST',
        data: { transitionId }
      });
      
      // Invalidate the dashboard query to refresh with new readiness data
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${transitionId}`] });
      
      toast({
        title: "Analysis Complete",
        description: "Your AI Readiness Score has been generated!",
        duration: 3000,
      });
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error generating readiness score:', error);
      toast({
        title: "Error",
        description: "Failed to generate your readiness score. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Determine a color for a score based on its value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  // Get a simple text descriptor for a score
  const getScoreDescription = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Needs Improvement';
  };

  // Helper function to render recommendation items
  const renderRecommendations = (recommendations: ReadinessRecommendationItem[]) => {
    if (!recommendations || recommendations.length === 0) {
      return <p className="text-text-secondary italic">No recommendations available.</p>;
    }

    return (
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <Card key={index} className="bg-surface-dark border-primary/10">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">{rec.title}</CardTitle>
                <Badge variant={
                  rec.priority === 'high' ? 'destructive' : 
                  rec.priority === 'medium' ? 'default' : 'secondary'
                } className="ml-2 capitalize">
                  {rec.priority}
                </Badge>
              </div>
              {rec.timeframe && (
                <div className="text-xs text-text-secondary">
                  Timeframe: <span className="capitalize">{rec.timeframe}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="pb-3 pt-0">
              <p className="text-xs text-text-secondary">{rec.description}</p>
              
              {rec.resources && rec.resources.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold mb-1">Resources:</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.resources.map((resource, rIndex) => (
                      <a 
                        key={rIndex}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 hover:bg-primary/20 text-primary-light transition-colors"
                      >
                        {getResourceIcon(resource.type)}
                        <span className="ml-1">{resource.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Helper function to get icon for resource type
  const getResourceIcon = (type: string) => {
    switch(type) {
      case 'course':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
      case 'article':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>;
      case 'video':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
      case 'community':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
      case 'book':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
      case 'tool':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
      default:
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
    }
  };

  // If no readiness score data is available, show the generate button
  if (!readinessScore) {
    return (
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
                    d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
                AI Readiness Score
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Generate a comprehensive assessment of your career transition readiness
              </p>
            </div>
          </div>
          
          <div className="p-6 flex flex-col items-center justify-center">
            <div className="text-center max-w-lg">
              <h3 className="text-lg font-medium mb-2">Evaluate Your Career Transition Readiness</h3>
              <p className="text-sm text-text-secondary mb-6">
                Our AI will analyze market demand, skill gaps, education paths, industry trends, and geographical factors to determine your readiness for this career transition.
              </p>
              
              <Button 
                onClick={handleGenerateScore}
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md transition-colors"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Assessment...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Generate AI Readiness Score
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // When we have readiness score data to display
  return (
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
                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
              AI Readiness Score
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Comprehensive assessment of your career transition readiness
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateScore}
            disabled={isGenerating}
            className="text-xs"
          >
            {isGenerating ? 'Refreshing...' : 'Refresh Analysis'}
          </Button>
        </div>
        
        <div className="p-6">
          {/* Overall score display */}
          <div className="mb-8 flex items-center justify-center">
            <div className="relative">
              <div className="relative flex items-center justify-center">
                <svg className="w-36 h-36" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    className="text-surface-light"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="42"
                    cx="50"
                    cy="50"
                  />
                  {/* Progress circle */}
                  <circle
                    className="text-primary-light"
                    strokeWidth="8"
                    strokeDasharray={`${readinessScore.overallScore * 2.64}, 1000`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="42"
                    cx="50"
                    cy="50"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold">{readinessScore.overallScore}</span>
                  <span className="text-xs text-text-secondary">Overall Score</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Score breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-surface-darker">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-xs">Market Demand</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className={`text-xl font-bold ${getScoreColor(readinessScore.marketDemandScore)}`}>
                        {readinessScore.marketDemandScore}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {getScoreDescription(readinessScore.marketDemandScore)}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Measures demand for this role based on job listings and growth trends.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-surface-darker">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-xs">Skill Gap</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className={`text-xl font-bold ${getScoreColor(readinessScore.skillGapScore)}`}>
                        {readinessScore.skillGapScore}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {getScoreDescription(readinessScore.skillGapScore)}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Evaluates how well your current skills match the target role requirements.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-surface-darker">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-xs">Education Path</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className={`text-xl font-bold ${getScoreColor(readinessScore.educationPathScore)}`}>
                        {readinessScore.educationPathScore}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {getScoreDescription(readinessScore.educationPathScore)}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Assesses available education options for acquiring necessary skills.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-surface-darker">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-xs">Industry Trends</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className={`text-xl font-bold ${getScoreColor(readinessScore.industryTrendScore)}`}>
                        {readinessScore.industryTrendScore}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {getScoreDescription(readinessScore.industryTrendScore)}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Reviews current industry growth and technological trends.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-surface-darker">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-xs">Geographical</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className={`text-xl font-bold ${getScoreColor(readinessScore.geographicalFactorScore)}`}>
                        {readinessScore.geographicalFactorScore}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {getScoreDescription(readinessScore.geographicalFactorScore)}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Examines location-based factors including remote work opportunities.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Recommendations */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">AI Recommendations</h3>
            
            <Tabs defaultValue="skillDevelopment">
              <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-4">
                <TabsTrigger value="skillDevelopment" className="text-xs">Skills</TabsTrigger>
                <TabsTrigger value="marketPositioning" className="text-xs">Positioning</TabsTrigger>
                <TabsTrigger value="educationPaths" className="text-xs">Education</TabsTrigger>
                <TabsTrigger value="experienceBuilding" className="text-xs">Experience</TabsTrigger>
                <TabsTrigger value="networkingOpportunities" className="text-xs">Networking</TabsTrigger>
                <TabsTrigger value="nextSteps" className="text-xs">Next Steps</TabsTrigger>
              </TabsList>
              
              <TabsContent value="skillDevelopment" className="pt-2">
                {renderRecommendations(readinessScore.recommendations.skillDevelopment)}
              </TabsContent>
              
              <TabsContent value="marketPositioning" className="pt-2">
                {renderRecommendations(readinessScore.recommendations.marketPositioning)}
              </TabsContent>
              
              <TabsContent value="educationPaths" className="pt-2">
                {renderRecommendations(readinessScore.recommendations.educationPaths)}
              </TabsContent>
              
              <TabsContent value="experienceBuilding" className="pt-2">
                {renderRecommendations(readinessScore.recommendations.experienceBuilding)}
              </TabsContent>
              
              <TabsContent value="networkingOpportunities" className="pt-2">
                {renderRecommendations(readinessScore.recommendations.networkingOpportunities)}
              </TabsContent>
              
              <TabsContent value="nextSteps" className="pt-2">
                {renderRecommendations(readinessScore.recommendations.nextSteps)}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <CardFooter className="bg-background/5 border-t border-primary/10 p-4">
          <div className="text-xs text-text-secondary">
            <p>Score generated {readinessScore.updatedAt ? new Date(readinessScore.updatedAt).toLocaleString() : 'recently'} • 
            Combines data from job listings, professional forums, education resources, and industry trends.</p>
          </div>
        </CardFooter>
      </div>
    </motion.div>
  );
};

export default ReadinessScoreComponent;