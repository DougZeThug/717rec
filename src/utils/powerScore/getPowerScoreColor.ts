
/**
 * Get appropriate color class for a power score
 */
export const getPowerScoreColor = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return 'text-gray-500';
  
  if (powerScore >= 75) return 'text-emerald-600';
  if (powerScore >= 60) return 'text-blue-600';
  if (powerScore >= 45) return 'text-amber-600';
  return 'text-red-600';
};
