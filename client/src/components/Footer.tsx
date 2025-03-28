import React from "react";
import Logo from "./Logo";
import { motion } from "framer-motion";
import { Link } from "wouter";

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
                <Link href="/career-guides">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Career Guides
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/skill-gap-assessment">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Skill Gap Assessment
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/learning-resources">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Learning Resources
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/success-stories">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Success Stories
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
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
                <Link href="/privacy-policy">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Privacy Policy
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Terms of Service
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Cookie Policy
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
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
                <Link href="/contact">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Contact Us
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/support">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Support
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/partnerships">
                  <div className="text-text-secondary hover:text-primary transition-all duration-300 text-sm flex items-center group cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2 group-hover:scale-150 group-hover:bg-primary transition-all duration-300"></span>
                    <span className="relative">
                      Partnerships
                      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </div>
                </Link>
              </li>
            </ul>
          </motion.div>
        </div>
        
        <div className="pt-6 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-text-secondary mb-4 md:mb-0">
            <span className="opacity-70">© {new Date().getFullYear()} Careerate</span>
            <div className="inline-block h-3 w-px bg-text-secondary mx-3 opacity-30"></div>
            <span className="opacity-70">Powered by Cara<sup>agent</sup></span>
            <div className="inline-block h-3 w-px bg-text-secondary mx-3 opacity-30"></div>
            <span className="opacity-70">Made with ❤️ in Seattle</span>
          </div>
          <div className="flex space-x-6">
            {/* LinkedIn */}
            <a 
              href="https://www.linkedin.com/in/garvseth" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-text-muted hover:text-primary transition-colors duration-300 transform hover:scale-110"
              aria-label="LinkedIn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
            
            {/* X (Twitter) with updated X logo */}
            <a 
              href="https://x.com/SethGarv24824" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-text-muted hover:text-primary transition-colors duration-300 transform hover:scale-110"
              aria-label="X (Twitter)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" 
                  fill="currentColor" />
              </svg>
            </a>
            
            {/* Instagram */}
            <a 
              href="https://www.instagram.com/isgarv" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-text-muted hover:text-primary transition-colors duration-300 transform hover:scale-110"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            
            {/* GitHub */}
            <a 
              href="https://github.com/garv-seth" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-text-muted hover:text-primary transition-colors duration-300 transform hover:scale-110"
              aria-label="GitHub"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;;
