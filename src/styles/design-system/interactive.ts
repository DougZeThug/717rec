
/**
 * Interactive element styles with consistent hover/active states
 */
export const interactive = {
  // Link styles
  link: {
    default: "text-cornhole-navy hover:text-cornhole-navy/80 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200",
    subtle: "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-200", 
    underline: "text-cornhole-navy hover:text-cornhole-navy/80 underline-offset-4 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200",
  },
  
  // Button hover/focus styles (to be combined with buttonVariants)
  button: {
    subtle: "hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700 transition-colors duration-200",
    bounce: "active:scale-[0.97] hover:scale-[1.02] transition-transform duration-200",
  },
  
  // Card interactive states
  card: {
    hover: "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200",
    active: "active:bg-gray-100 dark:active:bg-gray-700/50 transition-colors duration-200",
    scale: "hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200",
  },
  
  // Row/item hover states for lists
  row: {
    hover: "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150",
    active: "active:bg-gray-100 dark:active:bg-gray-700 transition-colors duration-150",
  },
};
