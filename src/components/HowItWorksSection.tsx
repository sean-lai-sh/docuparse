import React from 'react';
import { ArrowRight } from 'lucide-react';

const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Install the Extension',
      description: 'Add ResearchLens to your browser with a single click from the extension store.',
      image: 'https://images.pexels.com/photos/6177645/pexels-photo-6177645.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    },
    {
      number: '02',
      title: 'Browse Research Material',
      description: 'Continue with your normal research workflow across journals, papers, and academic resources.',
      image: 'https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    },
    {
      number: '03',
      title: 'Receive Contextual Insights',
      description: 'Get real-time insights, connections, and relevant information as you read.',
      image: 'https://images.pexels.com/photos/3861943/pexels-photo-3861943.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How ResearchLens Works
          </h2>
          <p className="text-xl text-gray-600">
            Seamlessly integrating with your research workflow
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Timeline connector */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-blue-200 transform -translate-y-1/2 z-0"></div>
          
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative bg-white rounded-xl overflow-hidden shadow-lg transform transition-all duration-500 hover:-translate-y-2 hover:shadow-xl z-10"
            >
              <div className="h-48 overflow-hidden">
                <img 
                  src={step.image} 
                  alt={`Step ${index + 1}`} 
                  className="w-full h-full object-cover transition-transform duration-500 transform hover:scale-110"
                />
              </div>
              <div className="p-6">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-gray-600 mb-4">{step.description}</p>
                
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="bg-white rounded-full p-2 shadow-md">
                      <ArrowRight className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transform hover:scale-105 transition-all shadow-md">
            Try It Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;