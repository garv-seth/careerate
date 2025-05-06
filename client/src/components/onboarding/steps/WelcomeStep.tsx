import { Button } from '@/components/ui/button';
import { AgentAvatar } from '@/components/avatars/AgentAvatars';

type WelcomeStepProps = {
  onNext: () => void;
};

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Welcome to Careerate</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Your AI-powered career acceleration platform
        </p>
      </div>

      <div className="bg-muted/30 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Meet Your Career AI Team</h2>
        <p className="text-muted-foreground">
          Our specialized AI agents work together to analyze your profile, identify opportunities, and create personalized career development plans.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="flex items-start gap-3">
            <AgentAvatar agent="cara" size="md" />
            <div>
              <h3 className="font-medium">Cara</h3>
              <p className="text-sm text-muted-foreground">
                Coordinates your career strategy and orchestrates personalized recommendations.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <AgentAvatar agent="maya" size="md" />
            <div>
              <h3 className="font-medium">Maya</h3>
              <p className="text-sm text-muted-foreground">
                Analyzes your resume to identify strengths, gaps, and automation risks.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <AgentAvatar agent="ellie" size="md" />
            <div>
              <h3 className="font-medium">Ellie</h3>
              <p className="text-sm text-muted-foreground">
                Monitors industry trends and identifies emerging opportunities.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <AgentAvatar agent="sophia" size="md" />
            <div>
              <h3 className="font-medium">Sophia</h3>
              <p className="text-sm text-muted-foreground">
                Creates personalized learning paths to help you develop in-demand skills.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">What to Expect</h2>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">1</div>
            <p>Upload your resume (optional) for personalized analysis</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">2</div>
            <p>Tell us about your career stage and goals</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">3</div>
            <p>Share your learning preferences and availability</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">4</div>
            <p>Complete a skills assessment to create your personalized roadmap</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6">
        <div className="flex justify-center">
          <Button 
            variant="cara" 
            size="lg" 
            onClick={onNext} 
            animation="shimmer"
            elevation="lg"
            className="w-full sm:w-auto"
          >
            Let's Get Started
          </Button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="maya-soft" size="sm">
            <AgentAvatar agent="maya" size="sm" />
            Resume Analysis
          </Button>
          
          <Button variant="ellie-soft" size="sm">
            <AgentAvatar agent="ellie" size="sm" />
            Industry Insights
          </Button>
          
          <Button variant="sophia-soft" size="sm">
            <AgentAvatar agent="sophia" size="sm" />
            Learning Paths
          </Button>
        </div>
      </div>
    </div>
  );
}