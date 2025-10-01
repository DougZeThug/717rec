
// Power score utilities - now handling NULL values for teams with no matches
// Teams with 0 wins and 0 losses will have NULL power scores instead of 50.0
// The power score calculation is handled in v_team_details using the 40/45/15 formula:
// - 40% Weighted Match Win % = (wins × opponent_weights) / total_matches
// - 45% Strength of Schedule = average opponent division weight  
// - 15% Weighted Game Win % = (game_wins × opponent_weights) / total_games

// Re-export power score utilities from centralized location
export { formatPowerScore, getPowerScoreColor } from '@/utils/colors/powerScoreColors';

// Deprecated function - power scores are now calculated correctly in the database
export const calculatePowerScore = (
  wins: number,
  losses: number,
  sos: number,
  divisionWeight: number = 0.85
): number => {
  console.warn('calculatePowerScore is deprecated - power scores are now calculated in the database using corrected weighted formulas');
  
  // Return baseline for teams with no data
  if (wins === 0 && losses === 0) {
    return 50.0; // Baseline for new teams
  }
  
  // Database provides the correct value using fixed weighted formulas
  return 50.0;
};
