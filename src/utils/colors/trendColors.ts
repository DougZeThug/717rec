
/**
 * Get color class for trend delta values
 * Positive deltas = green shades, negative = red/orange shades
 */
export const getTrendColor = (delta: number): string => {
  if (delta >= 10) return 'text-green-600 dark:text-green-400';
  if (delta >= 5) return 'text-green-500 dark:text-green-500';
  if (delta > 0) return 'text-green-600 dark:text-green-400';
  if (delta === 0) return 'text-muted-foreground';
  if (delta > -5) return 'text-orange-500 dark:text-orange-400';
  if (delta > -10) return 'text-orange-600 dark:text-orange-500';
  return 'text-red-600 dark:text-red-400';
};

/**
 * Get trend arrow icon based on delta
 */
export const getTrendArrow = (delta: number): string => {
  if (delta > 0) return '↑';
  if (delta < 0) return '↓';
  return '→';
};
