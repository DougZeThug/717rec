import React, { useState, useRef, useEffect } from 'react';
import { useBracketResponsive } from '@/hooks/use-bracket-responsive';
import { ZoomIn, ZoomOut, Move, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BracketTouchControlsProps {
  children: React.ReactNode;
  className?: string;
}

interface TouchState {
  scale: number;
  x: number;
  y: number;
  lastTouchDistance: number;
  isPinching: boolean;
  isDragging: boolean;
  startX: number;
  startY: number;
}

export const BracketTouchControls: React.FC<BracketTouchControlsProps> = ({
  children,
  className = ''
}) => {
  const responsive = useBracketResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchState, setTouchState] = useState<TouchState>({
    scale: 1,
    x: 0,
    y: 0,
    lastTouchDistance: 0,
    isPinching: false,
    isDragging: false,
    startX: 0,
    startY: 0
  });

  // Only enable touch controls on mobile
  if (!responsive.isMobile) {
    return <div className={className}>{children}</div>;
  }

  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setTouchState(prev => ({
        ...prev,
        isPinching: true,
        lastTouchDistance: distance
      }));
    } else if (e.touches.length === 1) {
      // Drag start
      setTouchState(prev => ({
        ...prev,
        isDragging: true,
        startX: e.touches[0].clientX - prev.x,
        startY: e.touches[0].clientY - prev.y
      }));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2 && touchState.isPinching) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = touchState.scale * (distance / touchState.lastTouchDistance);
      
      setTouchState(prev => ({
        ...prev,
        scale: Math.max(0.5, Math.min(3, scale)),
        lastTouchDistance: distance
      }));
    } else if (e.touches.length === 1 && touchState.isDragging && touchState.scale > 1) {
      // Pan when zoomed
      const newX = e.touches[0].clientX - touchState.startX;
      const newY = e.touches[0].clientY - touchState.startY;
      
      setTouchState(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setTouchState(prev => ({
        ...prev,
        isPinching: false,
        isDragging: false
      }));
    }
  };

  const handleZoomIn = () => {
    setTouchState(prev => ({
      ...prev,
      scale: Math.min(3, prev.scale * 1.2)
    }));
  };

  const handleZoomOut = () => {
    setTouchState(prev => ({
      ...prev,
      scale: Math.max(0.5, prev.scale / 1.2)
    }));
  };

  const handleReset = () => {
    setTouchState({
      scale: 1,
      x: 0,
      y: 0,
      lastTouchDistance: 0,
      isPinching: false,
      isDragging: false,
      startX: 0,
      startY: 0
    });
  };

  const transformStyle = {
    transform: `scale(${touchState.scale}) translate(${touchState.x / touchState.scale}px, ${touchState.y / touchState.scale}px)`,
    transformOrigin: 'center center',
    transition: touchState.isPinching || touchState.isDragging ? 'none' : 'transform 0.2s ease-out'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Touch Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleZoomIn}
          disabled={touchState.scale >= 3}
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleZoomOut}
          disabled={touchState.scale <= 0.5}
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          className="h-8 w-8 p-0"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Scale indicator */}
      {touchState.scale !== 1 && (
        <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 text-sm">
          {Math.round(touchState.scale * 100)}%
        </div>
      )}

      {/* Touch hint */}
      {touchState.scale === 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 backdrop-blur-sm rounded-md px-3 py-1 text-xs text-muted-foreground">
          <Move className="inline h-3 w-3 mr-1" />
          Pinch to zoom, drag to pan
        </div>
      )}

      {/* Touch container */}
      <div
        ref={containerRef}
        className="overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <div style={transformStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};