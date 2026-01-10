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

/**
 * Get background color classes for win percentage display
 */
export const getWinPercentageBackgroundColor = (percentage: number): string => {
  if (percentage >= winPercentageThresholds.excellent) {
    return 'bg-green-100 dark:bg-green-900/20';
  }
  if (percentage >= winPercentageThresholds.good) {
    return 'bg-blue-100 dark:bg-blue-900/20';
  }
  if (percentage >= winPercentageThresholds.average) {
    return 'bg-orange-100 dark:bg-orange-900/20';
  }
  return 'bg-red-100 dark:bg-red-900/20';
};
