
// Power score color utilities for the corrected 0-100 scale
// Now properly aligned with the 40/45/15 database calculation

// Power score utilities - expects 0-100 scale input (database view returns 0-100)

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
  
  // Score is already on 0-100 scale from v_team_details view
  // Enhanced 8-tier color system for better differentiation:
  // - Elite/Championship (85+): Gold
  // - Excellent (70-84): Green  
  // - Strong (60-69): Blue
  // - Average (50-59): Orange
  // - Below Average (40-49): Amber
  // - Poor (30-39): Pink
  // - Struggling (20-29): Purple
  // - Critical (<20): Red
  
  if (score >= 85) return "text-yellow-600 dark:text-yellow-500";   // Elite/Championship
  if (score >= 70) return "text-green-600 dark:text-green-500";    // Excellent
  if (score >= 60) return "text-blue-600 dark:text-blue-500";     // Strong
  if (score >= 50) return "text-orange-500 dark:text-orange-400"; // Average
  if (score >= 40) return "text-amber-600 dark:text-amber-500";   // Below Average
  if (score >= 30) return "text-pink-600 dark:text-pink-500";     // Poor
  if (score >= 20) return "text-purple-600 dark:text-purple-500"; // Struggling
  return "text-red-600 dark:text-red-500";                        // Critical
};

export const getPowerScoreBackgroundColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) {
    return "bg-gray-100 dark:bg-gray-900/20";
  }
  
  // Score is already on 0-100 scale
  if (score >= 85) return "bg-yellow-100 dark:bg-yellow-900/20";   // Elite/Championship
  if (score >= 70) return "bg-green-100 dark:bg-green-900/20";    // Excellent
  if (score >= 60) return "bg-blue-100 dark:bg-blue-900/20";     // Strong
  if (score >= 50) return "bg-orange-100 dark:bg-orange-900/20"; // Average
  if (score >= 40) return "bg-amber-100 dark:bg-amber-900/20";   // Below Average
  if (score >= 30) return "bg-pink-100 dark:bg-pink-900/20";     // Poor
  if (score >= 20) return "bg-purple-100 dark:bg-purple-900/20"; // Struggling
  return "bg-red-100 dark:bg-red-900/20";                        // Critical
};

export const getPowerScoreBorderColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) {
    return "border-gray-300 dark:border-gray-700";
  }
  
  // Score is already on 0-100 scale
  if (score >= 85) return "border-yellow-300 dark:border-yellow-700";   // Elite/Championship
  if (score >= 70) return "border-green-300 dark:border-green-700";    // Excellent
  if (score >= 60) return "border-blue-300 dark:border-blue-700";     // Strong
  if (score >= 50) return "border-orange-300 dark:border-orange-700"; // Average
  if (score >= 40) return "border-amber-300 dark:border-amber-700";   // Below Average
  if (score >= 30) return "border-pink-300 dark:border-pink-700";     // Poor
  if (score >= 20) return "border-purple-300 dark:border-purple-700"; // Struggling
  return "border-red-300 dark:border-red-700";                        // Critical
};

// Power score interpretation helper
export const getPowerScoreDescription = (score: number | null | undefined): string => {
  if (score === null || score === undefined) {
    return "No Data";
  }
  
  // Score is already on 0-100 scale
  if (score >= 85) return "Elite Performance";     // Championship level
  if (score >= 70) return "Excellent";            // Strong competitive
  if (score >= 60) return "Very Good";            // Above average
  if (score >= 50) return "Average";              // Solid performance
  if (score >= 40) return "Below Average";        // Needs improvement
  if (score >= 30) return "Poor";                 // Struggling
  if (score >= 20) return "Struggling";           // Critical issues
  return "Critical Performance";                  // Bottom tier
};
