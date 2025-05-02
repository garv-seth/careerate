
import React from "react";
import { Button } from "@/components/ui/button";
import { Github, Twitter, Linkedin } from "lucide-react";
import careerateLogoSrc from "@assets/CareerateICON.png";

interface FooterProps {
  logo?: {
    src: string;
    alt: string;
  };
  brandName?: string;
  socialLinks?: Array<{
    icon: React.ReactNode;
    href: string;
    label: string;
  }>;
  mainLinks?: Array<{
    href: string;
    label: string;
  }>;
  legalLinks?: Array<{
    href: string;
    label: string;
  }>;
  copyright?: {
    text: string;
    license?: string;
  };
}

export function Footer({
  logo = {
    src: careerateLogoSrc,
    alt: "Careerate Logo",
  },
  brandName = "Careerate",
  socialLinks = [
    {
      icon: <Linkedin className="h-5 w-5" />,
      href: "https://linkedin.com",
      label: "LinkedIn",
    },
    {
      icon: <Twitter className="h-5 w-5" />,
      href: "https://twitter.com",
      label: "Twitter",
    },
    {
      icon: <Github className="h-5 w-5" />,
      href: "https://github.com",
      label: "GitHub",
    },
  ],
  mainLinks = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/blog", label: "Blog" },
  ],
  legalLinks = [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
  copyright = {
    text: "© 2024 Careerate",
    license: "AI-powered career acceleration platform",
  },
}: FooterProps) {
  return (
    <footer className="bg-white dark:bg-slate-900 pb-6 pt-16 lg:pb-8 lg:pt-24 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="md:flex md:items-start md:justify-between">
          <a
            href="/"
            className="flex items-center gap-x-2"
            aria-label={brandName}
          >
            <img src={logo.src} alt={logo.alt} className="h-10 w-10" />
            <span className="font-heading font-bold text-xl text-gray-900 dark:text-white">{brandName}</span>
          </a>
          <ul className="flex list-none mt-6 md:mt-0 space-x-3">
            {socialLinks.map((link, i) => (
              <li key={i}>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-primary hover:bg-primary/10 dark:border-primary-400 dark:hover:bg-primary-900/20"
                  asChild
                >
                  <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
                    {link.icon}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 pt-6 md:mt-4 md:pt-8 lg:grid lg:grid-cols-10 border-t border-gray-200 dark:border-gray-800">
          <nav className="lg:mt-0 lg:col-[4/11]">
            <ul className="list-none flex flex-wrap -my-1 -mx-2 lg:justify-end">
              {mainLinks.map((link, i) => (
                <li key={i} className="my-1 mx-2 shrink-0">
                  <a
                    href={link.href}
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 lg:mt-0 lg:col-[4/11]">
            <ul className="list-none flex flex-wrap -my-1 -mx-3 lg:justify-end">
              {legalLinks.map((link, i) => (
                <li key={i} className="my-1 mx-3 shrink-0">
                  <a
                    href={link.href}
                    className="text-sm text-gray-500 dark:text-gray-400 underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 text-sm leading-6 text-gray-500 dark:text-gray-400 lg:mt-0 lg:row-[1/3] lg:col-[1/4]">
            <div>{copyright.text}</div>
            {copyright.license && <div className="text-primary-600 dark:text-primary-400">{copyright.license}</div>}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
