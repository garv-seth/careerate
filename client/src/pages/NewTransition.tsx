import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import TransitionForm from "@/components/TransitionForm";
import DigitalRain from "@/components/DigitalRain";

const NewTransition: React.FC = () => {
  return (
    <div className="relative overflow-hidden min-h-screen pb-16">
      {/* Background elements */}
      <div className="absolute inset-0 bg-cyber-grid bg-20 opacity-5 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none"></div>

      {/* Header */}
      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center mb-8"
        >
          <div className="inline-block px-4 py-1 mb-4 border border-primary/30 bg-surface rounded-lg">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-300 text-sm font-medium tracking-wide">
              CAREER TRANSITION ANALYSIS
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Begin Your <span className="text-primary">Career Evolution</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Leverage Cara AI to analyze career transitions using real-world data, identify skill gaps, and create a personalized development plan.
          </p>
        </motion.div>
      </div>

      {/* Digital Rain Accent */}
      <div className="relative h-16 mb-8">
        <DigitalRain height={60} primaryColor="rgba(0, 195, 255, 0.8)" density={4} speed={1.5} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className="font-mono text-primary tracking-wider text-xs">CARA • AI • AGENT</span>
          </div>
        </div>
      </div>

      {/* Main Form Section */}
      <section className="container mx-auto px-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="card rounded-xl shadow-glow overflow-hidden border border-primary/20">
            <div className="bg-surface-dark/80 py-4 px-6 border-b border-primary/20">
              <div className="flex items-center">
                <svg 
                  className="mr-3 h-6 w-6 text-primary" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <h2 className="text-xl font-heading font-semibold text-primary-light">
                    Career Path Analysis
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Get personalized insights in under 2 minutes
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <TransitionForm />
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Info Panels */}
      <section className="container mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-surface-dark/40 backdrop-blur-sm rounded-xl p-5 border border-primary/10"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-primary" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M16 13H8"/>
                <path d="M16 17H8"/>
                <path d="M10 9H8"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2 text-primary-light">Real-World Stories</h3>
            <p className="text-sm text-text-secondary">
              Our AI scrapes and analyzes actual career transition experiences from forums, social media, and professional networks.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-surface-dark/40 backdrop-blur-sm rounded-xl p-5 border border-primary/10"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-primary" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2 text-primary-light">Skill Gap Analysis</h3>
            <p className="text-sm text-text-secondary">
              Identify the key skills needed for your target role and understand which ones you need to develop or improve.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-surface-dark/40 backdrop-blur-sm rounded-xl p-5 border border-primary/10"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-primary" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2 text-primary-light">Custom Learning Plan</h3>
            <p className="text-sm text-text-secondary">
              Get a personalized step-by-step roadmap with recommended resources to help you achieve your career goals.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default NewTransition;