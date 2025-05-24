'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AgentPanel from './AgentPanel';

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
  paperPath: string;
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
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Fetch and process paper content
  useEffect(() => {
      const fetchPaperContent = async () => {
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

      const { headContent, bodyContent } = parseHtmlContent(htmlContent);
      const fullContent = createSanitizedHtml(headContent, bodyContent);
      setContent(fullContent);
      console.log(`Paper content loaded from ${paperPath || 'inline content'}`);

      setIsLoading(false);
      
    }
      fetchPaperContent();
      // setTimeout(() => {
      // },100);
      // const root = document.getElementById('paper-root'); // or wherever you inject `fullContent`
      // if (!root) {
      //   setError('Paper root element not found');
        
      //   return;
      // }
      // if (root && paperPath) {
      //   console.log(`Assigning deterministic IDs for paper: ${paperPath}`);
      //   assignDeterministicElementIds(root, paperPath);
      // }
      
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
    <div className="w-full relative max-w-full ">
      <AgentPanel/>
      {/* Paper content */}
      <div 
        ref={contentRef}
        id='paper-root'
        className="w-full max-w-full overflow-x-auto box-border"
        style={{ width: '100%', maxWidth: '100%' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      
     
    </div>
  );
};

export default PaperViewer;


