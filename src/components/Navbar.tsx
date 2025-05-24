'use client'
import React, { useState, useEffect } from 'react';
import { Menu, X, BookOpen } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed w-screen z-50 top-4 left-0 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md py-4' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">ResearchLens</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-700 hover:text-blue-600 font-medium">Features</a>
            <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 font-medium">How It Works</a>
            <a href="#testimonials" className="text-gray-700 hover:text-blue-600 font-medium">Testimonials</a>
            <a href="#pricing" className="text-gray-700 hover:text-blue-600 font-medium">Pricing</a>
          </nav>

          <div className="hidden md:block">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition-all">
              Get Extension
            </button>
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-lg absolute top-full left-0 w-full">
          <div className="px-4 py-2 space-y-1">
            <a 
              href="#features" 
              className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded"
              onClick={() => setIsOpen(false)}
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </a>
            <a 
              href="#testimonials" 
              className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded"
              onClick={() => setIsOpen(false)}
            >
              Testimonials
            </a>
            <a 
              href="#pricing" 
              className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </a>
            <button 
              className="w-full mt-2 bg-blue-600 text-white px-4 py-2 rounded-full font-medium hover:bg-blue-700"
              onClick={() => setIsOpen(false)}
            >
              Get Extension
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;