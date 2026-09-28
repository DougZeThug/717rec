import { useCallback, useEffect, useRef } from 'react';

interface UseLongPressOptions {
  onClick?: () => void; // For desktop normal clicks
  onLongPress: () => void; // For long press action
  longPressDelay?: number; // Delay in ms to trigger long press
}

/**
 * How far a finger may drift, in px, before the press counts as a scroll. A
 * still finger still jitters a few px, so any move at all is too strict.
 */
const MOVE_TOLERANCE_PX = 10;

export function useLongPress({ onClick, onLongPress, longPressDelay = 500 }: UseLongPressOptions) {
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const target = useRef<EventTarget | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);

  // Clear timeout if component unmounts or user stops pressing
  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    }
  }, []);

  // Set up long press timer
  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      // Save target to check if it's the same on end
      target.current = event.target;
      const touch = 'touches' in event ? event.touches[0] : undefined;
      touchOrigin.current = touch ? { x: touch.clientX, y: touch.clientY } : null;

      // Set the timeout to trigger long press
      clear();
      timeout.current = setTimeout(() => {
        onLongPress();
        clear();
      }, longPressDelay);
    },
    [onLongPress, longPressDelay, clear]
  );

  // Handle press end
  const end = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      // Only register click if it's a short press (timeout still exists)
      // and it's the same target
      if (timeout.current && event.target === target.current && onClick) {
        onClick();
      }
      clear();
    },
    [onClick, clear]
  );

  // A finger that drags past the tolerance is scrolling the feed, not holding
  // still, so the long press must not fire mid-scroll.
  const move = useCallback(
    (event: React.TouchEvent) => {
      const origin = touchOrigin.current;
      const touch = event.touches[0];
      if (!origin || !touch) return;
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) clear();
    },
    [clear]
  );

  // Use useEffect to clean up timeout on component unmount
  useEffect(() => {
    return clear;
  }, [clear]);

  // Return the event handlers to be spread on the target element
  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: move,
    onTouchCancel: clear,
  };
}
