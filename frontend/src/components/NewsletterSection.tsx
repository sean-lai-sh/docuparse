'use client'
import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulating form submission
    setTimeout(() => {
      setSubmitted(true);
      setEmail('');
    }, 500);
  };

  return (
    <section className="py-20 bg-blue-600 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Stay Updated with Research Innovations
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get the latest news, updates, and research tips delivered to your inbox.
          </p>

          {submitted ? (
            <div className="bg-white bg-opacity-10 p-6 rounded-xl backdrop-blur-sm animate-fade-in">
              <CheckCircle size={48} className="text-green-300 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Thank you for subscribing!</h3>
              <p>We'll keep you updated with the latest research tools and tips.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-3 rounded-full bg-white bg-opacity-10 backdrop-blur-sm text-white placeholder-blue-200 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white text-blue-600 rounded-full font-medium hover:bg-blue-50 transition-all flex items-center justify-center"
              >
                <span>Subscribe</span>
                <Send size={16} className="ml-2" />
              </button>
            </form>
          )}
          
          <p className="text-blue-200 mt-4 text-sm">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;