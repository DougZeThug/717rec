import { Maximize2, Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useBracketResponsive } from '@/hooks/use-bracket-responsive';

interface BracketViewportProps {
  children: React.ReactNode;
  className?: string;
}

interface ViewportState {
  scale: number;
  x: number;
  y: number;
  lastTouchDistance: number;
  isPinching: boolean;
  isDragging: boolean;
  startX: number;
  startY: number;
  mouseStartX: number;
  mouseStartY: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const SCALE_STEP = 0.2;

const BracketViewportComponent: React.FC<BracketViewportProps> = ({ children, className = '' }) => {
  const responsive = useBracketResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [viewportState, setViewportState] = useState<ViewportState>({
    scale: 1,
    x: 0,
    y: 0,
    lastTouchDistance: 0,
    isPinching: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    mouseStartX: 0,
    mouseStartY: 0,
  });

  // Auto-fit function to calculate initial zoom level - using requestAnimationFrame to prevent forced reflow
  const autoFit = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;

    // Use requestAnimationFrame to batch layout reads and prevent forced reflow
    requestAnimationFrame(() => {
      // Get container dimensions
      const containerRect = container.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();

      // Calculate scale to fit content in container with padding
      const padding = responsive.containerPadding * 2;
      const scaleX = (containerRect.width - padding) / contentRect.width;
      const scaleY = (containerRect.height - padding) / contentRect.height;

      // Use the smaller scale to ensure content fits both dimensions
      const fitScale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));

      // Center the content
      const centerX = (containerRect.width - contentRect.width * clampedScale) / 2;
      const centerY = (containerRect.height - contentRect.height * clampedScale) / 2;

      setViewportState((prev) => ({
        ...prev,
        scale: clampedScale,
        x: centerX,
        y: centerY,
      }));
    });
  }, [responsive.containerPadding]);

  // Initialize auto-fit on mount and when content changes
  useEffect(() => {
    if (!isInitialized) {
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        autoFit();
        setIsInitialized(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFit, isInitialized]);

  // Touch event handlers for mobile
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setViewportState((prev) => ({
        ...prev,
        isPinching: true,
        lastTouchDistance: distance,
      }));
    } else if (e.touches.length === 1) {
      // Drag start
      setViewportState((prev) => ({
        ...prev,
        isDragging: true,
        startX: e.touches[0].clientX - prev.x,
        startY: e.touches[0].clientY - prev.y,
      }));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 2 && viewportState.isPinching) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = viewportState.scale * (distance / viewportState.lastTouchDistance);

      setViewportState((prev) => ({
        ...prev,
        scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)),
        lastTouchDistance: distance,
      }));
    } else if (e.touches.length === 1 && viewportState.isDragging) {
      // Pan
      const newX = e.touches[0].clientX - viewportState.startX;
      const newY = e.touches[0].clientY - viewportState.startY;

      setViewportState((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setViewportState((prev) => ({
        ...prev,
        isPinching: false,
        isDragging: false,
      }));
    }
  };

  // Mouse event handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      // Left mouse button
      setViewportState((prev) => ({
        ...prev,
        isDragging: true,
        mouseStartX: e.clientX - prev.x,
        mouseStartY: e.clientY - prev.y,
      }));
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (viewportState.isDragging) {
      const newX = e.clientX - viewportState.mouseStartX;
      const newY = e.clientY - viewportState.mouseStartY;

      setViewportState((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    }
  };

  const handleMouseUp = () => {
    setViewportState((prev) => ({
      ...prev,
      isDragging: false,
    }));
  };

  // Mouse wheel zoom for desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewportState.scale + delta));

    setViewportState((prev) => ({
      ...prev,
      scale: newScale,
    }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            autoFit();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoFit]);

  // Control functions
  const handleZoomIn = () => {
    setViewportState((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale + SCALE_STEP),
    }));
  };

  const handleZoomOut = () => {
    setViewportState((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale - SCALE_STEP),
    }));
  };

  const handleReset = () => {
    setViewportState((prev) => ({
      ...prev,
      scale: 1,
      x: 0,
      y: 0,
    }));
  };

  const transformStyle = {
    transform: `scale(${viewportState.scale}) translate(${viewportState.x / viewportState.scale}px, ${viewportState.y / viewportState.scale}px)`,
    transformOrigin: 'top left',
    transition:
      viewportState.isPinching || viewportState.isDragging ? 'none' : 'transform 0.2s ease-out',
  };

  const isZoomedOut = viewportState.scale < 0.8;
  const canZoomIn = viewportState.scale < MAX_SCALE;
  const canZoomOut = viewportState.scale > MIN_SCALE;

  return (
    <div className={`relative ${className}`}>
      {/* Control Panel */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleZoomIn}
          disabled={!canZoomIn}
          className="h-10 w-10 min-h-[44px] min-w-[44px] p-0"
          title="Zoom In (Ctrl/Cmd + +)"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleZoomOut}
          disabled={!canZoomOut}
          className="h-10 w-10 min-h-[44px] min-w-[44px] p-0"
          title="Zoom Out (Ctrl/Cmd + -)"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={autoFit}
          className="h-10 w-10 min-h-[44px] min-w-[44px] p-0"
          title="Fit to Screen (Ctrl/Cmd + 0)"
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          className="h-10 w-10 min-h-[44px] min-w-[44px] p-0"
          title="Reset View"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Status Indicators */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {/* Scale indicator */}
        <div className="bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 text-sm">
          {Math.round(viewportState.scale * 100)}%
        </div>

        {/* Instructions */}
        {isZoomedOut && (
          <div className="bg-primary/10 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-primary">
            Full bracket view
          </div>
        )}
      </div>

      {/* Usage hint */}
      {viewportState.scale === 1 && responsive.isDesktop && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 backdrop-blur-sm rounded-md px-3 py-1 text-xs text-muted-foreground">
          <Move className="inline h-3 w-3 mr-1" />
          Mouse wheel to zoom, drag to pan, or use keyboard shortcuts
        </div>
      )}

      {responsive.isMobile && viewportState.scale <= 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 backdrop-blur-sm rounded-md px-3 py-1 text-xs text-muted-foreground">
          <Move className="inline h-3 w-3 mr-1" />
          Pinch to zoom, drag to pan
        </div>
      )}

      {/* Viewport Container */}
      <div
        ref={containerRef}
        className="overflow-hidden touch-none h-full w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          touchAction: 'none',
          cursor: viewportState.isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div ref={contentRef} style={transformStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const BracketViewport = React.memo(BracketViewportComponent);
