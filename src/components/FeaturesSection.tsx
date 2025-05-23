import React from 'react';
import { BookOpen, Search, Zap, Link2, BookMarked, Sparkles, RefreshCw, Brain } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay }) => (
  <div 
    className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 group hover:border-blue-200"
    data-aos="fade-up" 
    data-aos-delay={delay}
  >
    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Search size={24} />,
      title: 'Contextual Search',
      description: 'Instantly search related papers, data, and concepts directly from your current reading.',
      delay: 0
    },
    {
      icon: <Link2 size={24} />,
      title: 'Connection Discovery',
      description: 'Identify hidden connections between concepts and papers you might otherwise miss.',
      delay: 100
    },
    {
      icon: <BookMarked size={24} />,
      title: 'Smart Annotations',
      description: 'Add notes that sync across all instances of the same concept throughout your research.',
      delay: 200
    },
    {
      icon: <Zap size={24} />,
      title: 'Citation Assistant',
      description: 'Generate and manage citations in your preferred format with one click.',
      delay: 0
    },
    {
      icon: <Brain size={24} />,
      title: 'Research Summary',
      description: 'Get AI-powered summaries of complex papers tailored to your knowledge level.',
      delay: 100
    },
    {
      icon: <RefreshCw size={24} />,
      title: 'Knowledge Updates',
      description: 'Receive alerts when new research relevant to your interests is published.',
      delay: 200
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Features Designed for Researchers
          </h2>
          <p className="text-xl text-gray-600">
            Tools that transform how you discover, connect, and utilize research knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={feature.delay}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;