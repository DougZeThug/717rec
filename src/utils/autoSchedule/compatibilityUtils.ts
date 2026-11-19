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

/** Score of two teams from neighbouring divisions, before any skill cut. */
const ADJACENT_DIVISION_SCORE = 5;

/** The most that a skill gap can take off a pair's score: 0.5 x gap squared, with a gap of 0 to 1. */
const MAX_SKILL_CUT = 0.5;

/**
 * The skill cut is rounded to whole steps of 1/SKILL_STEPS_PER_UNIT (1/1024). A weighted gap needs
 * to be 1/32 (about 3.1%) or more to count for one step. Keep this a power of two: the matcher
 * only adds, subtracts, doubles and halves the scores, and those stay exact. A finer step is this
 * one number.
 */
export const SKILL_STEPS_PER_UNIT = 1024;

/**
 * The lowest score a pair from neighbouring divisions can get (5 minus the largest skill cut).
 * A pair below this can only be forbidden (0), so the batch preview counts only those and
 * rematches in its red Warnings badge. A neighbouring-division pair is not counted there.
 */
export const LOWEST_NEIGHBOURING_DIVISION_SCORE = ADJACENT_DIVISION_SCORE - MAX_SKILL_CUT;

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
    return ADJACENT_DIVISION_SCORE; // Adjacent divisions - decent match
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
 * For each pair the division score counts first. The score starts at the division-only score
 * (10 same tier, 5 next tier, 0 blocked) and takes away a small amount for the skill gap between
 * the two teams: 0.5 x gap squared, rounded to the nearest 1/1024. A gap under 1/32 (about 3.1%)
 * rounds to nothing. The gap is 0 to 1, so the amount is 0 to 0.5. A same-tier pair stays in
 * 9.5 to 10 and a next-tier pair in 4.5 to 5, so the two bands do not overlap. A blocked pair
 * stays 0. The skill term comes off every pair, so it also sways the choice between cross-division
 * pairings.
 *
 * With the switch ON, standardPairing.ts asks each round to pair as many teams as it can first
 * (`preferFullRounds`), then to take the best division total, then the best skill. For blocks of
 * 20 or more teams the skill terms of one round could add up past one division step (5). That is
 * not guarded. Real block sizes are UNKNOWN.
 *
 * The gap is a weighted average of four distances, each from 0 to 1 (Power Score over 100,
 * strength of schedule, win rate, game win rate). A distance is skipped, not counted as 0, when
 * either team has no data for it: Power Score null or 0, or no decided matches. A team that is
 * not in `ratings` has no data at all, so its pairs score as the division-only function does.
 * Whole 1/1024 steps keep every sum exact for the matcher.
 */
export function createQualityCompatibility(
  ratings: ReadonlyMap<string, TeamRating>,
  weights: QualityWeights = {}
): (team1: Team, team2: Team) => number {
  // Default weights: Power Score 3, SOS 1.5, record 2, game record 1. The quality test pins them.
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

    return (
      base - Math.round(MAX_SKILL_CUT * gap * gap * SKILL_STEPS_PER_UNIT) / SKILL_STEPS_PER_UNIT
    );
  };
}

/**
 * The score as the batch preview prints it. From 5 up it has one decimal, as it always had. Below
 * 5 it is cut (not rounded) to two decimals, so a neighbouring-division pair that scores 4.996
 * reads 4.99 and never "5.0". A trailing zero is dropped (4.5, not 4.50), and 0 reads 0.0.
 */
export function formatCompatibilityScore(score: number): string {
  if (score >= ADJACENT_DIVISION_SCORE) return score.toFixed(1);

  // The small add-on stops 4.6 * 100 = 459.99999999999994 from being cut to 4.59. The cap keeps a
  // score that is a hair under 5 from reaching 5.00. Real scores are whole 1/1024 steps, which
  // times 100 are exact, so neither guard changes them.
  const hundredths = Math.min(499, Math.floor(score * 100 + 1e-9));
  return (hundredths / 100).toFixed(2).replace(/0$/, '');
}
