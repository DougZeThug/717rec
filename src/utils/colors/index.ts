
// Main color utilities index file
// Export all color-related utilities from a central location

export * from './powerScoreColors';
export * from './sosColors';
export * from './thresholds';
export * from './divisionColors';
export * from './winPercentageColors';
export * from './championshipColors';
export { getDivisionStyles, getDivisionGradientClass } from '@/styles/design-system/divisions';

// Export format utilities
export const formatPowerScore = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return "N/A";
  return powerScore.toFixed(2);
};
