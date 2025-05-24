'use client'
import React, { useEffect, useRef } from 'react';
import { Search, BookOpen, Lightbulb, Sparkles } from 'lucide-react';

const HeroSection: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const scrollPosition = window.scrollY;
      const opacity = 1 - scrollPosition / 500;
      const translateY = scrollPosition * 0.3;
      
      if (opacity > 0) {
        heroRef.current.style.opacity = opacity.toString();
        heroRef.current.style.transform = `translateY(${translateY}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative min-h-screen pt-20 flex items-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div ref={heroRef} className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 transition-all duration-300">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full font-medium animate-pulse">
              Transform Your Research Experience
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Context-aware insights for researchers
            </h1>
            <p className="text-xl text-gray-600 max-w-lg">
              Get real-time contextual knowledge that helps you catch important information and make connections other tools miss.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button className="px-8 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transform hover:scale-105 transition-all shadow-md">
                Add to Browser
              </button>
              <button className="px-8 py-3 bg-white text-gray-700 rounded-full font-medium hover:bg-gray-100 transform hover:scale-105 transition-all border border-gray-300 shadow-sm">
                Learn More
              </button>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Sparkles size={16} className="text-blue-500" />
              <span>Join 10,000+ researchers enhancing their workflow</span>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="relative rounded-xl overflow-hidden shadow-2xl max-w-md border-8 border-white bg-white transform hover:scale-105 transition-all duration-500">
              <div className="w-full bg-gray-800 text-white p-2 flex items-center gap-2 text-sm">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 text-center overflow-hidden">Research Journal</div>
              </div>
              <div className="p-4 bg-white">
                <p className="text-gray-800 mb-4 font-medium">
                  The results indicate a significant correlation between neural activity in the prefrontal cortex and decision-making processes...
                </p>
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mt-2 relative">
                  <div className="absolute -top-2 -left-2 bg-blue-600 text-white p-1 rounded-full">
                    <Lightbulb size={16} />
                  </div>
                  <p className="text-blue-800 text-sm ml-4">
                    <span className="font-semibold">ResearchLens:</span> This finding connects to Smith et al. (2023) who found similar patterns in the hippocampus region.
                  </p>
                </div>
                <div className="flex items-center mt-4 text-gray-600 text-sm gap-2">
                  <BookOpen size={16} />
                  <span>3 related papers found</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
    </section>
  );
};

export default HeroSection;