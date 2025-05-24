import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

declare global {
  interface Window {
    webgazer: any;
  }
}

interface EyeTrackerProps {
  onGazeUpdate?: (x: number, y: number) => void;
  onCalibrationComplete?: () => void;
  width?: number;
  height?: number;
  calibrationPoints?: Array<{ x: number; y: number }>;
  showGazeDot?: boolean;
  dotSize?: number;
  dotColor?: string;
}

const EyeTracker: React.FC<EyeTrackerProps> = ({
  onGazeUpdate,
  onCalibrationComplete,
  width = window.innerWidth,
  height = window.innerHeight,
  calibrationPoints = [
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.1 },
    { x: 0.5, y: 0.5 },
    { x: 0.1, y: 0.9 },
    { x: 0.9, y: 0.9 },
    { x: 0.3, y: 0.3 },
    { x: 0.7, y: 0.3 },
    { x: 0.3, y: 0.7 },
    { x: 0.7, y: 0.7 },
  ],
  showGazeDot = true,
  dotSize = 8,
  dotColor = 'rgba(255, 0, 0, 0.7)',
}) => {
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [currentCalibrationPoint, setCurrentCalibrationPoint] = useState<number>(0);
  const [gazePosition, setGazePosition] = useState<{ x: number; y: number } | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isWebGazerReady, setIsWebGazerReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gazeHistory, setGazeHistory] = useState<Array<{ x: number; y: number }>>([]);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const calibrationTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializingRef = useRef<boolean>(false);

  // Initialize WebGazer
  useEffect(() => {
    if (typeof window === 'undefined' || isInitializingRef.current) return;
    
    isInitializingRef.current = true;
    
    const initWebGazer = async () => {
      try {
        // Check if script already exists
        let script = document.querySelector('script[src*="webgazer"]') as HTMLScriptElement;
        
        if (!script) {
          script = document.createElement('script');
          script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
          script.async = true;
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        // Wait a bit for WebGazer to be fully available
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!window.webgazer) {
          throw new Error('WebGazer not available after loading');
        }

        await initializeWebGazer();
      } catch (error) {
        console.error('Failed to initialize WebGazer:', error);
        setError('Failed to initialize eye tracking. Please check camera permissions.');
      } finally {
        isInitializingRef.current = false;
      }
    };

    initWebGazer();

    return () => {
      if (calibrationTimeoutRef.current) {
        clearTimeout(calibrationTimeoutRef.current);
      }
      
      if (window.webgazer && isWebGazerReady) {
        try {
          window.webgazer.end();
        } catch (error) {
          console.warn('Error during WebGazer cleanup:', error);
        }
      }
    };
  }, []);

  const initializeWebGazer = async () => {
    try {
      // Configure WebGazer settings
      window.webgazer
        .setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener((data: { x: number; y: number } | null) => {
          if (data && data.x && data.y) {
            setGazePosition({ x: data.x, y: data.y });
            setGazeHistory(prev => [...prev, { x: data.x, y: data.y }]);
            if (onGazeUpdate) {
              onGazeUpdate(data.x, data.y);
            }
          }
        });

      // Begin WebGazer
      await window.webgazer.begin();
      
      // Configure additional settings after begin()
      if (window.webgazer.showPredictionPoints) {
        window.webgazer.showPredictionPoints(false);
      }
      
      // Enable mouse events for calibration
      window.webgazer.addMouseEventListeners();
      
      setIsWebGazerReady(true);
      setIsTracking(true);
      setError(null);
      
      console.log('WebGazer initialized successfully');
      
    } catch (error) {
      console.error('WebGazer initialization error:', error);
      setError('Failed to start camera. Please allow camera access and try again.');
    }
  };

  const startCalibration = useCallback(() => {
    if (!isWebGazerReady || isCalibrating) return;
    
    setIsCalibrating(true);
    setCurrentCalibrationPoint(0);
    showCalibrationPoint(0);
  }, [isWebGazerReady, isCalibrating]);

  const showCalibrationPoint = (index: number) => {
    if (index >= calibrationPoints.length) {
      // Calibration complete
      setIsCalibrating(false);
      setCurrentCalibrationPoint(0);
      
      // Remove mouse event listeners after calibration
      if (window.webgazer && window.webgazer.removeMouseEventListeners) {
        window.webgazer.removeMouseEventListeners();
      }
      
      if (onCalibrationComplete) {
        onCalibrationComplete();
      }
      
      alert('Calibration Complete! Eye tracking is now active.');
      return;
    }

    const point = calibrationPoints[index];
    const x = point.x * width;
    const y = point.y * height;

    // Create calibration point element
    const calibrationDot = document.createElement('div');
    calibrationDot.style.cssText = `
      position: fixed;
      left: ${x - 25}px;
      top: ${y - 25}px;
      width: 50px;
      height: 50px;
      background: radial-gradient(circle, #ff0000 30%, #ff6666 70%);
      border-radius: 50%;
      cursor: pointer;
      z-index: 10000;
      border: 3px solid white;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      animation: pulse 1s infinite alternate;
    `;

    // Add pulsing animation
    if (!document.querySelector('#calibration-styles')) {
      const style = document.createElement('style');
      style.id = 'calibration-styles';
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    // Add click handler for manual calibration
    const handleClick = () => {
      // This click will be automatically captured by WebGazer for calibration
      document.body.removeChild(calibrationDot);
      setCurrentCalibrationPoint(index + 1);
      
      // Small delay before showing next point
      setTimeout(() => {
        showCalibrationPoint(index + 1);
      }, 500);
    };

    calibrationDot.addEventListener('click', handleClick);
    document.body.appendChild(calibrationDot);

    // Auto-advance after 3 seconds if not clicked
    calibrationTimeoutRef.current = setTimeout(() => {
      if (document.body.contains(calibrationDot)) {
        document.body.removeChild(calibrationDot);
        setCurrentCalibrationPoint(index + 1);
        showCalibrationPoint(index + 1);
      }
    }, 3000);
  };

  // Draw single gaze dot using D3 (fixed trailing dots issue)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('.gaze-dot').remove();
    svg.selectAll('.heatmap-dot').remove();

    // Draw heatmap if enabled
    if (showHeatmap && gazeHistory.length > 0) {
      gazeHistory.forEach(({ x, y }) => {
        svg.append('circle')
          .attr('class', 'heatmap-dot')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 30)
          .attr('fill', 'rgba(255,0,0,0.08)');
      });
    }

    // Draw gaze dot if enabled
    if (showGazeDot && gazePosition) {
      svg.append('circle')
        .attr('class', 'gaze-dot')
        .attr('cx', gazePosition.x)
        .attr('cy', gazePosition.y)
        .attr('r', dotSize / 2)
        .attr('fill', dotColor)
        .style('pointer-events', 'none');
    }
  }, [gazePosition, showGazeDot, dotSize, dotColor, showHeatmap, gazeHistory]);

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '20px',
        backgroundColor: '#ffebee',
        border: '1px solid #f44336',
        borderRadius: '8px',
        color: '#c62828',
        textAlign: 'center',
        zIndex: 10000
      }}>
        <h3>Eye Tracking Error</h3>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Gaze visualization overlay */}
      {isTracking && showGazeDot && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 999,
          }}
        />
      )}
      
      {/* Control panel */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1001,
        padding: '15px 25px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '25px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Status: {!isWebGazerReady ? 'Loading...' : isCalibrating ? 'Calibrating...' : 'Ready'}
        </div>
        
        <button 
          onClick={startCalibration} 
          disabled={!isWebGazerReady || isCalibrating}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: (!isWebGazerReady || isCalibrating) ? 'not-allowed' : 'pointer',
            backgroundColor: (!isWebGazerReady || isCalibrating) ? '#cccccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            transition: 'all 0.3s ease',
            boxShadow: (!isWebGazerReady || isCalibrating) ? 'none' : '0 2px 8px rgba(76, 175, 80, 0.3)'
          }}
        >
          {isCalibrating
            ? `Calibrating (${currentCalibrationPoint + 1}/${calibrationPoints.length})`
            : 'Start Calibration'}
        </button>

        <button
          onClick={() => setShowHeatmap(hm => !hm)}
          style={{
            padding: '10px 18px',
            fontSize: '15px',
            fontWeight: '500',
            backgroundColor: showHeatmap ? '#f44336' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
        </button>

        <button
          onClick={() => setGazeHistory([])}
          style={{
            padding: '10px 18px',
            fontSize: '15px',
            fontWeight: '500',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          disabled={gazeHistory.length === 0}
        >
          Clear Heatmap
        </button>

        {gazePosition && (
          <div style={{ fontSize: '12px', color: '#888' }}>
            Gaze: ({Math.round(gazePosition.x)}, {Math.round(gazePosition.y)})
          </div>
        )}
      </div>

      {/* Instructions overlay during calibration */}
      {isCalibrating && (
        <div style={{
          position: 'fixed',
          top: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '20px 30px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          borderRadius: '15px',
          textAlign: 'center',
          zIndex: 9999,
          fontSize: '18px',
          fontWeight: '500'
        }}>
          <div>Look at the red dot and click it</div>
          <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>
            Point {currentCalibrationPoint + 1} of {calibrationPoints.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default EyeTracker;