'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface DOMHighlighterProps {
  enabled?: boolean;
  highlightColor?: string;
  borderColor?: string;
  onElementHover?: (element: HTMLElement | null) => void;
  onClick?: (element: HTMLElement | null) => void;
  excludedSelectors?: string[];
}

const DOMHighlighter: React.FC<DOMHighlighterProps> = ({
  enabled = true,
  highlightColor = 'rgba(147, 197, 253, 0.3)', // blue-300 with opacity
  borderColor = 'rgba(59, 130, 246, 0.8)', // blue-500 with opacity
  onElementHover,
  onClick,
  excludedSelectors = ['script', 'style', 'head', 'meta', 'link', 'svg', 'img', 'button', 'a', 'input', 'select', 'textarea', 'label']
}) => {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [clickedElement, setClickedElement] = useState<HTMLElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const isInteracting = useRef(false);

  // Check if an element should be excluded from highlighting
  const isElementExcluded = useCallback((element: HTMLElement): boolean => {
    if (!element) return true;
    
    // Check if element or any of its parents match excluded selectors
    let current: HTMLElement | null = element;
    while (current) {
      if (excludedSelectors.some(selector => current?.matches(selector))) {
        return true;
      }
      current = current.parentElement;
    }
    
    return false;
  }, [excludedSelectors]);

  // Update highlight position and style
  const updateHighlight = useCallback((element: HTMLElement | null) => {
    if (!highlightRef.current || !element) {
      if (highlightRef.current) {
        (highlightRef.current as HTMLDivElement).style.setProperty('display', 'none', 'important');
      }
      return;
    }
    
    const highlight = highlightRef.current as HTMLDivElement;

    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    highlight.style.setProperty('display', 'block', 'important');
    highlight.style.setProperty('position', 'absolute', 'important');
    highlight.style.setProperty('z-index', '2147483647', 'important'); // max z-index
    highlight.style.setProperty('pointer-events', 'none', 'important');
    highlight.style.setProperty('background-color', highlightColor, 'important');
    highlight.style.setProperty('border', `1px solid ${borderColor}`, 'important');
    highlight.style.setProperty('border-radius', '3px', 'important');
    highlight.style.setProperty('left', `${rect.left + scrollX}px`, 'important');
    highlight.style.setProperty('top', `${rect.top + scrollY}px`, 'important');
    highlight.style.setProperty('width', `${rect.width}px`, 'important');
    highlight.style.setProperty('height', `${rect.height}px`, 'important');
    highlight.style.setProperty('transition', 'all 0.1s ease-out', 'important');
  }, [highlightColor, borderColor]);

  // Handle mouse movement to highlight elements
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || isInteracting.current) return;

    const target = e.target as HTMLElement;
    
    // Skip if the target is excluded or is a child of an excluded element
    if (isElementExcluded(target)) {
      if (hoveredElement) {
        setHoveredElement(null);
        onElementHover?.(null);
      }
      return;
    }

    // Update hovered element if it's different
    if (target !== hoveredElement) {
      setHoveredElement(target);
      onElementHover?.(target);
    }
  }, [enabled, hoveredElement, onElementHover, isElementExcluded]);

  // Handle click on elements
  const handleClick = useCallback((e: MouseEvent) => {
    if (!enabled) return;
    
    const target = e.target as HTMLElement;
    
    // Skip if the target is excluded
    if (isElementExcluded(target)) {
      setClickedElement(null);
      onClick?.(null);
      return;
    }

    // Update clicked element
    setClickedElement(target);
    onClick?.(target);
    
    // Prevent default to avoid any native behavior
    e.preventDefault();
    e.stopPropagation();
  }, [enabled, onClick, isElementExcluded]);

  // Handle scroll and resize to update highlight position
  const updateHighlightPosition = useCallback(() => {
    if (hoveredElement) {
      updateHighlight(hoveredElement);
    }
  }, [hoveredElement, updateHighlight]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) {
      setHoveredElement(null);
      setClickedElement(null);
      return;
    }

    // Add highlight element to the DOM if it doesn't exist
    if (!highlightRef.current) {
      const highlight = document.createElement('div');
      highlight.id = 'dom-highlight';
      highlight.style.display = 'none';
      document.body.appendChild(highlight);
      // Update the ref value directly
      highlightRef.current = highlight;
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true); // Use capture phase
    window.addEventListener('scroll', updateHighlightPosition, true);
    window.addEventListener('resize', updateHighlightPosition);

    // Handle interaction states
    const handleMouseDown = () => {
      isInteracting.current = true;
      if (highlightRef.current) {
        highlightRef.current.style.display = 'none';
      }
    };

    const handleMouseUp = () => {
      isInteracting.current = false;
      if (hoveredElement) {
        updateHighlight(hoveredElement);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      // Clean up event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('scroll', updateHighlightPosition, true);
      window.removeEventListener('resize', updateHighlightPosition);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);

      // Clean up highlight element
      const highlight = highlightRef.current;
      if (highlight && document.body.contains(highlight)) {
        document.body.removeChild(highlight);
        highlightRef.current = null;
      }
    };
  }, [enabled, handleMouseMove, handleClick, updateHighlightPosition, hoveredElement, updateHighlight]);

  // Update highlight when hovered element changes
  useEffect(() => {
    if (enabled && hoveredElement) {
      updateHighlight(hoveredElement);
    } else if (highlightRef.current) {
      highlightRef.current.style.display = 'none';
    }
  }, [enabled, hoveredElement, updateHighlight]);

  return null;
};

export default DOMHighlighter;
