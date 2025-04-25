
/**
 * Get appropriate Tailwind color class for a power score based on thresholds
 */
export const getPowerScoreColor = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return 'text-gray-500 dark:text-gray-400';
  
  if (powerScore >= 75) return 'text-green-600 dark:text-green-500';
  if (powerScore >= 50) return 'text-blue-600 dark:text-blue-500';
  if (powerScore >= 30) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-500';
};
