// Main color utilities index file
// Export all color-related utilities from a central location

export * from './championshipColors';
export * from './divisionColors';
export * from './divisionHexColors';
export * from './powerScoreColors';
export * from './sosColors';
export * from './sweepRateColors';
export * from './teamColors';
export * from './thresholds';
export * from './trendColors';
export * from './winPercentageColors';
export { getDivisionGradientClass, getDivisionStyles } from '@/styles/design-system/divisions';

// Export format utilities
export const formatPowerScore = (powerScore: number | undefined): string => {
  if (powerScore === undefined) return 'N/A';
  return powerScore.toFixed(2);
};
