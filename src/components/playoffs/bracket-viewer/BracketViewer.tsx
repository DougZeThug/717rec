
import React, { useEffect, useRef } from 'react';
import { BracketsViewer } from 'brackets-viewer';
import { BracketData } from './types';
import './bracket-viewer.css';

interface BracketViewerProps {
  bracketData: BracketData;
  onMatchClick?: (matchId: string) => void;
  className?: string;
}

/**
 * React wrapper for brackets-viewer.js library
 * This component handles the rendering of tournament brackets 
 * using the brackets-viewer library
 */
const BracketViewer: React.FC<BracketViewerProps> = ({ 
  bracketData, 
  onMatchClick,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BracketsViewer | null>(null);

  useEffect(() => {
    // Cleanup function to destroy the viewer when unmounting
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !bracketData) return;

    // Clean up previous instance if it exists
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    try {
      // Create new BracketsViewer instance
      viewerRef.current = new BracketsViewer({
        container: containerRef.current,
        data: bracketData,
        onMatchClick: onMatchClick ? (match) => {
          if (match && match.id) {
            onMatchClick(match.id.toString());
          }
        } : undefined,
        disableHighlight: false,
        theme: {
          // We'll customize this in Phase 4
          fontFamily: 'system-ui, sans-serif',
        }
      });

      console.log('BracketsViewer initialized with data:', bracketData);
    } catch (error) {
      console.error('Failed to initialize BracketsViewer:', error);
    }
  }, [bracketData, onMatchClick]);

  return (
    <div 
      ref={containerRef} 
      className={`brackets-viewer-container ${className}`}
      data-testid="bracket-viewer"
    />
  );
};

export default BracketViewer;
