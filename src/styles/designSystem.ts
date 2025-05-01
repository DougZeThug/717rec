
// Design System Utilities
import { cn } from "@/lib/utils";

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

/**
 * Typography system for consistent text styling
 */
export const typography = {
  // Heading styles
  heading: {
    h1: "text-3xl font-oswald uppercase tracking-wide font-semibold",
    h2: "text-2xl font-oswald uppercase tracking-wide font-medium",
    h3: "text-xl font-oswald uppercase tracking-wide",
    h4: "text-lg font-oswald uppercase tracking-wide",
  },
  
  // Body text styles
  body: {
    large: "text-lg leading-relaxed font-inter",
    default: "text-base leading-relaxed font-inter",
    small: "text-sm leading-relaxed font-inter",
    tiny: "text-xs leading-relaxed font-inter",
  },
  
  // Special text treatments
  special: {
    stat: "font-bebas tracking-wide uppercase",
    accent: "font-source tracking-wide",
  }
};

/**
 * Gradient backgrounds for cards and sections
 */
export const gradients = {
  // Card gradients
  card: {
    default: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900",
    subtle: "bg-gradient-to-br from-white to-gray-100 dark:from-gray-800/80 dark:to-gray-900/80",
    highlight: "bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900/90",
    division: {
      competitive: "bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-gray-900/90",
      intermediate: "bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900/90",
      recreational: "bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-gray-900/90",
    },
  },
  
  // Button gradients
  button: {
    primary: "bg-gradient-to-br from-cornhole-navy to-cornhole-navy/90 hover:from-cornhole-navy/90 hover:to-cornhole-navy/80",
    secondary: "bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 dark:from-gray-700 dark:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700",
  },

  // Section backgrounds
  section: {
    highlight: "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900",
    subtle: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black",
  },
};

/**
 * Interactive element styles with consistent hover/active states
 */
export const interactive = {
  // Link styles
  link: {
    default: "text-cornhole-navy hover:text-cornhole-navy/80 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200",
    subtle: "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200", 
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

/**
 * Animation presets for consistent motion design
 */
export const animations = {
  fadeIn: "animate-fade-in",
  scaleIn: "animate-scale-in",
  pulse: "animate-pulse",
  fadeInSlideUp: "animate-fade-in-slide-up",
  fadeInSlideDown: "animate-fade-in-slide-down",
  entranceLeft: "transition-all duration-300 animate-entrance-left",
  entranceRight: "transition-all duration-300 animate-entrance-right",
};

/**
 * Extended division color system
 */
export const divisionColors = {
  competitive: {
    primary: "#d97706", // amber-600
    light: "#fbbf24",   // amber-400
    dark: "#92400e",    // amber-800
    bg: "bg-amber-600", 
    text: "text-amber-600",
    border: "border-amber-600",
    hover: "hover:bg-amber-500",
    bgLight: "bg-amber-100",
    textLight: "text-amber-700",
  },
  intermediate: {
    primary: "#3b82f6", // blue-500
    light: "#60a5fa",   // blue-400
    dark: "#1d4ed8",    // blue-700
    bg: "bg-blue-500",
    text: "text-blue-500",
    border: "border-blue-500",
    hover: "hover:bg-blue-400",
    bgLight: "bg-blue-100",
    textLight: "text-blue-700",
  },
  recreational: {
    primary: "#10b981", // emerald-500
    light: "#34d399",   // emerald-400
    dark: "#047857",    // emerald-800
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    border: "border-emerald-500",
    hover: "hover:bg-emerald-400",
    bgLight: "bg-emerald-100",
    textLight: "text-emerald-700",
  },
};

/**
 * Get division-specific styling (text color, background, etc)
 */
export function getDivisionStyles(divisionName: string | null | undefined, type: 'text' | 'bg' | 'border' | 'hover' | 'bgLight' | 'textLight' = 'text') {
  if (!divisionName) return "";
  
  const lowerDivName = divisionName.toLowerCase();
  if (lowerDivName.includes('competitive')) {
    return divisionColors.competitive[type];
  }
  if (lowerDivName.includes('intermediate')) {
    return divisionColors.intermediate[type];
  }
  if (lowerDivName.includes('recreational')) {
    return divisionColors.recreational[type];
  }
  
  return "";
}

/**
 * Card style utility function that combines various design system elements
 */
export function getCardStyle({
  gradient = 'default',
  elevation = 'default',
  interactive = true,
  division = null,
  className = ""
}: {
  gradient?: 'default' | 'subtle' | 'highlight',
  elevation?: 'default' | 'active' | 'highlighted',
  interactive?: boolean,
  division?: string | null,
  className?: string
} = {}) {
  // Get division-specific gradient if division is provided
  const cardGradient = division 
    ? getDivisionGradient(division) 
    : gradients.card[gradient];
  
  return cn(
    "rounded-lg border border-gray-200 dark:border-gray-700", 
    cardGradient,
    elevation ? elevation.card[elevation] : "",
    interactive ? interactive.card.hover : "",
    className
  );
}

/**
 * Helper to get division-specific gradient
 */
function getDivisionGradient(division: string): string {
  const lowerDivName = division.toLowerCase();
  
  if (lowerDivName.includes('competitive')) {
    return gradients.card.division.competitive;
  }
  if (lowerDivName.includes('intermediate')) {
    return gradients.card.division.intermediate;
  }
  if (lowerDivName.includes('recreational')) {
    return gradients.card.division.recreational;
  }
  
  return gradients.card.default;
}
