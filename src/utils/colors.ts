// Utility functions for color-coding various stats

// Re-export power score utilities from centralized location
export { formatPowerScore, getPowerScoreColor } from '@/utils/colors/powerScoreColors';

// FIXED: Corrected SOS color mapping - higher SOS (harder schedule) = red, lower SOS (easier schedule) = green
export const getSosColor = (sos: number | null | undefined): string => {
  if (sos === null || sos === undefined) {
    return 'text-muted-foreground';
  }

  // Higher SOS means tougher schedule (red), lower means easier (green)
  if (sos >= 0.875) return 'text-red-700 dark:text-red-500'; // Very hard schedule
  if (sos >= 0.75) return 'text-red-500 dark:text-red-400'; // Hard schedule
  if (sos >= 0.55) return 'text-orange-500 dark:text-orange-400'; // Moderate schedule
  return 'text-green-600 dark:text-green-500'; // Easy schedule
};

// Sweep rate color mapping - higher sweep rate (more dominant) = better colors
export const getSweepRateColor = (rate: number | null | undefined): string => {
  if (rate === null || rate === undefined) {
    return 'text-muted-foreground';
  }

  // Elite dominance - Gold
  if (rate >= 70) return 'text-yellow-600 dark:text-yellow-500';

  // Excellent - Green
  if (rate >= 55) return 'text-green-600 dark:text-green-500';

  // Good - Blue
  if (rate >= 40) return 'text-blue-600 dark:text-blue-500';

  // Average - Orange
  if (rate >= 25) return 'text-orange-500 dark:text-orange-400';

  // Below average - Red
  return 'text-red-600 dark:text-red-500';
};
