
/**
 * Get appropriate color class for a power score based on thresholds:
 * ≥ 75: Green
 * 50-74.9: Blue
 * 30-49.9: Orange
 * < 30: Red
 */
export const getPowerScoreColor = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return 'text-gray-500';
  
  if (powerScore >= 75) return 'text-green-600';
  if (powerScore >= 50) return 'text-blue-600';
  if (powerScore >= 30) return 'text-orange-500';
  return 'text-red-600';
};
