'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import DOMHighlighter with SSR disabled
const DOMHighlighter = dynamic(
  () => import('./DOMHighlighter'),
  { ssr: false }
);

interface PaperViewerProps {
  paperContent?: string;
  paperPath?: string;
}

const PaperViewer: React.FC<PaperViewerProps> = ({ paperContent, paperPath }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Toggle inspect mode
  const toggleInspectMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsInspecting(prev => !prev);
    if (!isInspecting) {
      setHoveredElement(null);
      setSelectedElement(null);
    }
  };

  // Handle element hover
  const handleElementHover = (element: HTMLElement | null) => {
    setHoveredElement(element);
  };

  // Handle element click
  const handleElementClick = (element: HTMLElement | null) => {
    if (element) {
      setSelectedElement(element);
      console.log('Selected element:', element);
      console.log('Element info:', {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        textContent: element.textContent?.trim(),
        attributes: Array.from(element.attributes).map(attr => ({
          name: attr.name,
          value: attr.value
        }))
      });
    }
  };

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
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Get the head and body content
        const headContent = doc.head.innerHTML;
        const bodyContent = doc.body.innerHTML;
        
        // Combine head and body content while preserving styles
        const fullContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              ${headContent}
              <style>
                body { 
                  margin: 0;
                  padding: 20px;
                  background-color: white;
                }
                .page {
                  max-width: 100%;
                  margin: 0 auto;
                }
              </style>
            </head>
            <body>
              ${bodyContent}
            </body>
          </html>
        `;
        
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }


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
    <div className="w-full relative">
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
        
        {hoveredElement && (
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
        className="w-full"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      
      {/* Debug info panel (optional) */}
      {selectedElement && (
        <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-4 z-40 max-h-64 overflow-y-auto">
          <h3 className="text-lg font-bold mb-2">Element Info</h3>
          <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
            {JSON.stringify({
              tag: selectedElement.tagName,
              id: selectedElement.id,
              classes: selectedElement.className,
              text: selectedElement.textContent?.trim(),
              attributes: Array.from(selectedElement.attributes).reduce<Record<string, string>>((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {})
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
  
};

export default PaperViewer;
