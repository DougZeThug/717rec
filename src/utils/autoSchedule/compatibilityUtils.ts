import { checkTeamsEverPlayed } from '@/services/matches/MatchReadService';
import { getDisplayDivision } from '@/styles/design-system/divisions';
import { Team } from '@/types';
import { debugLog, errorLog } from '@/utils/logger';

import { getCachedCompatibilityScore, getCachedMatchHistory } from './cachingUtils';

/**
 * Get tier distance between two teams (0 = same tier, 1 = adjacent, 2 = extreme)
 */
function getTierDistance(team1: Team, team2: Team): number {
  // Extract tiers from division names
  const tier1 = getDisplayDivision(team1.divisionName || team1.division || '');
  const tier2 = getDisplayDivision(team2.divisionName || team2.division || '');

  // Map tiers to numeric values for distance calculation
  const tierMap: Record<string, number> = {
    Competitive: 2,
    Intermediate: 1,
    Recreational: 0,
  };

  const tier1Value = tierMap[tier1] ?? 0;
  const tier2Value = tierMap[tier2] ?? 0;

  return Math.abs(tier1Value - tier2Value);
}

/**
 * Calculate compatibility score between two teams
 * Higher score means better match (more evenly matched)
 * Tier penalties: Same tier (8-10), One tier diff (4-6), Two tier diff (0-2)
 */
export function calculateTeamCompatibility(team1: Team, team2: Team): number {
  // Calculate tier distance and penalty
  const tierDistance = getTierDistance(team1, team2);
  const tierPenalty = tierDistance === 0 ? 0 : tierDistance === 1 ? 4 : 8;

  // Compare power scores - closer power scores are better matches
  const powerScoreDiff = Math.abs((team1.power_score || 0) - (team2.power_score || 0));

  // Compare strength of schedule - closer SOS values are better matches
  const sosDiff = Math.abs((team1.sos || 0.5) - (team2.sos || 0.5));

  // Calculate record similarity - teams with similar records are better matches
  const team1WinPct = team1.wins / (team1.wins + team1.losses || 1);
  const team2WinPct = team2.wins / (team2.wins + team2.losses || 1);
  const recordDiff = Math.abs(team1WinPct - team2WinPct);

  // Calculate game record similarity
  const team1GameWinPct = team1.game_wins / (team1.game_wins + team1.game_losses || 1);
  const team2GameWinPct = team2.game_wins / (team2.game_wins + team2.game_losses || 1);
  const gameRecordDiff = Math.abs(team1GameWinPct - team2GameWinPct);

  // Calculate weighted compatibility score (lower differences = higher compatibility)
  // Normalize each factor to a 0-1 scale before weighting
  const normalizedPowerScoreDiff = Math.min(1, powerScoreDiff / 100);
  const normalizedSosDiff = Math.min(1, sosDiff);
  const normalizedRecordDiff = Math.min(1, recordDiff);
  const normalizedGameRecordDiff = Math.min(1, gameRecordDiff);

  // Reduced weights to make room for tier penalties
  const baseScore =
    10 -
    (normalizedPowerScoreDiff * 1.5 + // Reduced to accommodate tier penalties
      normalizedSosDiff * 0.75 + // Reduced
      normalizedRecordDiff * 1 + // Reduced
      normalizedGameRecordDiff * 0.5); // Reduced

  // Apply tier penalty - cross-tier pairings get heavily penalized
  const finalScore = Math.max(0, baseScore - tierPenalty);

  // Ensure the score is within a reasonable range (0-10)
  return Math.max(0, Math.min(10, finalScore));
}

/**
 * Get cached or freshly calculated compatibility score
 */
export function getCompatibilityScore(team1: Team, team2: Team): number {
  return getCachedCompatibilityScore(team1, team2, calculateTeamCompatibility);
}

/**
 * Check if two teams have played each other before
 */
export async function haveTeamsPlayed(team1Id: string, team2Id: string): Promise<boolean> {
  return getCachedMatchHistory(team1Id, team2Id, checkTeamsPlayedHistory);
}

/**
 * Database query to check if teams have played before — delegates to MatchReadService
 */
