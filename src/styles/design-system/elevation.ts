
/**
 * Elevation system with consistent shadows for different UI elements
 */
export const elevation = {
  // Base elevations
  flat: "",
  low: "shadow-sm",
  medium: "shadow-md",
  high: "shadow-lg",
  
  // Interactive variants - combine with hover/active states
  interactive: {
    flat: "shadow-none hover:shadow-sm transition-shadow duration-200",
    low: "shadow-sm hover:shadow-md active:shadow-sm transition-all duration-200",
    medium: "shadow-md hover:shadow-lg active:shadow-md transition-all duration-200",
    high: "shadow-lg hover:shadow-xl active:shadow-lg transition-all duration-200",
  },
  
  // Card specific elevations
  card: {
    default: "shadow-sm hover:shadow-md transition-all duration-300",
    active: "shadow-md hover:shadow-lg transition-all duration-300",
    highlighted: "shadow-lg hover:shadow-xl transition-all duration-300",
  }
};
