
// Utility functions for color-coding various stats

// Re-export power score utilities from centralized location
export { formatPowerScore, getPowerScoreColor } from '@/utils/colors/powerScoreColors';

// FIXED: Corrected SOS color mapping - higher SOS (harder schedule) = red, lower SOS (easier schedule) = green
export const getSosColor = (sos: number | null | undefined): string => {
  if (sos === null || sos === undefined) {
    return "text-gray-400 dark:text-gray-500";
  }
  
  // Higher SOS means tougher schedule (red), lower means easier (green)
  if (sos >= 0.875) return "text-red-700 dark:text-red-500";      // Very hard schedule
  if (sos >= 0.750) return "text-red-500 dark:text-red-400";      // Hard schedule
  if (sos >= 0.550) return "text-orange-500 dark:text-orange-400"; // Moderate schedule
  return "text-green-600 dark:text-green-500";                    // Easy schedule
};
