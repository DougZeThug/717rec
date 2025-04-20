
/**
 * Calculate a team's power score based on win percentage, strength of schedule, and game win percentage
 * 
 * New Power Score = (WeightedWin% * 0.4) + (SOS * 0.4) + (WeightedGameWin% * 0.2)
 * 
 * Note: The actual calculation is now done in the database view v_team_details.
 * This function is maintained for consistency and any client-side calculations.
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
  
  // Calculate power score using the updated formula with weights that match the database view:
  // - 40% weighted match win percentage
  // - 40% strength of schedule
  // - 20% weighted game win percentage
  const powerScore = (normalizedWinPct * 0.4) + 
                    (normalizedSOS * 0.4) + 
                    (normalizedGameWinPct * 0.2);
  
  // Convert to a 0-100 scale and round to one decimal place
  return Math.round(powerScore * 1000) / 10;
};
