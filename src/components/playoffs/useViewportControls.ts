import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useBracketResponsive } from '@/hooks/useBracketResponsive';

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

/**
 * Hook that manages pan/zoom/pinch controls for the bracket viewport.
 * Returns state, refs, and event handlers for the viewport container.
 */
export const useViewportControls = () => {
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

  // Auto-fit function using double rAF to prevent forced reflow
  const autoFit = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();

        const padding = responsive.containerPadding * 2;
        const scaleX = (containerRect.width - padding) / contentRect.width;
        const scaleY = (containerRect.height - padding) / contentRect.height;

        const fitScale = Math.min(scaleX, scaleY, 1);
        const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));

        const centerX = (containerRect.width - contentRect.width * clampedScale) / 2;
        const centerY = (containerRect.height - contentRect.height * clampedScale) / 2;

        setViewportState((prev) => ({
          ...prev,
          scale: clampedScale,
          x: centerX,
          y: centerY,
        }));
      });
    });
  }, [responsive.containerPadding]);

  // Initialize auto-fit on mount
  useEffect(() => {
    if (!isInitialized) {
      const timer = setTimeout(() => {
        autoFit();
        setIsInitialized(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFit, isInitialized]);

  // Touch helpers
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setViewportState((prev) => ({
        ...prev,
        isPinching: true,
        lastTouchDistance: distance,
      }));
    } else if (e.touches.length === 1) {
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
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = viewportState.scale * (distance / viewportState.lastTouchDistance);

      setViewportState((prev) => ({
        ...prev,
        scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)),
        lastTouchDistance: distance,
      }));
    } else if (e.touches.length === 1 && viewportState.isDragging) {
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

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
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

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewportState.scale + delta));

    setViewportState((prev) => ({
      ...prev,
      scale: newScale,
    }));
  };

  // Zoom button handlers
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

  const transformStyle = {
    transform: `scale(${viewportState.scale}) translate(${viewportState.x / viewportState.scale}px, ${viewportState.y / viewportState.scale}px)`,
    transformOrigin: 'top left',
    transition:
      viewportState.isPinching || viewportState.isDragging ? 'none' : 'transform 0.2s ease-out',
  };

  const canZoomIn = viewportState.scale < MAX_SCALE;
  const canZoomOut = viewportState.scale > MIN_SCALE;
  const isZoomedOut = viewportState.scale < 0.8;

  return {
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
  };
};
