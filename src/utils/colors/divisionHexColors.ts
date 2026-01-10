/**
 * Division hex color mapping for charts
 * Recharts requires hex colors, not CSS classes
 */

export const getDivisionHexColor = (
  divisionName: string | null | undefined,
  isDark: boolean = false
): string => {
  if (!divisionName) {
    return isDark ? '#9ca3af' : '#6b7280'; // gray fallback
  }

  const lowerDiv = divisionName.toLowerCase();

  // Competitive Division - Amber/Gold
  if (lowerDiv.includes('competitive')) {
    return isDark ? '#fbbf24' : '#d97706';
  }

  // Intermediate Division - Blue
  if (lowerDiv.includes('intermediate')) {
    return isDark ? '#60a5fa' : '#2563eb';
  }

  // Recreational Division - Emerald/Green
  if (lowerDiv.includes('recreational')) {
    return isDark ? '#34d399' : '#059669';
  }

  // Default fallback
  return isDark ? '#9ca3af' : '#6b7280';
};
