import React from 'react';
import { Check } from 'lucide-react';

interface PricingTierProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
}

const PricingTier: React.FC<PricingTierProps> = ({ 
  name, 
  price, 
  description, 
  features, 
  isPopular = false,
  ctaText
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border ${isPopular ? 'border-blue-400 relative' : 'border-gray-100'}`}>
      {isPopular && (
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs uppercase font-bold py-1 px-3 tracking-wider transform translate-x-2 -translate-y-0">
          Popular
        </div>
      )}
      <div className={`p-8 ${isPopular ? 'bg-blue-50' : 'bg-white'}`}>
        <h3 className="text-xl font-bold text-gray-900 mb-1">{name}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="flex items-end mb-6">
          <span className="text-4xl font-bold text-gray-900">{price}</span>
          {price !== 'Free' && <span className="text-gray-500 ml-1">/month</span>}
        </div>
        <button 
          className={`w-full py-3 rounded-full font-medium transition-all ${
            isPopular 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
          }`}
        >
          {ctaText}
        </button>
      </div>
      <div className="px-8 pb-8 pt-2">
        <p className="text-sm text-gray-500 mb-4">Includes:</p>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check size={18} className="text-green-500 flex-shrink-0 mt-1 mr-2" />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const PricingSection: React.FC = () => {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that best fits your research needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <PricingTier 
            name="Basic" 
            price="Free"
            description="For individual researchers"
            features={[
              "Basic contextual search",
              "Up to 50 paper connections per month",
              "Citation assistance (3 formats)",
              "Browser extension access",
              "Standard support"
            ]}
            ctaText="Download Now"
          />
          
          <PricingTier 
            name="Pro" 
            price="$9.99"
            description="For serious researchers"
            features={[
              "Advanced contextual search",
              "Unlimited paper connections",
              "Citation assistance (all formats)",
              "Smart annotations syncing",
              "Research summary generation",
              "Priority support"
            ]}
            isPopular={true}
            ctaText="Start 14-Day Free Trial"
          />
          
          <PricingTier 
            name="Team" 
            price="$49.99"
            description="For research groups"
            features={[
              "Everything in Pro",
              "Team collaboration features",
              "Shared annotations and insights",
              "Group analytics dashboard",
              "API access",
              "Custom integration options",
              "Dedicated support"
            ]}
            ctaText="Contact Sales"
          />
        </div>
      </div>
    </section>
  );
};

export default PricingSection;