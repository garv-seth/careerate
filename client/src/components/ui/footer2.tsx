
import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import careerateLogoSrc from "@assets/CareerateICON.png";

interface MenuItem {
  title: string;
  links: {
    text: string;
    url: string;
  }[];
}

interface Footer2Props {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  tagline?: string;
  menuItems?: MenuItem[];
  copyright?: string;
  bottomLinks?: {
    text: string;
    url: string;
  }[];
}

const Footer2 = ({
  logo = {
    src: careerateLogoSrc,
    alt: "Careerate Logo",
    title: "Careerate",
    url: "/",
  },
  tagline = "Career acceleration platform.",
  menuItems = [
    {
      title: "Product",
      links: [
        { text: "Overview", url: "/overview" },
        { text: "Pricing", url: "/pricing" },
        { text: "Features", url: "/features" },
        { text: "Updates", url: "/updates" },
      ],
    },
    {
      title: "Company",
      links: [
        { text: "About", url: "/about" },
        { text: "Team", url: "/team" },
        { text: "Blog", url: "/blog" },
        { text: "Careers", url: "/careers" },
        { text: "Contact", url: "/contact" },
      ],
    },
    {
      title: "Resources",
      links: [
        { text: "Help Center", url: "/help" },
        { text: "Support", url: "/support" },
        { text: "API Docs", url: "/api-docs" },
      ],
    },
    {
      title: "Social",
      links: [
        { text: "Twitter", url: "https://twitter.com/gocareerate" },
        { text: "Instagram", url: "https://instagram.com/gocareerate" },
        { text: "LinkedIn", url: "https://linkedin.com/company/careerate" },
      ],
    },
  ],
  copyright = "© 2025 Careerate. All rights reserved.",
  bottomLinks = [
    { text: "Terms of Service", url: "/terms" },
    { text: "Privacy Policy", url: "/privacy" },
  ],
}: Footer2Props) => {
  const { theme, setTheme } = useTheme();
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.8, 1], [0, 0.8, 1]);
  
  return (
    <motion.footer 
      style={{ scale, opacity }}
      className="w-full bg-background border-t border-border py-6"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Logo and tagline */}
          <div className="w-full md:w-auto">
            <div className="flex items-center gap-2">
              <a href={logo.url} className="flex items-center">
                <img
                  src={logo.src}
                  alt={logo.alt}
                  title={logo.title}
                  className="h-8 w-8"
                />
                <p className="text-lg font-semibold ml-2">{logo.title}</p>
              </a>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
            
            {/* Theme toggle */}
            <div className="mt-3 flex items-center gap-2">
              <Toggle
                variant="outline" 
                size="sm"
                className="rounded-full bg-background border-border"
                pressed={theme === 'dark'}
                onPressedChange={(pressed) => setTheme(pressed ? 'dark' : 'light')}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Moon className="h-3 w-3" />
                ) : (
                  <Sun className="h-3 w-3" />
                )}
              </Toggle>
            </div>
          </div>
          
          {/* Navigation sections */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full md:w-auto">
            {menuItems.map((section, sectionIdx) => (
              <div key={sectionIdx} className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                <ul className="space-y-1">
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <a 
                        href={link.url} 
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="mt-6 pt-4 border-t border-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-muted-foreground">{copyright}</p>
          <div className="flex space-x-4 mt-2 md:mt-0">
            {bottomLinks.map((link, linkIdx) => (
              <a 
                key={linkIdx} 
                href={link.url} 
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {link.text}
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export { Footer2 };
export default Footer2;
