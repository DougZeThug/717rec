/**
 * Shared threshold values for rankings and power scores
 */
export const powerScoreThresholds = {
  excellent: 75, // Green (good)
  good: 60, // Blue (above average)
  average: 40, // Orange (average)
  // below average is anything under average (red)
};

/**
 * Threshold values for strength of schedule (SOS)
 * Note: For SOS, higher values indicate a harder schedule (red),
 * lower values indicate an easier schedule (green)
 */
export const sosThresholds = {
  veryHard: 0.875, // Red (very difficult schedule)
  hard: 0.75, // Orange-red (difficult schedule)
  moderate: 0.55, // Orange (moderate difficulty)
  // easy is anything under moderate (green)
};

/**
 * Threshold values for win percentage (0-1 scale)
 */
export const winPercentageThresholds = {
  excellent: 0.75, // Green (75%+)
  good: 0.6, // Blue (60-74%)
  average: 0.45, // Orange (45-59%)
  // below average is anything under 45% (red)
};

/**
 * Threshold values for championship counts
 */
export const championshipThresholds = {
  multiple: 3, // Gold highlighting for 3+ championships
  single: 1, // Silver highlighting for 1-2 championships
  // zero championships get no special highlighting
};

/**
 * Threshold values for sweep rate (percentage 0-100)
 * Higher sweep rate indicates more dominant performance
 */
export const sweepRateThresholds = {
  elite: 70, // Gold (elite dominance)
  excellent: 55, // Green (excellent performance)
  good: 40, // Blue (good performance)
  average: 25, // Orange (average)
  // below average is anything under 25% (red)
};
