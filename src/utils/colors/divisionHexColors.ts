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

  // Competitive Division - Red
  if (lowerDiv.includes('competitive')) {
    return isDark ? '#ef4444' : '#dc2626';
  }

  // Intermediate Division - Amber/Yellow
  if (lowerDiv.includes('intermediate')) {
    return isDark ? '#f59e0b' : '#d97706';
  }

  // Recreational Division - Green
  if (lowerDiv.includes('recreational')) {
    return isDark ? '#22c55e' : '#16a34a';
  }

  // Default fallback
  return isDark ? '#9ca3af' : '#6b7280';
};
