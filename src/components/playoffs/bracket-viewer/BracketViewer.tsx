
import React, { useEffect, useRef, useState } from 'react';
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
 * using the brackets-viewer library with dynamic imports
 */
const BracketViewer: React.FC<BracketViewerProps> = ({ 
  bracketData, 
  onMatchClick,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup function to destroy the viewer when unmounting
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (err) {
          console.warn('Error destroying brackets viewer:', err);
        }
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const initializeBracketViewer = async () => {
      if (!containerRef.current || !bracketData) return;

      setIsLoading(true);
      setError(null);

      // Clean up previous instance if it exists
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (err) {
          console.warn('Error destroying previous viewer:', err);
        }
        viewerRef.current = null;
      }

      try {
        // Dynamic import to handle build issues
        const { BracketsViewer } = await import('brackets-viewer');
        
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
            fontFamily: 'system-ui, sans-serif',
          }
        });

        console.log('BracketsViewer initialized with data:', bracketData);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize BracketsViewer:', error);
        setError('Failed to load bracket viewer. Falling back to custom bracket display.');
        setIsLoading(false);
      }
    };

    initializeBracketViewer();
  }, [bracketData, onMatchClick]);

  if (isLoading) {
    return (
      <div className={`brackets-viewer-container ${className} flex items-center justify-center h-64`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading bracket viewer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`brackets-viewer-container ${className} flex items-center justify-center h-64`}>
        <div className="text-center text-red-600">
          <p className="mb-2">⚠️ {error}</p>
          <p className="text-sm text-gray-500">Please ensure brackets-viewer package is installed</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`brackets-viewer-container ${className}`}
      data-testid="bracket-viewer"
    />
  );
};

export default BracketViewer;
