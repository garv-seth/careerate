import React from "react";
import { Link } from "wouter";
import Logo from "./Logo";

const Header: React.FC = () => {
  return (
    <header className="bg-background border-b border-primary/20 shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
        <Link href="/">
          <a className="flex items-center mb-4 md:mb-0">
            <Logo />
            <h1 className="text-2xl font-heading font-bold text-white">
              <span className="text-primary-light glow-text">Carrer</span>
              <span className="text-primary">ate</span>
            </h1>
          </a>
        </Link>
        <nav>
          <ul className="flex space-x-6">
            <li>
              <Link href="/">
                <a className="text-text-secondary hover:text-primary transition duration-200">
                  Home
                </a>
              </Link>
            </li>
            <li>
              <Link href="/dashboard">
                <a className="text-text-secondary hover:text-primary transition duration-200">
                  Dashboard
                </a>
              </Link>
            </li>
            <li>
              <a href="#" className="text-text-secondary hover:text-primary transition duration-200">
                Resources
              </a>
            </li>
            <li>
              <a href="#" className="text-text-secondary hover:text-primary transition duration-200">
                Help
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
