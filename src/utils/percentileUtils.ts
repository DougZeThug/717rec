/**
 * Percentile calculation utilities for league-wide rankings
 */

export interface PercentileResult {
  value: number;
  percentile: number;
  rank: number;
  total: number;
}

/**
 * Calculate percentile for a value within a sorted array
 * Higher percentile = better (top 5% means 95th percentile)
 */
export function calculatePercentile(
  value: number,
  allValues: number[],
  higherIsBetter = true
): PercentileResult {
  const total = allValues.length;
  if (total === 0) {
    return { value, percentile: 0, rank: 0, total: 0 };
  }

  // Count how many values are strictly better than this one
  const above = allValues.filter((v) => (higherIsBetter ? v > value : v < value)).length;
  const rank = above + 1;

  // Count how many values are strictly worse
  const below = allValues.filter((v) => (higherIsBetter ? v < value : v > value)).length;
  const percentile = total > 1 ? Math.round((below / (total - 1)) * 100) : 100;

  return {
    value,
    percentile: Math.min(100, Math.max(0, percentile)),
    rank,
    total,
  };
}

/**
 * Format a number as an ordinal (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(rank: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const lastTwoDigits = rank % 100;
  return rank + (suffixes[(lastTwoDigits - 20) % 10] || suffixes[lastTwoDigits] || suffixes[0]);
}

/**
 * Get the display tier based on percentile
 */
export type PercentileTier = 'elite' | 'strong' | 'average' | 'below' | 'weak';

export function getPercentileTier(percentile: number): PercentileTier {
  if (percentile >= 90) return 'elite';
  if (percentile >= 75) return 'strong';
  if (percentile >= 50) return 'average';
  if (percentile >= 25) return 'below';
  return 'weak';
}
