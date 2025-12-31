
/**
 * Utility functions for sweep rate color coding
 * Higher sweep rate = better (more dominant performance)
 */

/**
 * Get text color class for sweep rate
 * @param rate - Sweep rate as a percentage (0-100)
 */
export const getSweepRateColor = (rate: number | null | undefined): string => {
  if (rate === null || rate === undefined) {
    return "text-muted-foreground";
  }

  // Elite dominance - Gold
  if (rate >= 70) return "text-yellow-600 dark:text-yellow-500";
  
  // Excellent - Green
  if (rate >= 55) return "text-green-600 dark:text-green-500";
  
  // Good - Blue
  if (rate >= 40) return "text-blue-600 dark:text-blue-500";
  
  // Average - Orange
  if (rate >= 25) return "text-orange-500 dark:text-orange-400";
  
  // Below average - Red
  return "text-red-600 dark:text-red-500";
};
