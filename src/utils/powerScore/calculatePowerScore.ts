
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
  const powerScore = (normalizedWinPct * 0.4) + 
                    (normalizedSOS * 0.4) + 
                    (normalizedGameWinPct * 0.2);
  
  // Convert to a 0-100 scale and round to one decimal place
  return Math.round(powerScore * 1000) / 10;
};
