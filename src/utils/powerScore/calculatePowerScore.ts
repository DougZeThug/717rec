
/**
 * DEPRECATED: Power score calculation is now handled in the database
 * The v_team_details view now uses the corrected 40/40/20 formula:
 * - 40% Weighted Match Win Percentage (wins × opponent_weight / total_matches)
 * - 40% Strength of Schedule (average opponent division weight)
 * - 20% Weighted Game Win Percentage (game_wins × opponent_weight / total_games)
 */
export const calculatePowerScore = (
  winPercentage: number, 
  strengthOfSchedule: number, 
  gameWinPercentage: number
): number => {
  console.warn('calculatePowerScore is deprecated - power scores are now calculated in the database using corrected weighted formulas');
  
  // Fallback calculation for edge cases (should not be used in normal operation)
  const validWinPct = isNaN(winPercentage) ? 0 : winPercentage;
  const validSOS = isNaN(strengthOfSchedule) ? 0.5 : strengthOfSchedule;
  const validGameWinPct = isNaN(gameWinPercentage) ? 0 : gameWinPercentage;
  
  // Simple 40/40/20 split for fallback
  const powerScore = (validWinPct * 0.4) + (validSOS * 0.4) + (validGameWinPct * 0.2);
  
  return powerScore * 100; // Convert to 0-100 scale for display
};
