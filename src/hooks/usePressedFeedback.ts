
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion } from "@/styles/design-system/motion";

type PressType = "button" | "card" | "row" | "tab" | "subtle";

interface UsePressedFeedbackOptions {
  type?: PressType;
  withTint?: boolean;
  disabled?: boolean;
}

interface PressedFeedbackResult {
  /** Class names to apply for pressed feedback */
  className: string;
  /** Whether currently being pressed */
  isPressed: boolean;
  /** Event handlers for press detection */
  pressHandlers: {
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
  };
}

/**
 * Hook to add consistent pressed state feedback to interactive elements.
 * Provides both class names and handlers for touch/mouse interactions.
 * 
 * @example
 * const { className, pressHandlers } = usePressedFeedback({ type: "card" });
 * return <div className={cn("...", className)} {...pressHandlers}>...</div>
 */
export function usePressedFeedback(
  options: UsePressedFeedbackOptions = {}
): PressedFeedbackResult {
  const { type = "button", withTint = true, disabled = false } = options;
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = useCallback(() => {
    if (!disabled) {
      setIsPressed(true);
    }
  }, [disabled]);

  const handlePressEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  // Get the appropriate class based on type
  const getTypeClass = () => {
    switch (type) {
      case "button":
        return motion.classes.buttonPress;
      case "card":
        return motion.classes.cardPress;
      case "row":
        return motion.classes.rowPress;
      case "tab":
        return motion.classes.tabPress;
      case "subtle":
        return motion.classes.subtlePress;
      default:
        return motion.classes.buttonPress;
    }
  };

  const className = cn(
    getTypeClass(),
    withTint && motion.classes.mobileTint,
    disabled && "pointer-events-none"
  );

  const pressHandlers = {
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onMouseLeave: handlePressEnd,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
  };

  return {
    className,
    isPressed,
    pressHandlers,
  };
}

/**
 * Simple utility to get pressed state classes without the hook state management.
 * Use when you just need Tailwind classes without tracking pressed state.
 */
export function getPressedClasses(type: PressType = "button", withTint = true): string {
  const baseClass = motion.classes[`${type}Press` as keyof typeof motion.classes] 
    || motion.classes.buttonPress;
  
  return cn(
    baseClass,
    withTint && motion.classes.mobileTint
  );
}

export default usePressedFeedback;
