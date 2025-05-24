import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as turf from '@turf/turf';
import html2canvas from 'html2canvas';
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
  width = 0,
  height = 0,
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
  // State declarations at the top
  const [isClient, setIsClient] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [effectiveWidth, setEffectiveWidth] = useState(width);
  const [effectiveHeight, setEffectiveHeight] = useState(height);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [currentCalibrationPoint, setCurrentCalibrationPoint] = useState<number>(0);
  const [gazePosition, setGazePosition] = useState<{ x: number; y: number } | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isWebGazerReady, setIsWebGazerReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gazeHistory, setGazeHistory] = useState<Array<{ x: number; y: number; timestamp: number }>>([]);
  const [capturedScreenshots, setCapturedScreenshots] = useState<Array<{url: string, timestamp: number}>>([]);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [viewportPosition, setViewportPosition] = useState({ top: 0, height: 0 });

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const calibrationTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializingRef = useRef<boolean>(false);
  const scrollDebounceRef = useRef<NodeJS.Timeout>();
  const screenshotCooldown = useRef<boolean>(false);
  const gazeHistoryRef = useRef(gazeHistory);
  gazeHistoryRef.current = gazeHistory;
  
  // Set up client-side state and dimensions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsClient(true);
      const updateDimensions = () => {
        const newDims = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        setDimensions(newDims);
        setEffectiveWidth(newDims.width || width);
        setEffectiveHeight(newDims.height || height);
      };
      
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      
      return () => {
        window.removeEventListener('resize', updateDimensions);
      };
    }
  }, [width, height]);

  // Initialize WebGazer
  useEffect(() => {
    if (typeof window === 'undefined' || isInitializingRef.current) return;
    
    // Add scroll listener for viewport tracking
    const handleScroll = () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }

      scrollDebounceRef.current = setTimeout(() => {
        setViewportPosition({
          top: window?.pageYOffset || 0,
          height: window?.innerHeight || 0
        });
      }, 50);
    };

    if (window) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
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
      if (window) {
        window.removeEventListener('scroll', handleScroll);
      }
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
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
      if (typeof window === 'undefined') return;
      
      // Initialize viewport position
      setViewportPosition({
        top: window.pageYOffset || 0,
        height: window.innerHeight || 0
      });

      // Configure WebGazer settings
      window.webgazer
        .setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener((data: { x: number; y: number } | null) => {
          if (data && data.x && data.y && window) {
            const yPos = data.y + (window.pageYOffset || 0); // Store absolute Y position
            setGazePosition({ x: data.x, y: yPos });
            if (onGazeUpdate) {
              onGazeUpdate(data.x, yPos);
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

  // Simple grid-based clustering
  const findClusters = useCallback((points: Array<{x: number, y: number}>, gridSize = 100, minPoints = 5) => {
    type ClusterPoint = [number, number];
    type Cluster = {
      points: ClusterPoint[];
      center: { x: number; y: number };
      size: number;
    };
    
    if (points.length < minPoints) return [];
    
    try {
      // Create a grid to group nearby points
      const grid: Record<string, ClusterPoint[]> = {};
      
      // Helper to get grid cell key
      const getGridKey = (x: number, y: number): string => {
        const gridX = Math.floor(x / gridSize);
        const gridY = Math.floor(y / gridSize);
        return `${gridX},${gridY}`;
      };
      
      // Group points into grid cells
      points.forEach(point => {
        const key = getGridKey(point.x, point.y);
        if (!grid[key]) {
          grid[key] = [];
        }
        grid[key].push([point.x, point.y]);
      });
      
      // Convert grid cells to clusters
      const clusters: Cluster[] = [];
      
      Object.values(grid).forEach(cellPoints => {
        if (cellPoints.length < minPoints) return;
        
        // Calculate center of mass for the cell
        const xSum = cellPoints.reduce((sum, [x]) => sum + x, 0);
        const ySum = cellPoints.reduce((sum, [, y]) => sum + y, 0);
        const centerX = Math.round(xSum / cellPoints.length);
        const centerY = Math.round(ySum / cellPoints.length);
        
        clusters.push({
          points: cellPoints,
          center: { x: centerX, y: centerY },
          size: cellPoints.length
        });
      });
      
      // Sort by size, largest first
      return clusters.sort((a, b) => b.size - a.size);
      
    } catch (error) {
      console.error('Error in grid clustering:', error);
      return [];
    }
  }, []);

  // Take a screenshot of an area around a point
  const captureAreaScreenshot = useCallback(async (x: number, y: number, width = 300, height = 300) => {
    if (screenshotCooldown.current || typeof document === 'undefined') return null;
    
    let cooldownTimer: NodeJS.Timeout | null = null;
    try {
      screenshotCooldown.current = true;
      
      // Set up cooldown with cleanup
      cooldownTimer = setTimeout(() => {
        screenshotCooldown.current = false;
      }, 5000); // 5 second cooldown
      
      const element = document.documentElement;
      // Calculate the area to capture (centered on the point)
      const left = Math.max(0, x - width / 2);
      const top = Math.max(0, y - height / 2);
      
      const canvas = await html2canvas(element, {
        x: left,
        y: top,
        width,
        height,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        useCORS: true,
        scale: 1,
      });
      
      const screenshotUrl = canvas.toDataURL('image/png');
      const screenshot = {
        url: screenshotUrl,
        timestamp: Date.now()
      };
      
      setCapturedScreenshots(prev => [screenshot, ...prev].slice(0, 10)); // Keep last 10 screenshots
      return screenshotUrl;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    } finally {
      if (cooldownTimer) {
        clearTimeout(cooldownTimer);
      }
    }
  }, []);

  // Analyze gaze patterns and capture screenshots of areas of interest
  const analyzeGazePatterns = useCallback(async () => {
    const minPoints = 5; // Minimum points to form a cluster
    const gridSize = 150; // Size of grid cells in pixels
    
    if (gazeHistoryRef.current.length < minPoints) { 
      console.log(`Not enough gaze history to analyze (need at least ${minPoints} points)`);
      return;
    }
    
    console.log(`Analyzing ${gazeHistoryRef.current.length} gaze points...`);
    
    const clusters = findClusters(
      gazeHistoryRef.current.map(({x, y}) => ({x, y})),
      gridSize,
      minPoints
    );
    
    console.log(`Found ${clusters.length} clusters`);
    
    if (clusters.length === 0) {
      console.log("No significant clusters found");
      return;
    }
    
    // Sort by size and take the largest cluster
    clusters.sort((a, b) => b.size - a.size);
    const largestCluster = clusters[0];
    const { center, size } = largestCluster;
    
    console.log(`Largest cluster: center=(${center.x},${center.y}), size=${size}`);
    
    // Capture a screenshot of the area around the cluster center
    await captureAreaScreenshot(center.x, center.y);
  }, [findClusters, captureAreaScreenshot]);


  
  // Update gaze history when new points are added
  useEffect(() => {
    if (!gazePosition) return;
    
    setGazeHistory(prev => {
      const newHistory = [...prev, {
        x: gazePosition.x,
        y: gazePosition.y,
        timestamp: Date.now()
      }].slice(-1000); // Keep last 1000 points
      
      return newHistory;
    });
  }, [gazePosition]);
  
  // Analyze gaze patterns when history changes
  useEffect(() => {
    console.log("Trying to check gaze pattern effects")
    if (gazeHistory.length > 0 && gazeHistory.length % 30 === 0) {
      console.log("Analyzing gaze patterns to take screenshot later")
      analyzeGazePatterns();
    }
  }, [gazeHistory.length, analyzeGazePatterns]);

  // Filter gaze points to only those in the current viewport
  const getVisibleGazePoints = useCallback(() => {
    if (!showHeatmap) return [];

    const viewportTop = viewportPosition.top;
    const viewportBottom = viewportTop + viewportPosition.height;

    return gazeHistory.filter(point => {
      // Check if point is within viewport with some padding
      const padding = 100; // pixels of padding above/below viewport
      return point.y >= viewportTop - padding && point.y <= viewportBottom + padding;
    });
  }, [gazeHistory, showHeatmap, viewportPosition]);

  // Draw single gaze dot using D3 (fixed trailing dots issue)
  useEffect(() => {
    if (typeof window === 'undefined' || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('.gaze-dot').remove();
    svg.selectAll('.heatmap-dot').remove();

    // Get current scroll position
    const scrollY = window?.scrollY || window?.pageYOffset || 0;
    const viewportHeight = window?.innerHeight || 0;

    // Draw heatmap if enabled
    if (showHeatmap) {
      const visiblePoints = getVisibleGazePoints();
      
      // If no points, don't try to render heatmap
      if (visiblePoints.length === 0) return;
      
      // Create a simple heatmap using circles with opacity based on density
      const heatmapGroup = svg.append('g')
        .attr('class', 'heatmap-layer');
      
      // For each point, draw a semi-transparent circle
      visiblePoints.forEach(point => {
        const y = point.y - scrollY; // Adjust for current scroll position
        if (y >= 0 && y <= viewportHeight) {
          heatmapGroup.append('circle')
            .attr('class', 'heatmap-dot')
            .attr('cx', point.x)
            .attr('cy', y)
            .attr('r', 30)
            .attr('fill', 'rgba(255, 0, 0, 0.1)')
            .style('pointer-events', 'none');
        }
      });
    }

    // Draw gaze dot if enabled (relative to viewport)
    if (showGazeDot && gazePosition) {
      const dotY = gazePosition.y - scrollY; // Adjust for current scroll position
      if (dotY >= 0 && dotY <= viewportHeight) {
        svg.append('circle')
          .attr('class', 'gaze-dot')
          .attr('cx', gazePosition.x)
          .attr('cy', dotY)
          .attr('r', dotSize / 2)
          .attr('fill', dotColor)
          .style('pointer-events', 'none');
      }
    }
  }, [gazePosition, showGazeDot, dotSize, dotColor, showHeatmap, getVisibleGazePoints, viewportPosition]);

  // Helper functions for heatmap
  function kernelEpanechnikov(bandwidth: number) {
    return function(x: number, i: number) {
      return Math.abs((x - i) / bandwidth) <= 1 ? 0.75 * (1 - Math.pow((x - i) / bandwidth, 2)) / bandwidth : 0;
    };
  }

  function kernelDensityEstimator(kernel: (v: number, i: number) => number, x: number[]) {
    return function(sample: number[][]) {
      return x.map(function(x) {
        return [x, d3.mean(sample, function(v) { return kernel(x, v[0]); }) || 0];
      });
    };
  }

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

  if (!isClient) {
    return null;
  }

  // Render the screenshots panel
  const renderScreenshotsPanel = () => {
    if (capturedScreenshots.length === 0 || !isClient) return null;
    
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        maxHeight: '300px',
        overflowY: 'auto',
        maxWidth: '300px'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Areas of Interest</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {capturedScreenshots.map((screenshot, index) => (
            <div key={`${screenshot.timestamp}-${index}`} style={{ position: 'relative' }}>
              <img 
                src={screenshot.url} 
                alt={`Gaze cluster ${index + 1}`}
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }} 
                loading="lazy"
              />
              <div style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {renderScreenshotsPanel()}
      {/* Gaze visualization overlay */}
      {isTracking && showGazeDot && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 999,
          overflow: 'visible'
        }}>
          <svg
            ref={svgRef}
            width={effectiveWidth}
            height={effectiveHeight}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 999,
            }}
          />
        </div>
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