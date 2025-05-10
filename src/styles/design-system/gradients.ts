
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
      competitive: "bg-gradient-to-br from-white to-orange-50 dark:from-gray-800/90 dark:to-gray-900/70",
      intermediate: "bg-gradient-to-br from-white to-blue-50 dark:from-gray-800/90 dark:to-gray-900/70",
      recreational: "bg-gradient-to-br from-white to-green-50 dark:from-gray-800/90 dark:to-gray-900/70",
    },
    elevated: "bg-gradient-to-br from-white to-gray-50 shadow-lg dark:from-gray-800 dark:to-gray-900",
    interactive: "bg-gradient-to-br from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-300 dark:from-gray-800 dark:to-gray-900 dark:hover:from-gray-800/90 dark:hover:to-gray-800",
    // New orange accent gradients
    orangeAccent: "bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-gray-900",
    orangeHighlight: "bg-gradient-to-br from-white to-orange-100/80 dark:from-gray-800 dark:to-gray-900/90",
    blueOrange: "bg-gradient-to-br from-white via-blue-50/30 to-orange-50/40 dark:from-gray-800 dark:to-gray-900",
    statHighlight: "bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30 dark:from-gray-800 dark:to-gray-900/80",
  },
  
  // Button gradients
  button: {
    primary: "bg-gradient-to-br from-cornhole-navy to-cornhole-navy/90 hover:from-cornhole-navy/90 hover:to-cornhole-navy/80",
    secondary: "bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500",
    blue: "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 dark:from-blue-700 dark:to-blue-800",
    green: "bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 dark:from-green-700 dark:to-green-800",
    // New button gradients with orange accents
    orange: "bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white",
    orangeSubtle: "bg-gradient-to-br from-orange-100 to-orange-200 hover:from-orange-200 hover:to-orange-300 text-orange-800 dark:text-orange-900",
    blueOrange: "bg-gradient-to-br from-cornhole-navy to-amber-700/80 hover:from-cornhole-navy/90 hover:to-amber-600/90 text-white",
  },

  // Section backgrounds
  section: {
    highlight: "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900",
    subtle: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-black",
    hero: "bg-gradient-to-br from-cornhole-navy via-cornhole-navy/95 to-cornhole-navy/85",
    cta: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/80 dark:to-gray-900/90",
    // New section backgrounds with orange accents
    orangeAccent: "bg-gradient-to-br from-orange-50 to-orange-100/70 dark:from-gray-800 dark:to-gray-900/90",
    blueOrangeSubtle: "bg-gradient-to-br from-blue-50 via-white to-orange-50/30 dark:from-gray-800/90 dark:via-gray-800 dark:to-gray-900",
    ctaOrange: "bg-gradient-to-br from-orange-100/80 to-amber-200/60 dark:from-amber-900/20 dark:to-gray-900", 
  },
  
  // Interactive elements
  interactive: {
    hover: "transition-all duration-200 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700",
    hoverPrimary: "transition-all duration-200 hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-700 hover:text-white",
    // New interactive gradients with orange accents
    orangeHover: "transition-all duration-200 hover:bg-gradient-to-br hover:from-orange-50/70 hover:to-orange-100/50 dark:hover:from-amber-900/10 dark:hover:to-amber-800/5",
    orangeActive: "active:bg-gradient-to-br active:from-orange-100 active:to-orange-200/80 dark:active:from-amber-900/20 dark:active:to-amber-800/10",
  },
  
  // Tab backgrounds
  tab: {
    active: "bg-gradient-to-br from-white to-gray-100 dark:from-gray-700 dark:to-gray-800",
    inactive: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900",
    division: {
      competitive: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10",
      intermediate: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10",
      recreational: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10",
    },
    // New tab backgrounds with orange accents
    activeOrange: "bg-gradient-to-br from-white to-orange-100/70 dark:from-gray-700 dark:to-gray-800",
    inactiveOrange: "bg-gradient-to-br from-orange-50/50 to-gray-100 dark:from-gray-800 dark:to-gray-900",
  },
};

/**
 * Helper function to get a gradient by key path
 * @param path - Dot notation path to the gradient
 */
export const getGradient = (path: string): string => {
  const keys = path.split('.');
  let result: any = gradients;
  
  for (const key of keys) {
    if (!result[key]) {
      return gradients.card.default;
    }
    result = result[key];
  }
  
  return typeof result === 'string' ? result : gradients.card.default;
};

/**
 * Generate a division-specific gradient
 */
export const getDivisionGradient = (division: string | null | undefined): string => {
  if (!division) return gradients.card.default;
  
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
};
