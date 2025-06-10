
/**
 * Extended division color system - now uses display_division for consistent grouping
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
 * Get division-specific styling using display_division for consistent grouping
 * Now works with both display_division and legacy divisionName fields
 */
export function getDivisionStyles(
  divisionName: string | null | undefined, 
  type: 'text' | 'bg' | 'border' | 'hover' | 'bgLight' | 'textLight' = 'text'
) {
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
 * Helper to get division-specific gradient using display_division
 * Now supports both "Competitive High" and "Competitive" mapping to same style
 */
export function getDivisionGradientClass(division: string): string {
  const lowerDivName = division.toLowerCase();
  
  if (lowerDivName.includes('competitive')) {
    return "bg-gradient-to-br from-white to-orange-50 dark:from-gray-800/90 dark:to-gray-900/70";
  }
  if (lowerDivName.includes('intermediate')) {
    return "bg-gradient-to-br from-white to-blue-50 dark:from-gray-800/90 dark:to-gray-900/70";
  }
  if (lowerDivName.includes('recreational')) {
    return "bg-gradient-to-br from-white to-green-50 dark:from-gray-800/90 dark:to-gray-900/70";
  }
  
  return "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900";
}

/**
 * Get the display division name from either display_division field or derive from name
 * This ensures consistent grouping for visual purposes
 */
export function getDisplayDivision(division: { display_division?: string; name?: string } | string): string {
  if (typeof division === 'string') {
    const lowerName = division.toLowerCase();
    if (lowerName.includes('competitive')) return 'Competitive';
    if (lowerName.includes('intermediate')) return 'Intermediate';
    if (lowerName.includes('recreational')) return 'Recreational';
    return 'Recreational'; // fallback
  }
  
  // Use display_division if available, otherwise derive from name
  return division.display_division || getDisplayDivision(division.name || '');
}
