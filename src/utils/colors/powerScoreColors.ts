
// Power score color utilities for the corrected 0-100 scale
// Now properly aligned with the 40/40/20 database calculation

export const formatPowerScore = (score: number): string => {
  return score.toFixed(1);
};

export const getPowerScoreColor = (score: number): string => {
  // Updated color thresholds for the corrected 0-100 scale:
  // - Perfect Competitive teams: ~90-100 (green)
  // - Perfect Intermediate teams: ~75-85 (blue)  
  // - Perfect Recreational teams: ~60-70 (orange)
  // - Below average performance: <55 (red)
  
  if (score >= 85) return "text-green-600 dark:text-green-500";
  if (score >= 70) return "text-blue-600 dark:text-blue-500";
  if (score >= 55) return "text-orange-500 dark:text-orange-400";
  return "text-red-600 dark:text-red-500";
};

export const getPowerScoreBackgroundColor = (score: number): string => {
  if (score >= 85) return "bg-green-100 dark:bg-green-900/20";
  if (score >= 70) return "bg-blue-100 dark:bg-blue-900/20";
  if (score >= 55) return "bg-orange-100 dark:bg-orange-900/20";
  return "bg-red-100 dark:bg-red-900/20";
};

export const getPowerScoreBorderColor = (score: number): string => {
  if (score >= 85) return "border-green-300 dark:border-green-700";
  if (score >= 70) return "border-blue-300 dark:border-blue-700";
  if (score >= 55) return "border-orange-300 dark:border-orange-700";
  return "border-red-300 dark:border-red-700";
};

// Power score interpretation helper
export const getPowerScoreDescription = (score: number): string => {
  if (score >= 90) return "Elite Performance";
  if (score >= 85) return "Excellent";
  if (score >= 75) return "Very Good";
  if (score >= 65) return "Above Average";
  if (score >= 55) return "Average";
  if (score >= 45) return "Below Average";
  return "Needs Improvement";
};
