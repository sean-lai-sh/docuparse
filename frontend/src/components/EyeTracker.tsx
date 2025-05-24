import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

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
    { x: 0.2, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 0.5, y: 0.5 },
    { x: 0.2, y: 0.8 },
    { x: 0.8, y: 0.8 },
  ],
  showGazeDot = true,
  dotSize = 10,
  dotColor = 'red',
}) => {
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [currentCalibrationPoint, setCurrentCalibrationPoint] = useState<number>(0);
  const [gazePosition, setGazePosition] = useState<{ x: number; y: number } | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const animationFrameRef = useRef<number>();

  // Initialize WebGazer
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Track if WebGazer is initialized
    let isWebGazerInitialized = false;
    const script = document.createElement('script');
    script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
    script.async = true;
    document.body.appendChild(script);

    const cleanup = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Only call end() if WebGazer was initialized
      if (window.webgazer && isWebGazerInitialized) {
        try {
          window.webgazer.end();
        } catch (error) {
          console.warn('Error while cleaning up WebGazer:', error);
        }
      }
      // Only remove script if it's still in the DOM
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };

    script.onload = () => {
      console.log('WebGazer loaded successfully');
      initializeWebGazer();
      isWebGazerInitialized = true;
    };

    script.onerror = (error) => {
      console.error('Failed to load WebGazer:', error);
      cleanup();
    };

    return cleanup;
  }, []);

  const initializeWebGazer = () => {
    window.webgazer
      .setGazeListener((data: { x: number; y: number } | null) => {
        if (data) {
          setGazePosition({ x: data.x, y: data.y });
          if (onGazeUpdate) {
            onGazeUpdate(data.x, data.y);
          }
        }
      })
      .begin()
      .showPredictionPoints(true);

    // Start tracking
    setIsTracking(true);
  };

  const startCalibration = async () => {
    setIsCalibrating(true);
    setCurrentCalibrationPoint(0);
    await showCalibrationPoint(0);
  };

  const showCalibrationPoint = async (index: number) => {
    if (index >= calibrationPoints.length) {
      // Calibration complete
      setIsCalibrating(false);
      if (onCalibrationComplete) {
        onCalibrationComplete();
      }
      await Swal.fire({
        title: 'Calibration Complete!',
        text: 'The eye tracker has been calibrated.',
        icon: 'success',
      });
      return;
    }

    const point = calibrationPoints[index];
    const x = point.x * width;
    const y = point.y * height;

    // Show the calibration point
    const result = await Swal.fire({
      title: 'Look at the dot',
      html: `Point ${index + 1} of ${calibrationPoints.length}`,
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      timer: 2000, // Show for 2 seconds
      timerProgressBar: true,
      didOpen: () => {
        Swal.showLoading();
        // Add custom styling for the calibration point
        const popup = Swal.getPopup();
        if (popup) {
          popup.style.width = '20px';
          popup.style.height = '20px';
          popup.style.borderRadius = '50%';
          popup.style.background = 'red';
          popup.style.position = 'fixed';
          popup.style.left = `${x}px`;
          popup.style.top = `${y}px`;
          popup.style.transform = 'translate(-50%, -50%)';
          popup.style.padding = '0';
          popup.style.display = 'flex';
          popup.style.justifyContent = 'center';
          popup.style.alignItems = 'center';
        }
      },
    });

    // Move to next point
    if (result.dismiss === Swal.DismissReason.timer) {
      setCurrentCalibrationPoint(index + 1);
      await showCalibrationPoint(index + 1);
    }
  };

  // Draw gaze dot using D3
  useEffect(() => {
    if (!showGazeDot || !gazePosition || !svgRef.current) return;

    // Clear any existing content
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    svg.selectAll('*').remove();
    
    // Create a single dot at the current position
    svg.append('circle')
      .attr('class', 'gaze-dot')
      .attr('cx', gazePosition.x)
      .attr('cy', gazePosition.y)
      .attr('r', dotSize / 2)
      .attr('fill', dotColor);

  }, [gazePosition, showGazeDot, dotSize, dotColor]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {isTracking && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      )}
      
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1001,
        padding: '10px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <button 
          onClick={startCalibration} 
          disabled={isCalibrating}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: isCalibrating ? 'wait' : 'pointer',
            backgroundColor: isCalibrating ? '#cccccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            transition: 'background-color 0.3s'
          }}
        >
          {isCalibrating
            ? `Calibrating (${currentCalibrationPoint + 1}/${calibrationPoints.length})`
            : 'Start Calibration'}
        </button>
      </div>
    </div>
  );
};

export default EyeTracker;