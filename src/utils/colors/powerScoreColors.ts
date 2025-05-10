
import { powerScoreThresholds } from './thresholds';

/**
 * Get appropriate Tailwind color class for a power score based on thresholds
 * 
 * @param powerScore The power score value to evaluate
 * @returns A Tailwind CSS color class based on the power score threshold
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
 * 
 * @param powerScore The power score to format
 * @returns A formatted string representation of the power score
 */
export const formatPowerScore = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return "N/A";
  return powerScore.toFixed(2);
};
