/**
 * Power Score Source Types
 * 
 * Different data sources return power scores on different scales:
 * - v_team_details: 0-100 scale (already normalized)
 * - team_season_stats: 0-1 scale (needs multiplication by 100)
 * - calculated: 0-100 scale (from career calculations)
 * - raw_0_100: Explicit 0-100 scale input
 */
export type PowerScoreSource = 
  | 'v_team_details'     // 0-100 scale
  | 'team_season_stats'  // 0-1 scale
  | 'calculated'         // 0-100 scale (from career calculations)
  | 'raw_0_100';         // Explicit 0-100

/**
 * Normalizes a power score to the 0-100 scale based on its source.
 * 
 * @param score - The raw power score value
 * @param source - The data source indicating the original scale
 * @returns The normalized score on a 0-100 scale, or null if input is null/undefined
 * 
 * @example
 * // From v_team_details (already 0-100)
 * normalizePowerScore(65.5, 'v_team_details') // returns 65.5
 * 
 * @example
 * // From team_season_stats (0-1 scale)
 * normalizePowerScore(0.655, 'team_season_stats') // returns 65.5
 */
export const normalizePowerScore = (
  score: number | null | undefined, 
  source: PowerScoreSource
): number | null => {
  if (score === null || score === undefined) return null;
  
  switch (source) {
    case 'team_season_stats':
      return score * 100; // Convert 0-1 to 0-100
    case 'v_team_details':
    case 'calculated':
    case 'raw_0_100':
    default:
      return score; // Already 0-100
  }
};
