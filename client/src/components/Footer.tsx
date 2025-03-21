import React from "react";
import Logo from "./Logo";
import { motion } from "framer-motion";

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-background border-t border-primary/10 py-10">
      <div className="absolute inset-0 bg-cyber-grid bg-20 opacity-5"></div>
      
      {/* Animated scan line effect */}
      <div className="absolute bottom-0 left-0 right-0 h-full overflow-hidden pointer-events-none opacity-10 rotate-180">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-primary animate-scan-line"></div>
      </div>
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Logo size="md" />
              <p className="text-text-secondary mt-4 text-sm">
                Accelerate your career transition with our AI-powered analysis and personalized development plans.
              </p>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="font-medium text-text mb-4 text-sm uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Career Guides
                </a>
              </li>
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Skill Gap Assessment
                </a>
              </li>
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Learning Resources
                </a>
              </li>
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Success Stories
                </a>
              </li>
            </ul>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="font-medium text-text mb-4 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Cookie Policy
                </a>
              </li>
            </ul>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h4 className="font-medium text-text mb-4 text-sm uppercase tracking-wider">Connect</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Support
                </a>
              </li>
              <li>
                <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></span>
                  Partnerships
                </a>
              </li>
            </ul>
          </motion.div>
        </div>
        
        <div className="pt-6 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-text-secondary mb-4 md:mb-0">
            <span className="opacity-70">© {new Date().getFullYear()} Careerate</span>
            <div className="inline-block h-3 w-px bg-text-secondary mx-3 opacity-30"></div>
            <span className="opacity-70">Powered by Cara AI</span>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-text-muted hover:text-primary transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
            <a href="#" className="text-text-muted hover:text-primary transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
              </svg>
            </a>
            <a href="#" className="text-text-muted hover:text-primary transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;;
