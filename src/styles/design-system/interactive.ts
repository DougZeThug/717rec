
/**
 * Interactive element styles with consistent hover/active states
 * Includes pressed states for mobile-friendly tactile feedback
 */
export const interactive = {
  // Link styles
  link: {
    default: "text-cornhole-navy hover:text-cornhole-navy/80 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200",
    subtle: "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-200", 
    underline: "text-cornhole-navy hover:text-cornhole-navy/80 underline-offset-4 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200",
  },
  
  // Button hover/focus/active styles
  button: {
    subtle: "hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700 transition-colors duration-200",
    bounce: "active:scale-[0.97] hover:scale-[1.02] transition-transform duration-200",
    // New pressed state with tint
    pressed: "active:scale-[0.97] active:bg-foreground/5 dark:active:bg-foreground/10 transition-all duration-100",
  },
  
  // Card interactive states with pressed feedback
  card: {
    hover: "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200",
    active: "active:bg-gray-100 dark:active:bg-gray-700/50 transition-colors duration-200",
    scale: "hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200",
    // New pressed state for cards
    pressed: "active:scale-[0.98] active:bg-accent/5 dark:active:bg-accent/10 transition-all duration-100",
    // Combined hover + pressed for interactive cards
    interactive: "hover:bg-gray-50 hover:shadow-md active:scale-[0.98] active:shadow-sm active:bg-gray-100/50 dark:hover:bg-gray-800/50 dark:active:bg-gray-700/50 transition-all duration-100 cursor-pointer",
  },
  
  // Row/item states with pressed feedback
  row: {
    hover: "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150",
    active: "active:bg-gray-100 dark:active:bg-gray-700 transition-colors duration-150",
    // New pressed state for rows
    pressed: "active:scale-[0.99] active:bg-accent/10 dark:active:bg-accent/15 transition-all duration-100",
    // Combined hover + pressed for list items
    interactive: "hover:bg-gray-50 active:scale-[0.99] active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 transition-all duration-100 cursor-pointer",
  },
  
  // Tab interactive states
  tab: {
    hover: "hover:bg-accent/50 transition-colors duration-150",
    pressed: "active:scale-[0.98] active:bg-accent/30 transition-all duration-100",
    interactive: "hover:bg-accent/50 active:scale-[0.98] active:bg-accent/30 transition-all duration-100",
  },
  
  // Mobile-specific tint overlay (use with other states)
  mobileTint: "active:bg-foreground/5 dark:active:bg-foreground/10",
};
