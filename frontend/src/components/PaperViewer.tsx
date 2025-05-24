'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import DOMHighlighter with SSR disabled
const DOMHighlighter = dynamic(
  () => import('./DOMHighlighter'),
  { ssr: false }
);

// Text extraction utilities
const extractPreciseTextContent = (element: HTMLElement): string => {
  // For input elements, return their value
  if (
    element instanceof HTMLInputElement && 
    (element.type === 'text' || element.type === 'search' || element.type === 'email')
  ) {
    return element.value.trim();
  }
  
  if (element instanceof HTMLTextAreaElement) {
    return element.value.trim();
  }
  
  // For other elements, extract ONLY direct text nodes (not child element text)
  let textContent = '';
  
  // Loop through child nodes to find text nodes
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      textContent += node.textContent;
    }
  }
  
  // If no direct text content and element has no children, fall back to textContent
  if (!textContent.trim() && element.children.length === 0) {
    textContent = element.textContent || '';
  }
  
  return textContent.trim();
};

// Get element metadata for display
const getElementMetadata = (element: HTMLElement): Record<string, any> => {
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: element.className || undefined,
    textContent: extractPreciseTextContent(element),
    attributes: Array.from(element.attributes).reduce<Record<string, string>>((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {})
  };
};

// Parse HTML content
const parseHtmlContent = (htmlContent: string): { headContent: string, bodyContent: string } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  return {
    headContent: doc.head.innerHTML,
    bodyContent: doc.body.innerHTML
  };
};

