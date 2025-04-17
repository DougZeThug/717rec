
import { cn } from "@/lib/utils";

/**
 * Utility function to apply consistent interactive feedback styles
 * to elements across the application
 */
export const getInteractionStyles = (
  className?: string,
  options?: {
    withHover?: boolean;
    withActive?: boolean;
    withScale?: boolean;
    withShadow?: boolean;
  }
) => {
  const {
    withHover = true,
    withActive = true,
    withScale = true,
    withShadow = true
  } = options || {};

  return cn(
    // Base styles
    "transition-all duration-150",
    
    // Hover styles (desktop)
    withHover && "hover:bg-gray-50 hover:cursor-pointer",
    withShadow && "hover:shadow-md",
    
    // Active/tap styles (mobile & desktop)
    withActive && "active:bg-gray-100",
    withScale && "active:scale-[0.98]",
    
    // Custom classes
    className
  );
};

/**
 * Utility function specifically for card-based interactions
 */
export const getCardInteractionStyles = (className?: string) => {
  return getInteractionStyles(
    cn("hover:shadow-md active:shadow", className)
  );
};

/**
 * Utility function for button interactions
 */
export const getButtonInteractionStyles = (className?: string) => {
  return getInteractionStyles(
    cn("hover:bg-opacity-90 active:bg-opacity-100", className),
    { withShadow: false }
  );
};

/**
 * Utility function for row/item interactions
 */
export const getRowInteractionStyles = (className?: string) => {
  return getInteractionStyles(
    cn("hover:bg-gray-50 active:bg-gray-100", className),
    { withShadow: false }
  );
};
