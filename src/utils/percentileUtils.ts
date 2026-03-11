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
  higherIsBetter: boolean = true
): PercentileResult {
  const total = allValues.length;
  if (total === 0) {
    return { value, percentile: 0, rank: 0, total: 0 };
  }

  // Sort values in the appropriate direction
  const sorted = [...allValues].sort((a, b) => (higherIsBetter ? b - a : a - b));

  // Find rank (1-indexed)
  const rank = sorted.findIndex((v) => v === value) + 1;

  // Calculate percentile: how many teams are below this one
  const teamsBelow = total - rank;
  const percentile = Math.round((teamsBelow / (total - 1)) * 100) || 0;

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
export function formatOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * Get display text for percentile (e.g., "Top 5%", "85th")
 */
export function formatPercentileText(percentile: number, _rank?: number, _total?: number): string {
  if (percentile >= 90) {
    return `Top ${100 - percentile}%`;
  }
  if (percentile >= 50) {
    return `${percentile}th`;
  }
  return `${percentile}th`;
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

/**
 * Batch calculate percentiles for all teams for a specific stat
 */
export function calculateAllPercentiles(
  teams: { id: string; value: number }[],
  higherIsBetter: boolean = true
): Map<string, PercentileResult> {
  const values = teams.map((t) => t.value);
  const result = new Map<string, PercentileResult>();

  for (const team of teams) {
    result.set(team.id, calculatePercentile(team.value, values, higherIsBetter));
  }

  return result;
}
