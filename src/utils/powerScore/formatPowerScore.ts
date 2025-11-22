
/**
 * Format power score for display
 */
export const formatPowerScore = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return '—';
  return (powerScore * 100).toFixed(1);
};
