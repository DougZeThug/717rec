
/**
 * Get appropriate color class for a power score
 */
export const getPowerScoreColor = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return 'text-gray-500';
  
  if (powerScore >= 75) return 'text-green-600';
  if (powerScore >= 60) return 'text-blue-500';
  if (powerScore >= 40) return 'text-orange-500';
  return 'text-red-500';
};
