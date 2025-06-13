
// Power score utilities - now handling NULL values for teams with no matches
// Teams with 0 wins and 0 losses will have NULL power scores instead of 50.0
// The power score calculation is handled in v_team_details using the CORRECTED 40/40/20 formula:
// - 40% Weighted Match Win % = (wins × opponent_weights) / total_matches (FIXED)
// - 40% Strength of Schedule = average opponent division weight  
// - 20% Weighted Game Win % = (game_wins × opponent_weights) / total_games (FIXED)

export const formatPowerScore = (score: number | null | undefined): string => {
  if (score === null || score === undefined) {
    return "N/A";
  }
  return score.toFixed(1);
};

export const getPowerScoreColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) {
    return "text-gray-400 dark:text-gray-500"; // Neutral color for no data
  }
  
  // Color coding based on 0-100 scale with corrected baselines:
  // After fix: Rec teams ~35-55, Int teams ~45-65, Comp teams ~55-85
  if (score >= 70) return "text-green-600 dark:text-green-500";   // Elite performance
  if (score >= 60) return "text-blue-600 dark:text-blue-500";    // Strong performance
  if (score >= 50) return "text-orange-500 dark:text-orange-400"; // Average performance
  return "text-red-600 dark:text-red-500";                       // Below average
};

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
