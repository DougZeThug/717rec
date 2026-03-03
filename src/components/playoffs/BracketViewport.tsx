import { Maximize2, Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

import { useViewportControls } from './useViewportControls';

interface BracketViewportProps {
  children: React.ReactNode;
  className?: string;
}

const BracketViewportComponent: React.FC<BracketViewportProps> = ({ children, className = '' }) => {
  const {
    containerRef,
    contentRef,
    responsive,
    viewportState,
    transformStyle,
    canZoomIn,
    canZoomOut,
    isZoomedOut,
    autoFit,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  } = useViewportControls();

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
        <div className="bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 text-sm">
          {Math.round(viewportState.scale * 100)}%
        </div>

        {isZoomedOut && (
          <div className="bg-primary/10 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-primary">
            Full bracket view
          </div>
        )}
      </div>

      {/* Usage hints */}
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
