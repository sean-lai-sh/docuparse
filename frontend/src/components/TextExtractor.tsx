'use client';

import { MousePointer } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface HoveredItem {
  text: string;
  element: Element;
  timestamp: number;
}

interface TextHoverExtractorProps {
  /**
   * Function to call when text content is extracted
   * @param text The extracted text content
   * @param element The DOM element from which the text was extracted
   */
  onTextExtracted?: (text: string, element: Element) => void;
  
  /**
   * Whether to show the built-in modal
   * @default true
   */
  showModal?: boolean;
  
  /**
   * CSS class to apply to the modal
   */
  modalClassName?: string;
  
  /**
   * Delay in milliseconds before extracting text after hovering
   * @default 300
   */
  hoverDelay?: number;
  
  /**
   * Whether to enable the extractor
   * @default true
   */
  enabled?: boolean;

  /**
   * How long to keep items in history (in milliseconds)
   * @default 5000 (5 seconds)
   */
  historyDuration?: number;

  /**
   * Maximum number of items to keep in history
   * @default 5
   */
  maxHistoryItems?: number;

  /**
   * Slug or identifier for the current paper
   */
  slug?: string;
}

/**
 * A component that extracts text content from DOM elements on hover
 * and maintains a history of recently hovered elements
 * 
 * Compatible with Next.js 14 App Router
 */
export const TextHoverExtractor = ({
  onTextExtracted,
  showModal = true,
  modalClassName = '',
  hoverDelay = 300,
  enabled = true,
  historyDuration = 5000,
  maxHistoryItems = 5,
  slug = ''
}: TextHoverExtractorProps) => {
  const [hoveredItems, setHoveredItems] = useState<HoveredItem[]>([]);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Extract text content from an element
  const extractTextContent = useCallback((element: Element): string => {
    // Get only the direct text content of this node, not including children
    let textContent = '';
    
    // Loop through child nodes to find text nodes
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE) {
        textContent += node.textContent;
      }
    }
    
    // If no direct text content, get all text content
    if (!textContent.trim()) {
      textContent = element.textContent || '';
    }
    
    return textContent.trim();
  }, []);

  // Clean up expired items from history
  const cleanupHistory = useCallback(() => {
    const now = Date.now();
    setHoveredItems(prevItems => 
      prevItems
        .filter(item => now - item.timestamp < historyDuration)
        .slice(-maxHistoryItems)
    );
  }, [historyDuration, maxHistoryItems]);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || !isMounted) return;
    
    // Clear any existing timeout
    if (hoverTimeout !== null) {
      window.clearTimeout(hoverTimeout);
    }
    
    // Set a new timeout
    const timeout = window.setTimeout(async () => {
      const element = document.elementFromPoint(e.clientX, e.clientY);
      
      if (element) {
        console.log('Hovered element:', element.id);
        const text = extractTextContent(element);
        
        if (text) {
          /// do not add items >= 150 characters
          if (text.length >= 150) {
            return; // Skip adding long text
          }
          // Add to history if text is not empty
          const newItem: HoveredItem = {
            text,
            element,
            timestamp: Date.now()
          };
          
          setHoveredItems(prevItems => {
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
            const newItems = [...prevItems, newItem];
            return newItems.slice(-maxHistoryItems);
          });

        

          /// Call our fancy api
          let numSlice = hoveredItems.length > 10 ? 10 : hoveredItems.length;
          /// Aggregate upto the last 10 items
          const aggregatedText = hoveredItems
            .slice(numSlice * -1)
            .map(item => item.text)
            .join(' ');

          const path = getDomPath(hoveredItems[0].element)

          console.log('Aggregated text:', aggregatedText);
          console.log('Hovered items:', slug);
          console.log('document_id:', path);

            try {
              const res = await fetch('http://localhost:8000/fastingest', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: aggregatedText,
                  url: slug,
                  document_id: '',
                }),
              });
            
              if (!res.ok) {
                const errorText = await res.text(); // fallback for non-JSON errors
                throw new Error(`Server error ${res.status}: ${errorText}`);
              }
            
              const data = await res.json();
              console.log('✅ Server responded:', data);
            } catch (err) {
              console.error('❌ Error calling /fastingest:', err);
            }
            
          setModalPosition({ 
            x: e.clientX + 15, // Offset to not cover the cursor
            y: e.clientY + 15
          });
          setIsModalVisible(true);
          
          if (onTextExtracted) {
            onTextExtracted(text, element);
          }
        }
      }
    }, hoverDelay);
    
    setHoverTimeout(timeout as unknown as number);
  }, [enabled, extractTextContent, hoverDelay, hoverTimeout, isMounted, maxHistoryItems, onTextExtracted]);

  // Set up and clean up event listeners
  useEffect(() => {
    // Mark component as mounted to avoid hydration issues
    setIsMounted(true);
    
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Set up event listeners after component is mounted
  useEffect(() => {
    if (enabled && isMounted) {
      document.addEventListener('mousemove', handleMouseMove);
      
      // Set up interval to clean up expired items
      const cleanupInterval = setInterval(cleanupHistory, 1000);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        if (hoverTimeout !== null) {
          window.clearTimeout(hoverTimeout);
        }
        clearInterval(cleanupInterval);
      };
    }
    
    return () => {
      if (hoverTimeout !== null) {
        window.clearTimeout(hoverTimeout);
      }
    };
  }, [cleanupHistory, enabled, handleMouseMove, hoverTimeout, isMounted]);

  // Hide modal when no items or disabled
  useEffect(() => {
    if (!enabled || hoveredItems.length === 0) {
      setIsModalVisible(false);
    }
  }, [enabled, hoveredItems]);

  // Don't render anything on server or if not mounted yet
  if (!isMounted || !showModal || !isModalVisible || hoveredItems.length === 0) {
    return null;
  }

  return (
    <div 
      className={`fixed z-50 rounded-full bg-blue/600 w-1 h-1 mt-1 shadow-lg ${modalClassName}`}
      style={{
        left: `${modalPosition.x}px`,
        top: `${modalPosition.y}px`,
        transform: 'translate(0, 0)',
      }}
    >
      {/* <MousePointer/> */}
      {/* <div className="text-sm font-medium mb-2">Text Content History:</div>
      <div className="space-y-2">
        {hoveredItems.slice().reverse().map((item, index) => (
          <div key={index} className="p-2 bg-gray-50 rounded text-xs">
            <div className="font-medium text-gray-700">
              {new Date(item.timestamp).toLocaleTimeString()} 
              {index === 0 && <span className="ml-1 text-green-600">(Current)</span>}
            </div>
            <div className="mt-1">{item.text}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        History duration: {historyDuration/1000}s | Max items: {maxHistoryItems}
      </div> */}
    </div>
  );
};

export default TextHoverExtractor;

function getDomPath(el: Element): string {
  const path: string[] = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();

    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children).filter(
        sibling => sibling.nodeName === el.nodeName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(el);
        selector += `:nth-of-type(${index + 1})`;
      }
    }

    path.unshift(selector);
    el = el.parentElement!;
  }
  return path.join(' > ');
}