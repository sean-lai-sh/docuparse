'use client';

import { useEffect, useState, useCallback } from 'react';

interface ExtractedItem {
  text: string;
  elementId: string | null;
  timestamp: number;
}

interface TextExtractorProps {
  onExtract?: (item: ExtractedItem) => void;
  maxItems?: number;
  hoverDelay?: number;
}

/**
 * A component that tracks text + element ID on hover events and keeps history.
 */
export const TextExtractor = ({
  onExtract,
  maxItems = 10,
  hoverDelay = 300,
}: TextExtractorProps) => {
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const extractText = useCallback((el: Element): string => {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    if (!text.trim()) {
      text = el.textContent || '';
    }
    return text.trim();
  }, []);

  const handleHover = useCallback((e: MouseEvent) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeout = window.setTimeout(() => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      const text = extractText(el);
      if (!text || text.length > 150) return;

      const item: ExtractedItem = {
        text,
        elementId: getDomPath(el as Element) || null,
        timestamp: Date.now(),
      };

      setItems(prev => {
        const updated = [...prev, item].slice(-maxItems);
        return updated;
      });

      onExtract?.(item);
    }, hoverDelay);

    setTimeoutId(newTimeout);
  }, [extractText, hoverDelay, onExtract, maxItems, timeoutId]);

  useEffect(() => {
    document.addEventListener('mousemove', handleHover);
    return () => {
      document.removeEventListener('mousemove', handleHover);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleHover, timeoutId]);

  return null; // background processor – no visible DOM
};

export default TextExtractor;

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