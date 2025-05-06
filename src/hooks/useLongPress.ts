
import { useCallback, useEffect, useRef } from "react";

interface UseLongPressOptions {
  onClick?: () => void; // For desktop normal clicks
  onLongPress: () => void; // For long press action
  longPressDelay?: number; // Delay in ms to trigger long press
}

export function useLongPress({
  onClick,
  onLongPress,
  longPressDelay = 500
}: UseLongPressOptions) {
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const target = useRef<EventTarget | null>(null);
  
  // Clear timeout if component unmounts or user stops pressing
  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    }
  }, []);
  
  // Set up long press timer
  const start = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Save target to check if it's the same on end
    target.current = event.target;
    
    // Set the timeout to trigger long press
    clear();
    timeout.current = setTimeout(() => {
      onLongPress();
      clear();
    }, longPressDelay);
  }, [onLongPress, longPressDelay, clear]);
  
  // Handle press end
  const end = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Only register click if it's a short press (timeout still exists)
    // and it's the same target
    if (timeout.current && event.target === target.current && onClick) {
      onClick();
    }
    clear();
  }, [onClick, clear]);

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
  };
}
