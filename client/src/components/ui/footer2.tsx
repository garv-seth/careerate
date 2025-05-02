import React from "react";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import careerateLogoSrc from "@assets/CareerateICON.png";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

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
  menuItems?: MenuItem[];
}

const Footer2 = ({
  logo = {
    src: careerateLogoSrc,
    alt: "Careerate Logo",
    title: "Careerate",
    url: "/",
  },
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
  ],
}: Footer2Props) => {
  const { theme, setTheme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    setIsVisible(false); // Initially hide footer
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const isAtBottom = (windowHeight + currentScrollY) >= (documentHeight - 100);
      setIsVisible(isAtBottom && currentScrollY > 100); // Only show when scrolled past initial view
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <footer className={`fixed bottom-0 left-0 right-0 flex justify-center pb-4 z-50 transition-all duration-300 ${
      isVisible 
        ? 'opacity-100 translate-y-0 scale-100' 
        : 'opacity-0 translate-y-full scale-95'
    }`}>
      <div className="bg-background/5 border border-border backdrop-blur-lg py-4 px-6 rounded-full shadow-lg">
        <div className="flex flex-wrap items-center justify-center gap-8">
          {menuItems.map((section, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground/80">{section.title}</h3>
              <div className="flex gap-4">
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

          <div className="flex items-center gap-4 border-l border-border pl-4">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                className="bg-background/5"
                aria-label="Toggle theme"
              />
              <Moon className="h-4 w-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              Made with <span className="text-blue-500">♥</span> in Seattle
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Footer2 };
export default Footer2;