/**
 * Extended division color system - now uses display_division for consistent grouping
 */
export const divisionColors = {
  competitive: {
    primary: 'hsl(var(--competitive))',
    light: 'hsl(var(--competitive) / 0.8)',
    dark: 'hsl(var(--competitive) / 1.2)',
    bg: 'bg-[hsl(var(--competitive))]',
    text: 'text-[hsl(var(--competitive))]',
    border: 'border-[hsl(var(--competitive))]',
    hover: 'hover:bg-[hsl(var(--competitive)/0.9)]',
    bgLight: 'bg-[hsl(var(--competitive)/0.1)]',
    textLight: 'text-[hsl(var(--competitive)/0.8)]',
  },
  intermediate: {
    primary: 'hsl(var(--intermediate))',
    light: 'hsl(var(--intermediate) / 0.8)',
    dark: 'hsl(var(--intermediate) / 1.2)',
    bg: 'bg-[hsl(var(--intermediate))]',
    text: 'text-[hsl(var(--intermediate))]',
    border: 'border-[hsl(var(--intermediate))]',
    hover: 'hover:bg-[hsl(var(--intermediate)/0.9)]',
    bgLight: 'bg-[hsl(var(--intermediate)/0.1)]',
    textLight: 'text-[hsl(var(--intermediate)/0.8)]',
  },
  recreational: {
    primary: 'hsl(var(--recreational))',
    light: 'hsl(var(--recreational) / 0.8)',
    dark: 'hsl(var(--recreational) / 1.2)',
    bg: 'bg-[hsl(var(--recreational))]',
    text: 'text-[hsl(var(--recreational))]',
    border: 'border-[hsl(var(--recreational))]',
    hover: 'hover:bg-[hsl(var(--recreational)/0.9)]',
    bgLight: 'bg-[hsl(var(--recreational)/0.1)]',
    textLight: 'text-[hsl(var(--recreational)/0.8)]',
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
  if (!divisionName) return '';

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

  return '';
}

/**
 * Helper to get division-specific gradient using display_division
 * Now supports both "Competitive High" and "Competitive" mapping to same style
 */
export function getDivisionGradientClass(division: string): string {
  const lowerDivName = division.toLowerCase();

  if (lowerDivName.includes('competitive')) {
    return 'bg-gradient-to-br from-background to-[hsl(var(--competitive)/0.05)] dark:from-background/90 dark:to-[hsl(var(--competitive)/0.1)]';
  }
  if (lowerDivName.includes('intermediate')) {
    return 'bg-gradient-to-br from-background to-[hsl(var(--intermediate)/0.05)] dark:from-background/90 dark:to-[hsl(var(--intermediate)/0.1)]';
  }
  if (lowerDivName.includes('recreational')) {
    return 'bg-gradient-to-br from-background to-[hsl(var(--recreational)/0.05)] dark:from-background/90 dark:to-[hsl(var(--recreational)/0.1)]';
  }

  return 'bg-gradient-to-br from-background to-muted dark:from-background dark:to-muted';
}

/**
 * Get the display division name from either display_division field or derive from name
 * This ensures consistent grouping for visual purposes
 */
export function getDisplayDivision(
  division: { display_division?: string; name?: string } | string
): string {
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
