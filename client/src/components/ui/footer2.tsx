import React from "react";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
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
  
  return (
    <footer className="w-full bg-background border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between">
          {/* Logo and tagline */}
          <div className="mb-10 md:mb-0">
            <div className="flex items-center gap-2">
              <a href={logo.url} className="flex items-center">
                <img
                  src={logo.src}
                  alt={logo.alt}
                  title={logo.title}
                  className="h-10 w-10"
                />
                <p className="text-xl font-semibold ml-2">{logo.title}</p>
              </a>
            </div>
            <p className="mt-4 text-muted-foreground">{tagline}</p>
            
            {/* Theme toggle in footer */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Theme:</span>
              <Toggle
                variant="outline" 
                size="sm"
                className="rounded-full bg-background border-border"
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
              <span className="text-sm text-muted-foreground">
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </div>
          </div>
          
          {/* Navigation sections */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4">
            {menuItems.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="font-bold text-foreground mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <a 
                        href={link.url} 
                        className="text-muted-foreground hover:text-primary transition-colors"
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
        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">{copyright}</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            {bottomLinks.map((link, linkIdx) => (
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
      </div>
    </footer>
  );
};

export { Footer2 };
export default Footer2;