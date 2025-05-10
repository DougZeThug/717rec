
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
  },
  
  // Button gradients
  button: {
    primary: "bg-gradient-to-br from-cornhole-navy to-cornhole-navy/90 hover:from-cornhole-navy/90 hover:to-cornhole-navy/80",
    secondary: "bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500",
    blue: "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 dark:from-blue-700 dark:to-blue-800",
    green: "bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 dark:from-green-700 dark:to-green-800",
  },

  // Section backgrounds
  section: {
    highlight: "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900",
    subtle: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-black",
    hero: "bg-gradient-to-br from-cornhole-navy via-cornhole-navy/95 to-cornhole-navy/85",
    cta: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/80 dark:to-gray-900/90",
  },
  
  // Interactive elements
  interactive: {
    hover: "transition-all duration-200 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700",
    hoverPrimary: "transition-all duration-200 hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-700 hover:text-white",
  },
  
  // Tab backgrounds
  tab: {
    active: "bg-gradient-to-br from-white to-gray-100 dark:from-gray-700 dark:to-gray-800",
    inactive: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900",
    division: {
      competitive: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10",
      intermediate: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10",
      recreational: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10",
    }
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