// Create sanitized HTML document
const createSanitizedHtml = (headContent: string, bodyContent: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${headContent}
        <style>
          html, body { 
            margin: 0;
            padding: 0;
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
            box-sizing: border-box;
            background-color: white;
          }
          body {
            padding: 20px;
          }
          .page {
            max-width: 100%;
            margin: 0 auto;
            box-sizing: border-box;
          }
          * {
            max-width: 100%;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;
};

interface PaperViewerProps {
  paperContent?: string;
  paperPath?: string;
  textHistoryDuration?: number; // ms
  maxHistoryItems?: number;
  hoverDelay?: number; // ms
}

interface HoveredTextInfo {
  text: string;
  element: HTMLElement;
  timestamp: number;
  metadata?: Record<string, any>;
}

const PaperViewer: React.FC<PaperViewerProps> = ({ 
  paperContent, 
  paperPath,
  textHistoryDuration = 5000,
  maxHistoryItems = 5,
  hoverDelay = 300
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [hoveredTextHistory, setHoveredTextHistory] = useState<HoveredTextInfo[]>([]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const router = useRouter();

  // Clean up expired items from history
  const cleanupHistory = useCallback(() => {
    const now = Date.now();
    setHoveredTextHistory(prevItems => 
      prevItems
        .filter(item => now - item.timestamp < textHistoryDuration)
        .slice(-maxHistoryItems)
    );
  }, [textHistoryDuration, maxHistoryItems]);

  // Toggle inspect mode
  const toggleInspectMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsInspecting(prev => !prev);
    if (!isInspecting) {
      setHoveredElement(null);
      setSelectedElement(null);
      setShowTextModal(false);
    }
  };

  // Handle element hover for inspection
  const handleElementHover = (element: HTMLElement | null) => {
    setHoveredElement(element);
  };

  // Handle element click for inspection
  const handleElementClick = (element: HTMLElement | null) => {
    if (element) {
      setSelectedElement(element);
      console.log('Selected element:', element);
      console.log('Element info:', getElementMetadata(element));
    }
  };

  // Handle mouse movement for text extraction
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = window.setTimeout(() => {
      // Get element at current position
      const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      
      if (element) {
        // Skip certain elements
        const skipTags = ['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'HTML', 'BODY'];
        if (skipTags.includes(element.tagName)) {
          return;
        }
        
        // Extract precise text content
        const text = extractPreciseTextContent(element);
        
        if (text) {
          // Add to history
          const newItem: HoveredTextInfo = {
            text,
            element,
            timestamp: Date.now(),
            metadata: {
              tagName: element.tagName.toLowerCase(),
              id: element.id || undefined,
              className: element.className || undefined
            }
          };
          
          setHoveredTextHistory(prevItems => {
            // Check if this text is already the most recent in our history
            if (prevItems.length > 0 && prevItems[prevItems.length - 1].text === text) {
              // Update timestamp of existing item instead of adding duplicate
              const updatedItems = [...prevItems];
              updatedItems[updatedItems.length - 1] = {
                ...updatedItems[updatedItems.length - 1],
                timestamp: Date.now()
              };
              return updatedItems;
            }
            
            // Add new item and limit to maxHistoryItems
            return [...prevItems, newItem].slice(-maxHistoryItems);
          });
          
          // Update modal position
          setModalPosition({ 
            x: e.clientX + 15, // Offset to not cover the cursor
            y: e.clientY + 15
          });
          
          // Show modal
          setShowTextModal(true);
        }
      }
    }, hoverDelay);
  }, [hoverDelay, maxHistoryItems]);

  // Set up and clean up event listeners
  useEffect(() => {
    // Add mouse move listener for text extraction
    document.addEventListener('mousemove', handleMouseMove);
    
    // Set up interval to clean up expired items
    const cleanupInterval = setInterval(cleanupHistory, 1000);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hoverTimeoutRef.current !== null) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
      clearInterval(cleanupInterval);
    };
  }, [cleanupHistory, handleMouseMove]);

  // Fetch and process paper content
  useEffect(() => {
    const fetchPaperContent = async () => {
      try {
        let htmlContent = '';
        
        if (paperContent) {
          htmlContent = paperContent;
        } else if (paperPath) {
          const response = await fetch(paperPath);
          if (!response.ok) {
            throw new Error(`Failed to fetch paper: ${response.statusText}`);
          }
          htmlContent = await response.text();
        } else {
          throw new Error('No paper content or path provided');
        }

        // Parse the HTML content
        const { headContent, bodyContent } = parseHtmlContent(htmlContent);
        
        // Create sanitized HTML
        const fullContent = createSanitizedHtml(headContent, bodyContent);
        
        // Set the full HTML content
        setContent(fullContent);
      } catch (err) {
        console.error('Error loading paper:', err);
        setError(err instanceof Error ? err.message : 'Failed to load paper');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaperContent();
  }, [paperContent, paperPath]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 max-w-md mx-auto bg-red-50 rounded-lg shadow">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Paper</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative max-w-full overflow-hidden">
      {/* Inspector controls */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <button
          onClick={toggleInspectMode}
          className={`px-4 py-2 rounded-md font-medium ${
            isInspecting 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } transition-colors`}
        >
          {isInspecting ? 'Exit Inspect Mode' : 'Inspect Elements'}
        </button>
        
        {hoveredElement && isInspecting && (
          <div className="bg-gray-800 text-white text-sm p-2 rounded-md shadow-lg max-w-xs">
            <div className="font-mono">
              <div>Tag: &lt;{hoveredElement.tagName.toLowerCase()}&gt;</div>
              {hoveredElement.id && <div>ID: {hoveredElement.id}</div>}
              {hoveredElement.className && (
                <div>Class: {hoveredElement.className}</div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Text extraction modal */}
      {showTextModal && hoveredTextHistory.length > 0 && (
        <div 
          className="fixed z-50 p-3 bg-white border rounded shadow-lg"
          style={{
            left: `${modalPosition.x}px`,
            top: `${modalPosition.y}px`,
            maxWidth: '300px',
            fontSize: '14px',
            lineHeight: '1.4',
            wordBreak: 'break-word'
          }}
        >
          <div className="text-sm font-medium mb-2">Text Content:</div>
          <div className="space-y-2">
            {hoveredTextHistory.slice().reverse().map((item, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                <div className="font-medium text-gray-700">
                  {new Date(item.timestamp).toLocaleTimeString()} 
                  {index === 0 && <span className="ml-1 text-green-600">(Current)</span>}
                </div>
                <div className="mt-1">{item.text}</div>
                {item.metadata && (
                  <div className="mt-1 text-gray-500 text-xs">
                    &lt;{item.metadata.tagName}&gt;
                    {item.metadata.id && ` #${item.metadata.id}`}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            History: {textHistoryDuration/1000}s | Max items: {maxHistoryItems}
          </div>
        </div>
      )}
      
      {/* DOM Highlighter */}
      {isInspecting && (
        <DOMHighlighter
          enabled={isInspecting}
          onElementHover={handleElementHover}
          onClick={handleElementClick}
          highlightColor="rgba(147, 197, 253, 0.3)"
          borderColor="rgba(59, 130, 246, 0.8)"
          excludedSelectors={['script', 'style', 'head', 'meta', 'link']}
        />
      )}
      
      {/* Paper content */}
      <div 
        ref={contentRef}
        className="w-full max-w-full overflow-x-auto box-border"
        style={{ width: '100%', maxWidth: '100%' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      
      {/* Debug info panel (optional) */}
      {selectedElement && (
        <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-4 z-40 max-h-64 overflow-y-auto">
          <h3 className="text-lg font-bold mb-2">Element Info</h3>
          <pre className="text-xs bg-gray-800 p-2 rounded">
            {JSON.stringify(getElementMetadata(selectedElement), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PaperViewer;
