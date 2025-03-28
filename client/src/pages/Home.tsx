import React from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import DigitalRain from "@/components/DigitalRain";
import { useQuery } from "@tanstack/react-query";

// Define the auth response type
interface AuthResponse {
  success: boolean;
  user?: {
    id: number;
    email: string;
    username?: string;
    currentRole?: string;
    profileCompleted?: boolean;
  };
  profile?: any;
  skills?: any[];
}

const Home: React.FC = () => {
  // Check if user is authenticated
  const { data: userData, isLoading } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/me'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on 401 errors
    refetchOnWindowFocus: false,
  });
  
  // Check if user data exists and has a user property
  const isAuthenticated = !!(userData && userData.user);
  return (
    <div className="relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-cyber-grid bg-20 opacity-5 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative pt-10 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="z-10"
            >

              
              <motion.h1 
                className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                <div className="inline-block relative">
                  <span className="text-primary">T</span>
                  <motion.span 
                    className="text-primary relative inline-block"
                    whileHover={{ 
                      color: "white", 
                      textShadow: "0 0 8px rgba(4, 128, 222, 0.6)",
                      transition: { duration: 0.3 }
                    }}
                  >r</motion.span>
                  <span className="text-primary">a</span>
                  <motion.span 
                    className="text-primary relative inline-block"
                    whileHover={{ 
                      color: "white", 
                      textShadow: "0 0 8px rgba(4, 128, 222, 0.6)",
                      transition: { duration: 0.3 }
                    }}
                  >n</motion.span>
                  <span className="text-primary">s</span>
                  <motion.span 
                    className="text-primary relative inline-block"
                    whileHover={{ 
                      color: "white", 
                      textShadow: "0 0 8px rgba(4, 128, 222, 0.6)",
                      transition: { duration: 0.3 }
                    }}
                  >f</motion.span>
                  <span className="text-primary">o</span>
                  <motion.span 
                    className="text-primary relative inline-block"
                    whileHover={{ 
                      color: "white", 
                      textShadow: "0 0 8px rgba(4, 128, 222, 0.6)",
                      transition: { duration: 0.3 }
                    }}
                  >r</motion.span>
                  <span className="text-primary">m</span>
                </div>
                <br />
                <div className="inline-block">
                  <motion.span 
                    className="text-primary relative inline-block"
                    whileHover={{ 
                      color: "white", 
                      textShadow: "0 0 8px rgba(4, 128, 222, 0.6)",
                      transition: { duration: 0.3 }
                    }}
                  >Y</motion.span>
                  <span className="text-primary">o</span>
                  <motion.span 
                    className="text-primary relative inline-block"
                    whileHover={{ 
                      color: "white", 
                      textShadow: "0 0 8px rgba(4, 128, 222, 0.6)",
                      transition: { duration: 0.3 }
                    }}
                  >u</motion.span>
                  <span className="text-primary">r</span>
                </div>
                {" "}
                <motion.span 
                  className="text-white relative inline-block"
                  whileHover={{ 
                    color: "#0480DE", 
                    transition: { duration: 0.3 }
                  }}
                >
                  Career
                  <motion.span 
                    className="absolute -bottom-2 left-0 right-0 h-1 bg-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 1.2 }}
                  />
                </motion.span>
              </motion.h1>
              
              <motion.p 
                className="text-lg text-text-secondary mb-8 max-w-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.6 }}
              >
                Revolutionize your career journey with AI-powered precision. Careerate analyzes real-world transition data to create your personalized path to success—no more guesswork, just strategic career advancement backed by data.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.8 }}
              >
                {isAuthenticated ? (
                  <Link href="/transitions/new">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg shadow-glow hover:shadow-glow-lg transition-all duration-300"
                    >
                      Explore Transitions
                    </motion.button>
                  </Link>
                ) : (
                  <Link href="/signup">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg shadow-glow hover:shadow-glow-lg transition-all duration-300"
                    >
                      Get Started
                    </motion.button>
                  </Link>
                )}
                <Link href="/dashboard/1">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-surface hover:bg-surface-light border border-primary/30 text-text font-medium rounded-lg transition-all duration-300"
                  >
                    View Demo
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>
            
            <motion.div 
              className="relative z-10 lg:flex justify-end hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <div className="relative w-[500px] h-[400px] bg-surface-dark rounded-2xl overflow-hidden shadow-glow">
                {/* Futuristic UI overlay */}
                <div className="absolute inset-0 bg-cyber-grid bg-10 opacity-10"></div>
                
                {/* Cyberpunk-style person image would go here */}
                <div className="absolute inset-0 bg-gradient-to-tl from-primary/10 via-background/50 to-transparent">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative w-28 h-28 mx-auto mb-6">
                        {/* Actual Careerate logo with subtle glow effect */}
                        <div className="absolute inset-0 bg-[#0480DE] rounded-full opacity-5 blur-lg animate-pulse-slow scale-105"></div>
                        <img 
                          src="/careerate-icon.png" 
                          alt="Careerate Logo" 
                          className="w-full h-full relative z-10 animate-logo-pulse"
                        />
                      </div>
                      <div className="mb-4 relative">
                        <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                      </div>
                      <div className="space-y-2 px-8">
                        <div className="h-2 w-40 mx-auto bg-primary/30 rounded"></div>
                        <div className="h-2 w-60 mx-auto bg-primary/20 rounded"></div>
                        <div className="h-2 w-32 mx-auto bg-primary/10 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Scan line effect */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-0 w-full h-px bg-primary/50 animate-scan-line"></div>
                </div>
                
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/60"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/60"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/60"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/60"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Digital Rain Transition Element */}
      <div className="relative py-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="pointer-events-none"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent z-0"></div>
          <DigitalRain height={100} primaryColor="rgba(4, 128, 222, 1)" density={3} speed={1.2} />
        </motion.div>
        <div className="container mx-auto px-6 py-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="text-primary-light font-medium tracking-wide">POWERED BY CARA<sup className="text-xs">agent</sup></span>
            <h3 className="text-lg text-text-secondary">Analyzing career paths, processing transition data</h3>
          </motion.div>
        </div>
      </div>


      
      {/* How It Works Section */}
      <section className="py-16 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold relative inline-block">
              <span className="relative z-10">How Careerate Works</span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-primary-light/50"></div>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto mt-4">
              Powered by multi-agent AI technology that analyzes thousands of real career transitions to build your personalized blueprint for success.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="relative bg-surface border border-primary/10 rounded-xl p-8 hover:shadow-glow transition-all duration-500 group"
            >
              <div className="absolute inset-0 bg-cyber-grid bg-40 opacity-5 rounded-xl"></div>
              
              <motion.div 
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors duration-300 mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </motion.div>
              
              <h3 className="text-xl font-medium mb-3 text-center">
                <span className="text-primary-light mr-2 font-mono">01</span>
                <span>Enter Your Roles</span>
              </h3>
              
              <p className="text-text-secondary text-center">
                Tell us your current role and where you want to go next in your career journey.
              </p>
              
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full opacity-70"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 border border-primary rounded-full"></div>
            </motion.div>
            
            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative bg-surface border border-primary/10 rounded-xl p-8 hover:shadow-glow transition-all duration-500 group"
            >
              <div className="absolute inset-0 bg-cyber-grid bg-40 opacity-5 rounded-xl"></div>
              
              <motion.div 
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors duration-300 mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </motion.div>
              
              <h3 className="text-xl font-medium mb-3 text-center">
                <span className="text-primary-light mr-2 font-mono">02</span>
                <span>AI Analysis</span>
              </h3>
              
              <p className="text-text-secondary text-center">
                Our AI scrapes and analyzes real transition stories to identify your skill gaps and success patterns.
              </p>
              
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full opacity-70"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 border border-primary rounded-full"></div>
            </motion.div>
            
            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="relative bg-surface border border-primary/10 rounded-xl p-8 hover:shadow-glow transition-all duration-500 group"
            >
              <div className="absolute inset-0 bg-cyber-grid bg-40 opacity-5 rounded-xl"></div>
              
              <motion.div 
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors duration-300 mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </motion.div>
              
              <h3 className="text-xl font-medium mb-3 text-center">
                <span className="text-primary-light mr-2 font-mono">03</span>
                <span>Personalized Plan</span>
              </h3>
              
              <p className="text-text-secondary text-center">
                Get a custom development plan with actionable milestones and free learning resources.
              </p>
              
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full opacity-70"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 border border-primary rounded-full"></div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold relative inline-block">
              <span className="relative z-10">Empower Your Career</span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-primary-light/50"></div>
            </h2>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
            >
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="mt-1 bg-primary/10 rounded-lg p-2.5 w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">AI-Powered Analytics</h3>
                    <p className="text-text-secondary">
                      Careerate's AI-powered analytics and personalized recommendations help you pinpoint your strengths.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="mt-1 bg-primary/10 rounded-lg p-2.5 w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Skill Assessment</h3>
                    <p className="text-text-secondary">
                      Our intuitive skill assessment tools and personalized coaching sessions empower you to develop a strategic action plan.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="mt-1 bg-primary/10 rounded-lg p-2.5 w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Personalized Resources</h3>
                    <p className="text-text-secondary">
                      Careerate's expansive resource library and tailored learning path connect you with the most relevant opportunities.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="relative lg:flex justify-start hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="relative w-full h-[400px] bg-surface-dark rounded-2xl overflow-hidden shadow-glow-sm">
                {/* Style similar to the hero image but with different layout */}
                <div className="absolute inset-0 bg-cyber-grid bg-10 opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-transparent"></div>
                
                {/* Feature highlights with futuristic UI elements */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="grid grid-cols-2 gap-6 w-full h-full">
                    <div className="bg-surface/20 border border-primary/20 rounded-lg p-4 flex flex-col backdrop-blur-sm">
                      <div className="text-primary-light text-sm font-mono mb-2">01 // ANALYSIS</div>
                      <div className="h-1 w-12 bg-primary/40 mb-3"></div>
                      <div className="h-2 w-24 bg-text-muted/20 rounded mb-2"></div>
                      <div className="h-2 w-32 bg-text-muted/10 rounded mb-2"></div>
                      <div className="h-2 w-20 bg-text-muted/10 rounded"></div>
                    </div>
                    <div className="bg-surface/20 border border-primary/20 rounded-lg p-4 flex flex-col backdrop-blur-sm">
                      <div className="text-primary-light text-sm font-mono mb-2">02 // SKILLS</div>
                      <div className="h-1 w-12 bg-primary/40 mb-3"></div>
                      <div className="h-2 w-28 bg-text-muted/20 rounded mb-2"></div>
                      <div className="h-2 w-20 bg-text-muted/10 rounded mb-2"></div>
                      <div className="h-2 w-24 bg-text-muted/10 rounded"></div>
                    </div>
                    <div className="bg-surface/20 border border-primary/20 rounded-lg p-4 flex flex-col backdrop-blur-sm">
                      <div className="text-primary-light text-sm font-mono mb-2">03 // PLAN</div>
                      <div className="h-1 w-12 bg-primary/40 mb-3"></div>
                      <div className="h-2 w-20 bg-text-muted/20 rounded mb-2"></div>
                      <div className="h-2 w-32 bg-text-muted/10 rounded mb-2"></div>
                      <div className="h-2 w-24 bg-text-muted/10 rounded"></div>
                    </div>
                    <div className="bg-surface/20 border border-primary/20 rounded-lg p-4 flex flex-col backdrop-blur-sm">
                      <div className="text-primary-light text-sm font-mono mb-2">04 // GROWTH</div>
                      <div className="h-1 w-12 bg-primary/40 mb-3"></div>
                      <div className="h-2 w-28 bg-text-muted/20 rounded mb-2"></div>
                      <div className="h-2 w-20 bg-text-muted/10 rounded mb-2"></div>
                      <div className="h-2 w-32 bg-text-muted/10 rounded"></div>
                    </div>
                  </div>
                </div>
                
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/60"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/60"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/60"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/60"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-12 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="bg-surface border border-primary/20 rounded-2xl p-10 shadow-glow relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-cyber-grid bg-10 opacity-5"></div>
            
            <div className="relative flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-2xl font-heading font-bold mb-4">Ready to Transform Your Career?</h3>
                <p className="text-text-secondary max-w-xl">
                  Get started today and let Careerate's AI-powered platform guide your career transition journey.
                </p>
              </div>
              
              {/* Use conditional rendering based on authentication status */}
              {isAuthenticated ? (
                <Link href="/transitions/new">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg shadow-glow hover:shadow-glow-lg transition-all duration-300"
                  >
                    Explore Transitions
                  </motion.button>
                </Link>
              ) : (
                <Link href="/signup">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg shadow-glow hover:shadow-glow-lg transition-all duration-300"
                  >
                    Start Your Journey
                  </motion.button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
