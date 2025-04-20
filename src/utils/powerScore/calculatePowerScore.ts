
/**
 * Calculate the power score based on the weighted formula
 * 40% Weighted Win Percentage
 * 40% Strength of Schedule
 * 20% Weighted Game Win Percentage
 */
export const calculatePowerScore = (
  winPercentage: number, 
  strengthOfSchedule: number, 
  gameWinPercentage: number
): number => {
  // Handle invalid inputs with sensible defaults
  const validWinPct = isNaN(winPercentage) ? 0 : winPercentage;
  const validSOS = isNaN(strengthOfSchedule) ? 0.5 : strengthOfSchedule;
  const validGameWinPct = isNaN(gameWinPercentage) ? 0 : gameWinPercentage;
  
  // Apply the weighted formula: 40/40/20 split
  const powerScore = (validWinPct * 0.4) + (validSOS * 0.4) + (validGameWinPct * 0.2);
  
  // Log for debugging
  console.debug('Power Score Calculation:', {
    winPercentage: validWinPct,
    strengthOfSchedule: validSOS,
    gameWinPercentage: validGameWinPct,
    powerScore
  });
  
  return powerScore * 100; // Convert to 0-100 scale for display
};
