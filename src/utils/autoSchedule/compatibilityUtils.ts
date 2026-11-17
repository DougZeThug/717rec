import { getDisplayDivision } from '@/styles/design-system/divisions';
import { AlgorithmConfig, Team } from '@/types';
import { debugLog } from '@/utils/logger';

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
  const {
    wins: t1Wins = 0,
    losses: t1Losses = 0,
    game_wins: t1GameWins = 0,
    game_losses: t1GameLosses = 0,
  } = team1;
  const {
    wins: t2Wins = 0,
    losses: t2Losses = 0,
    game_wins: t2GameWins = 0,
    game_losses: t2GameLosses = 0,
  } = team2;
  const team1WinPct = t1Wins / (t1Wins + t1Losses || 1);
  const team2WinPct = t2Wins / (t2Wins + t2Losses || 1);
  const recordDiff = Math.abs(team1WinPct - team2WinPct);

  // Calculate game record similarity
  const team1GameWinPct = t1GameWins / (t1GameWins + t1GameLosses || 1);
  const team2GameWinPct = t2GameWins / (t2GameWins + t2GameLosses || 1);
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
      normalizedRecordDiff + // Reduced, weight 1.0
      normalizedGameRecordDiff * 0.5); // Reduced

  // Apply tier penalty - cross-tier pairings get heavily penalized
  const finalScore = Math.max(0, baseScore - tierPenalty);

  // Ensure the score is within a reasonable range (0-10)
  return Math.max(0, Math.min(10, finalScore));
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
 * One team's real ratings, as `v_team_details` reports them. A `null` means the view has no
 * value. The scheduler's own Team objects hold placeholders (Power Score 0, SOS 0.5), so the
 * ratings travel in a Map by team id, not on the Team.
 */
export interface TeamRating {
  power_score: number | null;
  sos: number | null;
  wins: number | null;
  losses: number | null;
  game_wins: number | null;
  game_losses: number | null;
}

/** The four admin weights. A missing key gets the default that the old scorer used. */
type QualityWeights = NonNullable<AlgorithmConfig['weights']>;

/** A weight that is not a positive number counts as 0, so it can never push a score out of its band. */
function usableWeight(value: number | undefined, fallback: number): number {
  const weight = value ?? fallback;
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

/** Share of decided results that were won, or null when nothing is decided yet. */
function wonShare(won: number | null, lost: number | null): number | null {
  const total = (won ?? 0) + (lost ?? 0);
  return total > 0 ? (won ?? 0) / total : null;
}

/** Distance between two values, or null when either one is missing or not a real number. */
function distance(first: number | null, second: number | null): number | null {
  if (first === null || second === null) return null;
  const apart = Math.abs(first - second);
  return Number.isFinite(apart) ? apart : null;
}

/**
 * Builds the score function for "Prioritize Match Quality" in Standard mode.
 *
 * Division comes first. The score starts at the division-only score (10 same tier, 5 next tier,
 * 0 blocked) and takes away a tiny amount for the skill gap between the two teams:
 * 0.5 x gap squared, rounded to the nearest 1/256. The gap is 0 to 1, so the amount is 0 to 0.5.
 * A same-tier pair stays in 9.5 to 10 and a next-tier pair in 4.5 to 5. The bands never touch,
 * so skill only decides between choices that have the same division mix. A blocked pair stays 0.
 *
 * The gap is a weighted average of four distances, each from 0 to 1 (Power Score over 100,
 * strength of schedule, win rate, game win rate). A distance is skipped, not counted as 0, when
 * either team has no data for it: Power Score null or 0, or no decided matches. A team that is
 * not in `ratings` has no data at all, so its pairs score as the division-only function does.
 * Whole 1/256 steps keep every sum exact for the matcher.
 */
export function createQualityCompatibility(
  ratings: ReadonlyMap<string, TeamRating>,
  weights: QualityWeights = {}
): (team1: Team, team2: Team) => number {
  // Same defaults as calculateConfigurableCompatibility.
  const powerWeight = usableWeight(weights.powerScoreWeight, 3);
  const sosWeight = usableWeight(weights.sosWeight, 1.5);
  const recordWeight = usableWeight(weights.recordWeight, 2);
  const gameRecordWeight = usableWeight(weights.gameRecordWeight, 1);

  return (team1, team2) => {
    const base = calculateDivisionOnlyCompatibility(team1, team2);
    if (base === 0) return 0;

    const rating1 = ratings.get(team1.id);
    const rating2 = ratings.get(team2.id);
    if (!rating1 || !rating2) return base;

    const record1 = wonShare(rating1.wins, rating1.losses);
    const record2 = wonShare(rating2.wins, rating2.losses);
    const powerDistance = distance(
      rating1.power_score || null, // 0 is a placeholder, not a rating
      rating2.power_score || null
    );

    // Each distance is 0 to 1, or null when a team has no data for it.
    const terms: Array<[weight: number, diff: number | null]> = [
      [powerWeight, powerDistance === null ? null : powerDistance / 100],
      // SOS means nothing before a team has played a decided match.
      [sosWeight, record1 !== null && record2 !== null ? distance(rating1.sos, rating2.sos) : null],
      [recordWeight, distance(record1, record2)],
      [
        gameRecordWeight,
        distance(
          wonShare(rating1.game_wins, rating1.game_losses),
          wonShare(rating2.game_wins, rating2.game_losses)
        ),
      ],
    ];

    let weightedDiff = 0;
    let usedWeight = 0;
    for (const [weight, diff] of terms) {
      if (diff === null) continue;
      weightedDiff += weight * Math.min(1, diff);
      usedWeight += weight;
    }
    const gap = usedWeight > 0 ? weightedDiff / usedWeight : 0;

    return base - Math.round(0.5 * gap * gap * 256) / 256;
  };
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
  const {
    wins: t1Wins = 0,
    losses: t1Losses = 0,
    game_wins: t1GameWins = 0,
    game_losses: t1GameLosses = 0,
  } = team1;
  const {
    wins: t2Wins = 0,
    losses: t2Losses = 0,
    game_wins: t2GameWins = 0,
    game_losses: t2GameLosses = 0,
  } = team2;
  const team1WinPct = t1Wins / (t1Wins + t1Losses || 1);
  const team2WinPct = t2Wins / (t2Wins + t2Losses || 1);
  const recordDiff = Math.abs(team1WinPct - team2WinPct);

  // Game win percentages
  const team1GameWinPct = t1GameWins / (t1GameWins + t1GameLosses || 1);
  const team2GameWinPct = t2GameWins / (t2GameWins + t2GameLosses || 1);
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
