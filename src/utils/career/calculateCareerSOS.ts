import { SeasonStats } from './types';

/**
 * Calculates career Strength of Schedule as a weighted average of season SOS values.
 * Weights each season by the number of matches played.
 */
export const calculateCareerSOS = (seasonStats: SeasonStats[] | null): number => {
  const DEFAULT_SOS = 0.5;

  if (!seasonStats || seasonStats.length === 0) {
    return DEFAULT_SOS;
  }

  let totalWeightedSOS = 0;
  let totalMatches = 0;

  for (const season of seasonStats) {
    const seasonMatches = (season.match_wins || 0) + (season.match_losses || 0);
    if (seasonMatches > 0 && season.sos !== null && season.sos !== undefined) {
      totalWeightedSOS += season.sos * seasonMatches;
      totalMatches += seasonMatches;
    }
  }

  if (totalMatches === 0) {
    return DEFAULT_SOS;
  }

  return totalWeightedSOS / totalMatches;
};
