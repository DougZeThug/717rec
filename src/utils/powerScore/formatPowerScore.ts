
/**
 * Format power score for display
 */
export const formatPowerScore = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return '—';
  return powerScore.toFixed(1);
};
