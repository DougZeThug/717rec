
/**
 * Calculate and format a power score based on team performance metrics
 * 
 * @param winPercentage - Team win percentage (as a decimal, e.g. 0.75)
 * @param sos - Strength of schedule
 * @param gameWinPercentage - Team's game win percentage (as a decimal)
 * @returns Formatted power score with one decimal place
 */
export const calculatePowerScore = (
  winPercentage: number, 
  sos: number = 0,
  gameWinPercentage: number = 0
): number => {
  // Base formula: 50 points for win percentage, 25 for SOS, 25 for game win percentage
  const baseScore = (winPercentage * 100) * 0.5;
  const sosScore = sos * 25;
  const gameScore = (gameWinPercentage * 100) * 0.25;
  
  return Number((baseScore + sosScore + gameScore).toFixed(1));
};

/**
 * Format power score to one decimal place for display
 */
export const formatPowerScore = (score: number | undefined): string => {
  if (score === undefined) return "—";
  return score.toFixed(1);
};

/**
 * Get color class based on power score value
 */
export const getPowerScoreColor = (score: number | undefined): string => {
  if (score === undefined) return "text-slate-600";
  
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-indigo-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
};
