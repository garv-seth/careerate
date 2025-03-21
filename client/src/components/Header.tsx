import React from "react";
import { Link, useLocation } from "wouter";
import Logo from "./Logo";

const Header: React.FC = () => {
  const [location] = useLocation();
  
  return (
    <header className="bg-background border-b border-primary/20 shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/">
                <span className={`px-3 py-2 inline-block rounded-md ${location === '/' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-primary'} transition duration-200 cursor-pointer`}>
                  Home
                </span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/1">
                <span className={`px-3 py-2 inline-block rounded-md ${location.startsWith('/dashboard') ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-primary'} transition duration-200 cursor-pointer`}>
                  Dashboard
                </span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
