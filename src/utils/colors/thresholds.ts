
/**
 * Shared threshold values for rankings and power scores
 */
export const powerScoreThresholds = {
  excellent: 75, // Green (good)
  good: 60,      // Blue (above average)
  average: 40,   // Orange (average)
  // below average is anything under average (red)
};

/**
 * Threshold values for strength of schedule (SOS)
 * Note: For SOS, higher values indicate a harder schedule (red),
 * lower values indicate an easier schedule (green)
 */
export const sosThresholds = {
  veryHard: 0.875, // Red (very difficult schedule)
  hard: 0.750,     // Orange-red (difficult schedule)
  moderate: 0.550, // Orange (moderate difficulty)
  // easy is anything under moderate (green)
};