async function checkTeamsPlayedHistory(team1Id: string, team2Id: string): Promise<boolean> {
  try {
    return await checkTeamsEverPlayed(team1Id, team2Id);
  } catch (error) {
    errorLog('Error in checkTeamsPlayedHistory:', error);
    // Return false as a fallback to avoid blocking match generation
    return false;
  }
}

/**
 * Simple division-only compatibility calculation
 * Returns predictable scores based solely on division tiers:
 * - Same division: 10
 * - Adjacent divisions: 5
 * - Extreme difference (T1-T3): 0
 */
export function calculateDivisionOnlyCompatibility(team1: Team, team2: Team): number {
  const tierDistance = getTierDistance(team1, team2);

  debugLog(
    `Division compatibility: ${team1.name} (${team1.divisionName || team1.division}) vs ${team2.name} (${team2.divisionName || team2.division}) - Distance: ${tierDistance}`
  );

  // Simple scoring based on tier distance
  if (tierDistance === 0) {
    return 10; // Same division - perfect match
  } else if (tierDistance === 1) {
    return 5; // Adjacent divisions - decent match
  } else {
    return 0; // Extreme difference - blocked/poor match
  }
}

/**
 * Enhanced compatibility calculation with configurable parameters
 * @deprecated Use calculateDivisionOnlyCompatibility for simpler, more predictable results
 */
export function calculateConfigurableCompatibility(
  team1: Team,
  team2: Team,
  config: {
    powerScoreWeight?: number;
    sosWeight?: number;
    recordWeight?: number;
    gameRecordWeight?: number;
    tierPenalty?: { sameTier?: number; oneTierDiff?: number; twoTierDiff?: number };
  } = {}
): number {
  // Calculate tier distance and penalty using configurable values
  const tierDistance = getTierDistance(team1, team2);
  const defaultPenalties = { sameTier: 0, oneTierDiff: 4, twoTierDiff: 8 };
  const penalties = { ...defaultPenalties, ...config.tierPenalty };

  const tierPenalty =
    tierDistance === 0
      ? penalties.sameTier
      : tierDistance === 1
        ? penalties.oneTierDiff
        : penalties.twoTierDiff;

  // Default weights (adjusted to accommodate division weight)
  const weights = {
    powerScore: config.powerScoreWeight ?? 3,
    sos: config.sosWeight ?? 1.5,
    record: config.recordWeight ?? 2,
    gameRecord: config.gameRecordWeight ?? 1,
  };

  // Calculate differences
  const powerScoreDiff = Math.abs((team1.power_score || 0) - (team2.power_score || 0));
  const sosDiff = Math.abs((team1.sos || 0.5) - (team2.sos || 0.5));

  // Win percentages
  const team1WinPct = team1.wins / (team1.wins + team1.losses || 1);
  const team2WinPct = team2.wins / (team2.wins + team2.losses || 1);
  const recordDiff = Math.abs(team1WinPct - team2WinPct);

  // Game win percentages
  const team1GameWinPct = team1.game_wins / (team1.game_wins + team1.game_losses || 1);
  const team2GameWinPct = team2.game_wins / (team2.game_wins + team2.game_losses || 1);
  const gameRecordDiff = Math.abs(team1GameWinPct - team2GameWinPct);

  // Normalize and weight
  const normalizedPowerScoreDiff = Math.min(1, powerScoreDiff / 100);
  const normalizedSosDiff = Math.min(1, sosDiff);
  const normalizedRecordDiff = Math.min(1, recordDiff);
  const normalizedGameRecordDiff = Math.min(1, gameRecordDiff);

  // Calculate base score from performance metrics
  const baseScore =
    10 -
    (normalizedPowerScoreDiff * weights.powerScore +
      normalizedSosDiff * weights.sos +
      normalizedRecordDiff * weights.record +
      normalizedGameRecordDiff * weights.gameRecord);

  // Apply tier penalty - cross-tier pairings get heavily penalized
  const finalScore = Math.max(0, baseScore - tierPenalty);

  // Ensure the score is within a reasonable range (0-10)
  return Math.max(0, Math.min(10, finalScore));
}
