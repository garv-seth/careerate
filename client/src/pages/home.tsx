import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import WarpBackground from "@/components/ui/warp-background";
import TubelightNavbar from "@/components/ui/tubelight-navbar";
import Footer2 from "@/components/ui/footer2";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const HomePage = () => {
  const { isAuthenticated, login, logout } = useAuth();
  
  // Smooth scroll function
  const smoothScrollTo = useCallback((elementId: string, e?: React.MouseEvent) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Prevent default behavior if event is provided
    if (e) {
      e.preventDefault();
    }
    
    // Calculate navbar height to offset scroll position
    const navbarHeight = 80; // Adjust based on your navbar height
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
    
    // Smooth scroll to element
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    });
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <TubelightNavbar />

      {/* Hero Section - Full screen height */}
      <WarpBackground>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center max-w-4xl mx-auto"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.h1 
                className="text-4xl font-heading font-bold tracking-tight sm:text-5xl md:text-6xl"
                variants={fadeIn}
              >
                <span className="block text-gray-800 dark:text-white drop-shadow-md">Careerate</span>
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-secondary-500 to-accent-500 dark:from-primary-400 dark:via-secondary-300 dark:to-accent-400 drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]">
                  Fight AI Replacement Anxiety
                </span>
              </motion.h1>
              <motion.p 
                className="mt-6 text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto font-medium drop-shadow-sm"
                variants={fadeIn}
              >
                Is AI coming for your job? Don't panic—prepare. Our proprietary career intelligence platform helps you analyze your AI vulnerability, chart safe migration paths, and simulate future-proof career trajectories.
              </motion.p>
              <motion.div 
                className="mt-10 max-w-md mx-auto sm:flex sm:justify-center md:mt-12"
                variants={fadeIn}
              >
                <div className="rounded-md">
                  <Button 
                    size="lg" 
                    className="w-full px-8 py-3 md:py-4 md:text-lg md:px-10 bg-primary-600 text-gray hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-600/40 transition-all duration-200"
                    onClick={() => isAuthenticated ? window.location.href = "/dashboard" : window.location.href = "/api/login"}
                  >
                    {isAuthenticated ? "Your Dashboard" : "Get Early Access"}
                  </Button>
                </div>
                <div className="mt-3 rounded-md sm:mt-0 sm:ml-3">
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={(e) => smoothScrollTo('features', e)}
                    className="w-full px-8 py-3 md:py-4 md:text-lg md:px-10 border-2 border-primary-600 bg-gray/90 text-primary-700 hover:bg-primary-50 dark:bg-transparent dark:border-gray dark:text-gray dark:hover:bg-primary-900/20 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Learn More
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </WarpBackground>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-white sm:text-4xl">
              Future-Proof Your Career
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Our proprietary career intelligence platform is explicitly built to combat AI-induced displacement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100 dark:border-slate-700"
              >
                <div className={`w-12 h-12 rounded-full ${feature.bgColor} flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-white sm:text-4xl">
              How Careerate Works
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Our AI-powered platform analyzes, plans, and guides your career journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {howItWorks.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className={`relative mx-auto w-16 h-16 flex items-center justify-center ${step.bgColor} ${step.textColor} rounded-full mb-4`}>
                  <span className="text-xl font-bold">{index + 1}</span>
                  <div className={`absolute w-full h-full rounded-full ${step.borderColor} animate-ping opacity-20`} style={{ animationDelay: `${index * 0.3}s` }}></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:space-x-10">
            <div className="lg:w-1/2 lg:pr-10 mb-10 lg:mb-0">
              <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-white sm:text-4xl mb-6">
                Your Careerate Dashboard
              </h2>
              <div className="space-y-6">
                {dashboardFeatures.map((feature) => (
                  <div key={feature.title} className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-5 h-5 rounded-full ${feature.bgColor}`}></div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{feature.title}</h3>
                      <p className="mt-2 text-gray-600 dark:text-gray-300">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Button 
                  onClick={() => isAuthenticated ? window.location.href = "/dashboard" : window.location.href = "/auth"} 
                  className="inline-flex items-center px-6 py-3"
                >
                  {isAuthenticated ? "Your Dashboard" : "Explore Dashboard"}
                  <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="lg:w-1/2 shadow-2xl rounded-2xl">
              {/* Dashboard Preview */}
              <div className="rounded-2xl shadow-2xl overflow-hidden border-4 border-white dark:border-gray-800">
                <div className="bg-slate-800 p-3 flex items-center">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="ml-4 text-sm text-white opacity-80">Careerate Dashboard</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Automation Risk Heat Map</h3>
                      <span className="text-sm px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">Medium Risk</span>
                    </div>
                    {/* Risk Heatmap Visualization */}
                    <div className="h-48 bg-gray-100 dark:bg-slate-800 rounded-lg flex flex-col">
                      <div className="flex h-full">
                        <RiskHeatmapColumn cells={[
                          { color: "bg-green-500/70", rounded: "rounded-tl-lg" },
                          { color: "bg-green-500/70" },
                          { color: "bg-yellow-500/70", rounded: "rounded-bl-lg" }
                        ]} />
                        <RiskHeatmapColumn cells={[
                          { color: "bg-green-500/70" },
                          { color: "bg-yellow-500/70" },
                          { color: "bg-yellow-500/70" }
                        ]} />
                        <RiskHeatmapColumn cells={[
                          { color: "bg-yellow-500/70" },
                          { color: "bg-yellow-500/70" },
                          { color: "bg-red-500/70" }
                        ]} />
                        <RiskHeatmapColumn cells={[
                          { color: "bg-yellow-500/70" },
                          { color: "bg-red-500/70" },
                          { color: "bg-red-500/70" }
                        ]} />
                        <RiskHeatmapColumn cells={[
                          { color: "bg-green-500/70", rounded: "rounded-tr-lg" },
                          { color: "bg-red-500/70" },
                          { color: "bg-red-500/70", rounded: "rounded-br-lg" }
                        ]} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Learning Recommendations</h3>
                      <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View All</button>
                    </div>
                    <div className="space-y-3">
                      {learningRecommendations.map((rec) => (
                        <div key={rec.title} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 ${rec.iconBg} rounded-full flex items-center justify-center`}>
                              {rec.icon}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900 dark:text-white">{rec.title}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{rec.details}</div>
                            </div>
                          </div>
                          <button className="px-3 py-1 text-sm rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors">Start</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-heading font-bold text-gray sm:text-4xl mb-4">
            Ready to Future-Proof Your Career?
          </h2>
          <p className="text-xl text-gray mb-10 max-w-3xl mx-auto">
            Get personalized AI insights, industry-specific guidance, and a roadmap to stay ahead in an AI-driven world.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button 
              onClick={() => isAuthenticated ? window.location.href = "/dashboard" : window.location.href = "/auth"}
              variant="secondary" 
              size="lg" 
              className="inline-flex items-center justify-center px-8 py-4 text-primary-700 bg-gray hover:bg-gray-50 font-semibold shadow-lg"
            >
              {isAuthenticated ? "View Dashboard" : "Get Early Access"}
            </Button>
            <Button 
              onClick={(e) => smoothScrollTo('features', e)}
              variant="outline" 
              size="lg" 
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-gray hover:bg-primary-700/90 hover:border-white font-semibold shadow-lg"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      <Footer2 />
    </div>
  );
};

// Features data
const features = [
  {
    icon: (
      <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
    ),
    title: "AI Vulnerability Audit",
    description: "Precisely pinpoint jobs vulnerable to automation with quantitative assessment and risk scoring specific to your role.",
    bgColor: "bg-primary-100 dark:bg-primary-900/30",
    textColor: "text-primary-600 dark:text-primary-400"
  },
  {
    icon: (
      <svg className="w-6 h-6 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    title: "Career Migration Engine",
    description: "Our proprietary algorithm charts precise paths from declining roles to future-safe positions with step-by-step transition plans.",
    bgColor: "bg-secondary-100 dark:bg-secondary-900/30",
    textColor: "text-secondary-600 dark:text-secondary-400"
  },
  {
    icon: (
      <svg className="w-6 h-6 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
    ),
    title: "Career Simulation",
    description: "Test drive different career paths virtually with AI-generated 'digital twins' that predictively model your career trajectory.",
    bgColor: "bg-accent-100 dark:bg-accent-900/30",
    textColor: "text-accent-600 dark:text-accent-400"
  },
  {
    icon: (
      <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    title: "AI Salary Negotiation",
    description: "Our AI negotiation assistant helps boost your compensation package when changing roles, making your subscription pay for itself.",
    bgColor: "bg-primary-100 dark:bg-primary-900/30", 
    textColor: "text-primary-600 dark:text-primary-400"
  }
];

// How it works steps
const howItWorks = [
  {
    title: "Assess AI Vulnerability",
    description: "Our proprietary model analyzes your career to calculate precise displacement risk and timeline.",
    bgColor: "bg-primary-100 dark:bg-primary-900/30",
    textColor: "text-primary-600 dark:text-primary-400",
    borderColor: "border-2 border-primary-200 dark:border-primary-800"
  },
  {
    title: "Explore Safe Transitions",
    description: "Discover optimal migration paths from declining roles to future-proof careers with step-by-step plans.",
    bgColor: "bg-secondary-100 dark:bg-secondary-900/30",
    textColor: "text-secondary-600 dark:text-secondary-400",
    borderColor: "border-2 border-secondary-200 dark:border-secondary-800"
  },
  {
    title: "Simulate Career Paths",
    description: "Test drive different career futures with our innovative career 'digital twin' simulation technology.",
    bgColor: "bg-accent-100 dark:bg-accent-900/30",
    textColor: "text-accent-600 dark:text-accent-400",
    borderColor: "border-2 border-accent-200 dark:border-accent-800"
  }
];

// Dashboard features
const dashboardFeatures = [
  {
    title: "AI Displacement Risk Index™",
    description: "Proprietary scoring system that quantifies your exact vulnerability to AI disruption with time-to-impact predictions.",
    bgColor: "bg-primary-500"
  },
  {
    title: "Career Migration Navigator™",
    description: "Interactive tool visualizing optimal paths from at-risk roles to AI-resistant positions with detailed transition roadmaps.",
    bgColor: "bg-secondary-500"
  },
  {
    title: "Digital Career Twin™",
    description: "Advanced simulation engine that generates future career scenarios based on your decisions and external market factors.",
    bgColor: "bg-accent-500"
  },
  {
    title: "Premium Salary Intelligence",
    description: "Exclusive compensation data and AI-powered negotiation strategies that help maximize your salary in your next role.",
    bgColor: "bg-primary-500"
  }
];

// Learning recommendations
const learningRecommendations = [
  {
    title: "AI Resistance Skills Track",
    details: "Critical Impact • Expert-curated bundle",
    iconBg: "bg-primary-100 dark:bg-primary-900/30",
    icon: (
      <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
      </svg>
    )
  },
  {
    title: "Strategic Career Pivoting",
    details: "High Impact • Exclusive Masterclass",
    iconBg: "bg-secondary-100 dark:bg-secondary-900/30",
    icon: (
      <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
      </svg>
    )
  },
  {
    title: "Future-Safe Domain Expertise",
    details: "Long-term Impact • Personalized Path",
    iconBg: "bg-accent-100 dark:bg-accent-900/30",
    icon: (
      <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
      </svg>
    )
  }
];

// Heatmap column component
const RiskHeatmapColumn = ({ cells }: { cells: { color: string, rounded?: string }[] }) => (
  <div className="w-1/5 h-full flex flex-col">
    {cells.map((cell, i) => (
      <div 
        key={i} 
        className={`h-1/3 ${cell.color} ${cell.rounded || ""} ${i < cells.length - 1 ? "border-b" : ""} border-r border-white dark:border-slate-900`}
      ></div>
    ))}
  </div>
);

export default HomePage;