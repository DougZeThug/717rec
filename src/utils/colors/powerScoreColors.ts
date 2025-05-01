
import { POWER_SCORE_THRESHOLDS } from './thresholds';

/**
 * Get appropriate Tailwind color class for a power score based on thresholds
 */
export const getPowerScoreColor = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return 'text-gray-500 dark:text-gray-400';
  
  if (powerScore >= POWER_SCORE_THRESHOLDS.HIGH) return 'text-green-600 dark:text-green-400';
  if (powerScore >= POWER_SCORE_THRESHOLDS.MEDIUM) return 'text-blue-600 dark:text-blue-400';
  if (powerScore >= POWER_SCORE_THRESHOLDS.LOW) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

/**
 * Format power score for display
 */
export const formatPowerScore = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return '—';
  return powerScore.toFixed(1);
};
