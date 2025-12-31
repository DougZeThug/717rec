
import { cn } from "@/lib/utils";

/**
 * Blue-to-Amber gradient style system for consistent styling across the app
 */
export const blueAmber = {
  // Text gradients for headings and important text
  // heading-winter class allows winter CSS to override
  text: {
    heading: "bg-gradient-to-br from-blue-600 to-amber-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-300 heading-winter",
    headingSubtle: "bg-gradient-to-br from-blue-500/90 to-amber-500/80 bg-clip-text text-transparent heading-winter",
    accent: "bg-gradient-to-br from-blue-700 to-amber-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400 heading-winter",
  },
  
  // Border gradients for cards and containers
  border: {
    default: "border-l-4 border-gradient-to-b border-blue-500 dark:border-blue-700",
    accent: "border-l-4 border-gradient-to-b from-blue-500 to-amber-500 dark:from-blue-600 dark:to-amber-600",
    top: "border-t-4 border-gradient-to-r from-blue-500 to-amber-500 dark:from-blue-600 dark:to-amber-600",
  },
  
  // Background gradients for cards and sections
  background: {
    card: "bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-gray-900",
    cardAccent: "bg-gradient-to-br from-white via-blue-50/20 to-amber-50/30 dark:from-gray-800 dark:to-gray-900",
    section: "bg-gradient-to-br from-blue-50/50 via-white to-amber-50/20 dark:from-gray-800/80 dark:via-gray-800/90 dark:to-gray-900",
    hover: "hover:bg-gradient-to-br hover:from-blue-50/40 hover:to-amber-50/20 dark:hover:from-gray-800/90 dark:hover:to-gray-700/80",
  },
  
  // Interactive elements gradients (buttons, toggles, etc)
  interactive: {
    active: "bg-gradient-to-br from-blue-600 to-amber-600 text-white dark:from-blue-600 dark:to-amber-700 dark:text-white",
    hover: "hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-amber-500/5 dark:hover:from-blue-900/10 dark:hover:to-amber-900/5",
    pressed: "active:bg-gradient-to-br active:from-blue-600/20 active:to-amber-600/10",
  },
  
  // Helper function to apply heading gradient styles with options
  headingGradient: (className?: string, options?: { subtle?: boolean }) => {
    return cn(
      options?.subtle 
        ? "bg-gradient-to-br from-blue-500/90 to-amber-500/80 bg-clip-text text-transparent" 
        : "bg-gradient-to-br from-blue-600 to-amber-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-300",
      className
    );
  },
  
  // Helper function to create card with blue-amber styling
  card: (className?: string, options?: { accent?: boolean, hover?: boolean }) => {
    return cn(
      "rounded-lg border border-gray-200 dark:border-gray-700",
      options?.accent 
        ? "bg-gradient-to-br from-white via-blue-50/20 to-amber-50/30 dark:from-gray-800 dark:to-gray-900" 
        : "bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-gray-900",
      options?.hover && "transition-all duration-300 hover:shadow-md hover:bg-gradient-to-br hover:from-blue-50/30 hover:to-amber-50/20 dark:hover:from-gray-800/80 dark:hover:to-gray-900/90",
      className
    );
  }
};

// Helper utility to apply blue-amber heading style to any element
// Winter theme overrides this via CSS (.winter-frozen .heading-winter)
export function blueAmberHeading(className?: string) {
  return cn(
    "font-bebas uppercase tracking-wide bg-gradient-to-br from-blue-600 to-amber-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-300 heading-winter",
    className
  );
}

// Helper utility for interactive elements with blue-amber styling
export function blueAmberInteractive(className?: string) {
  return cn(
    "transition-all duration-200 bg-gradient-to-br from-blue-600 to-amber-600 hover:from-blue-500 hover:to-amber-500 text-white",
    className
  );
}

// Winter text gradient class exports for direct use
export const winterText = {
  heading: "text-gradient-winter-heading heading-winter",
  accent: "text-gradient-winter-accent",
  subtle: "text-gradient-winter-subtle",
  glow: "text-gradient-winter-glow",
};

// Winter active toggle style
export const winterToggleActive = "toggle-winter-active";
