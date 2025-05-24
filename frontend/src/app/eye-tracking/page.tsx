'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import the EyeTracker component with no SSR
const EyeTracker = dynamic(
  () => import('@/components/EyeTracker'),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
        <span>Loading eye tracker...</span>
      </div>
    )
  }
);

export default function EyeTrackingPage() {
  const [isWebGazerLoaded, setIsWebGazerLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load webgazer script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.webgazer) {
      setIsWebGazerLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
    script.async = true;
    
    script.onload = () => {
      if (!window.webgazer) {
        setError('Failed to load WebGazer. Please try refreshing the page.');
        return;
      }
      
      // Initialize webgazer
      try {
        window.webgazer.setGazeListener(function() {
          // This is just to initialize the gaze listener
        }).begin();
        
        // Pause immediately - we'll start tracking when the user clicks the button
        window.webgazer.pause();
        setIsWebGazerLoaded(true);
      } catch (err) {
        console.error('Error initializing WebGazer:', err);
        setError('Failed to initialize eye tracking. Please ensure you have given camera permissions.');
      }
    };

    script.onerror = () => {
      setError('Failed to load WebGazer script. Please check your internet connection.');
    };

    document.body.appendChild(script);

    return () => {
      // Clean up
      if (window.webgazer) {
        try {
          window.webgazer.end();
        } catch (err) {
          console.error('Error cleaning up WebGazer:', err);
        }
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Show error message if there was an error loading WebGazer
  if (error) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Error Loading Eye Tracker</h1>
          <p className="text-lg text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </main>
    );
  }

  // Show loading state while WebGazer is initializing
  if (!isWebGazerLoaded) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading Eye Tracker</h1>
          <p className="text-gray-600">Please wait while we set up the eye tracking system...</p>
          <p className="text-sm text-gray-500 mt-4">
            If prompted, please allow camera access to continue.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Eye Tracking Demo</h1>
          <p className="text-base md:text-lg text-gray-600">
            Test the eye tracking functionality by following the instructions below
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-800">How to Use:</h2>
          <ol className="list-decimal pl-5 md:pl-6 space-y-2 text-gray-700 text-sm md:text-base">
            <li>Click "Start Tracking" to begin eye tracking (requires camera access)</li>
            <li>Look at different points on the video feed and click to add calibration points (5+ points recommended)</li>
            <li>The red dot will show where you're looking on the screen</li>
            <li>Use the buttons to show/hide the video feed and gaze dot as needed</li>
            <li>Click "Reset Calibration" to start the calibration process over</li>
          </ol>
          <div className="mt-4 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm md:text-base">
            <p className="text-blue-800 font-medium">💡 Tip:</p>
            <p className="text-blue-700 mt-1">
              For best results, ensure good lighting and position your face clearly in the camera view.
              The more calibration points you add, the more accurate the tracking will be.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <EyeTracker />
        </div>
      </div>
    </main>
  );
}
