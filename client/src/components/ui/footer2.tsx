
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
      className="w-full bg-background border-t border-border py-8"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          <div className="flex flex-col gap-4">
            <a href={logo.url} className="flex items-center gap-2">
              <img
                src={logo.src}
                alt={logo.alt}
                title={logo.title}
                className="h-8 w-8"
              />
              <span className="text-lg font-semibold">{logo.title}</span>
            </a>
            <Toggle
              variant="outline"
              size="sm"
              className="w-fit rounded-full bg-background/5 border-border"
              pressed={theme === 'dark'}
              onPressedChange={(pressed) => setTheme(pressed ? 'dark' : 'light')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Toggle>
          </div>
          
          {menuItems.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-3">
              <h3 className="font-semibold text-sm">{section.title}</h3>
              <div className="flex flex-col gap-2">
                {section.links.map((link, linkIdx) => (
                  <a
                    key={linkIdx}
                    href={link.url}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.text}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-border gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{copyright}</span>
            {bottomLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                className="hover:text-primary transition-colors"
              >
                {link.text}
              </a>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Made with <span className="text-blue-500">♥</span> in Seattle
          </p>
        </div>
      </div>
    </motion.footer>
  );
};

export { Footer2 };
export default Footer2;
