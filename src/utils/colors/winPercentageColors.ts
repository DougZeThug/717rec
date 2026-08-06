import { winPercentageThresholds } from './thresholds';

/**
 * Get color classes for win percentage display
 */
export const getWinPercentageColor = (percentage: number): string => {
  if (percentage >= winPercentageThresholds.excellent) {
    return 'text-green-600 dark:text-green-500';
  }
  if (percentage >= winPercentageThresholds.good) {
    return 'text-blue-600 dark:text-blue-500';
  }
  if (percentage >= winPercentageThresholds.average) {
    return 'text-orange-500 dark:text-orange-400';
  }
  return 'text-red-600 dark:text-red-500';
};
