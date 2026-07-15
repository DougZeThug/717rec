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
