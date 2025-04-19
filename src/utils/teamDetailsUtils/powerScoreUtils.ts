
/**
 * Calculate a team's power score based on win percentage, strength of schedule, and game win percentage
 * Power Score = (Win% * 0.4) + (SOS * 0.4) + (Game Win% * 0.2)
 */
export const calculatePowerScore = (
  winPercentage: number, 
  strengthOfSchedule: number,
  gameWinPercentage: number
): number => {
  // Normalize all inputs to ensure they're between 0 and 1
  const normalizedWinPct = Math.min(Math.max(winPercentage, 0), 1);
  const normalizedSOS = Math.min(Math.max(strengthOfSchedule, 0), 1);
  const normalizedGameWinPct = Math.min(Math.max(gameWinPercentage, 0), 1);
  
  // Calculate power score using the updated formula with new weights
  // Now SOS has 40% weight (up from 20%), win% has 40% (down from 50%)
  const powerScore = (normalizedWinPct * 0.4) + 
                     (normalizedSOS * 0.4) + 
                     (normalizedGameWinPct * 0.2);
  
  // Convert to a 0-100 scale and round to one decimal place
  return Math.round(powerScore * 1000) / 10;
};

/**
 * Format power score for display
 */
export const formatPowerScore = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return '—';
  return powerScore.toFixed(1);
};

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
