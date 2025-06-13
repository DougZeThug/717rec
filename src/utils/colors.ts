
// Utility functions for color-coding various stats

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
  
  // Color coding based on 0-100 scale
  if (score >= 70) return "text-green-600 dark:text-green-500";   // Elite performance
  if (score >= 60) return "text-blue-600 dark:text-blue-500";    // Strong performance
  if (score >= 50) return "text-orange-500 dark:text-orange-400"; // Average performance
  return "text-red-600 dark:text-red-500";                       // Below average
};

export const getSosColor = (sos: number | null | undefined): string => {
  if (sos === null || sos === undefined) {
    return "text-gray-400 dark:text-gray-500";
  }
  
  if (sos >= 0.75) return "text-green-600 dark:text-green-500";
  if (sos >= 0.60) return "text-blue-600 dark:text-blue-500";
  if (sos >= 0.40) return "text-orange-500 dark:text-orange-400";
  return "text-red-600 dark:text-red-500";
};
