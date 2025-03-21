import React from "react";
import Logo from "./Logo";

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-primary/10 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Logo size="sm" />
            <span className="text-sm text-text-secondary">
              © {new Date().getFullYear()} Careerate - Accelerate Your Career
            </span>
          </div>
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-sm text-text-secondary hover:text-primary transition duration-200"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-sm text-text-secondary hover:text-primary transition duration-200"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-sm text-text-secondary hover:text-primary transition duration-200"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
