
// Power score utilities - now using database-calculated values
// The actual power score calculation is now handled in the database view v_team_details
// using the correct 40/40/20 formula (40% Weighted Match Win, 40% SOS, 20% Weighted Game Win)

export const formatPowerScore = (score: number): string => {
  return score.toFixed(1);
};

export const getPowerScoreColor = (score: number): string => {
  // Color coding based on 0-100 scale with proper baselines:
  // Rec perfect season ~60-70, Int perfect ~75-85, Comp perfect ~90-100
  if (score >= 85) return "text-green-600 dark:text-green-500";
  if (score >= 70) return "text-blue-600 dark:text-blue-500"; 
  if (score >= 55) return "text-orange-500 dark:text-orange-400";
  return "text-red-600 dark:text-red-500";
};

// Legacy function kept for compatibility - now just returns the database value
export const calculatePowerScore = (
  wins: number,
  losses: number,
  sos: number,
  divisionWeight: number = 0.85
): number => {
  // This function is deprecated - power scores are now calculated in the database
  // using the correct 40/40/20 weighted formula
  console.warn('calculatePowerScore is deprecated - power scores are now calculated in the database');
  
  // Return a reasonable fallback for teams with no data
  if (wins === 0 && losses === 0) {
    return 50.0; // Baseline for new teams
  }
  
  // For existing data, this should not be used as the database provides the correct value
  return 50.0;
};
