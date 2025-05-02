
import { powerScoreThresholds } from './thresholds';

/**
 * Get appropriate Tailwind color class for a power score based on thresholds
 */
export const getPowerScoreColor = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return 'text-gray-500 dark:text-gray-400';
  
  if (powerScore >= powerScoreThresholds.excellent) return 'text-green-600 dark:text-green-500';
  if (powerScore >= powerScoreThresholds.good) return 'text-blue-600 dark:text-blue-500';
  if (powerScore >= powerScoreThresholds.average) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-500';
};

/**
 * Format power score to always show 2 decimal places
 */
export const formatPowerScore = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return "N/A";
  return powerScore.toFixed(2);
};
