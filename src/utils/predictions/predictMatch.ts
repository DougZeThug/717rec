/**
 * Match Prediction Utility
 *
 * A simple, honest heuristic for predicting match outcomes.
 * This is NOT a sophisticated ML model - it's a transparent calculation
 * using existing metrics: Power Score, SOS, and Division Weight.
 *
 * The prediction is deterministic and designed to be variance-tolerant
 * for a recreational volleyball league where upsets are common.
 */

// ============= Types =============

export interface TeamStats {
  power_score: number | null;
  sos: number | null;
  division_id: string | null;
}

export interface PredictionBreakdown {
  powerScoreA: number;
  powerScoreB: number;
  sosA: number;
  sosB: number;
  divisionWeightA: number;
  divisionWeightB: number;
  teamRatingA: number;
  teamRatingB: number;
  ratingDiff: number;
}

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export interface PredictionResult {
  /** Win probability for Team A (0-1) */
  probA: number;
  /** Win probability for Team B (0-1) */
  probB: number;
  /** Human-readable outcome text */
  expectedText: string;
  /** Confidence level based on probability distance from 50% */
  confidence: ConfidenceLevel;
  /** Detailed breakdown of all inputs used */
  breakdown: PredictionBreakdown;
}

// ============= Constants =============

/**
 * Weights for combining stats into a single team rating.
 * Power Score is the primary driver (normalized to 0-1 range from 0-100).
 *
 * Power Score: Already incorporates win%, SOS, and game win% (40/45/15 formula in DB)
 *   - It's the most comprehensive single metric, so it gets the highest weight
 *
 * SOS (Strength of Schedule): Average opponent division weight (typically 0.5-1.2)
 *   - Provides context about how tough the team's schedule has been
 *   - Lower weight since it's already factored into Power Score
 *
 * Division Weight: Reflects tier strength (0.7-1.3 typical range)
 *   - Higher divisions tend to have stronger teams
 *   - Modest weight as a tie-breaker
 */
const WEIGHT_POWER_SCORE = 0.70; // Power score is the dominant factor
const WEIGHT_SOS = 0.15;         // SOS adds schedule context
const WEIGHT_DIVISION = 0.15;    // Division tier as a secondary factor

/**
 * Default values when stats are missing
 */
const DEFAULT_POWER_SCORE = 50;  // Middle of 0-100 range
const DEFAULT_SOS = 0.85;        // League-wide average SOS
const DEFAULT_DIVISION_WEIGHT = 0.85; // Reasonable default tier

/**
 * Logistic function scaling parameter (k)
 * This determines how quickly probabilities move away from 50%.
 *
 * With rating differences typically in the 0-0.4 range:
 * - k=5: Modest differences (0.1) -> ~62% favorite
 * - k=5: Large differences (0.3) -> ~82% favorite
 *
 * We want to allow lopsided odds (85-15 is fine) but not be overconfident.
 */
const LOGISTIC_K = 5;

/**
 * Upset threshold: if winner had <= this probability, it's an upset
 */
export const UPSET_THRESHOLD = 0.30;

// ============= Helper Functions =============

/**
 * Sigmoid/logistic function for converting rating difference to probability
 * Returns value in (0, 1) - never exactly 0 or 1 for numeric stability
 */
function logistic(x: number): number {
  // Clamp extreme values for numeric stability
  const clampedX = Math.max(-10, Math.min(10, x));
  return 1 / (1 + Math.exp(-clampedX));
}

/**
 * Normalize Power Score from 0-100 to 0-1 range
 */
function normalizePowerScore(ps: number | null): number {
  const score = ps ?? DEFAULT_POWER_SCORE;
  return Math.max(0, Math.min(100, score)) / 100;
}

/**
 * Scale SOS to be comparable to other inputs (0-1 range)
 * SOS typically ranges from 0.5 to 1.2, center around 0.85
 */
function scaleSOS(sos: number | null): number {
  const value = sos ?? DEFAULT_SOS;
  // Map 0.5-1.2 to roughly 0-1 range, centered at 0.5
  return Math.max(0, Math.min(1, (value - 0.35) / 0.85));
}

/**
 * Scale Division Weight to 0-1 range
 * Division weights typically range from 0.7 to 1.3
 */
function scaleDivisionWeight(dw: number): number {
  // Map 0.5-1.5 to 0-1 range
  return Math.max(0, Math.min(1, (dw - 0.5) / 1.0));
}

/**
 * Calculate team rating from normalized components
 */
function calculateTeamRating(
  normalizedPowerScore: number,
  scaledSOS: number,
  scaledDivisionWeight: number
): number {
  return (
    normalizedPowerScore * WEIGHT_POWER_SCORE +
    scaledSOS * WEIGHT_SOS +
    scaledDivisionWeight * WEIGHT_DIVISION
  );
}

/**
 * Determine confidence level based on probability distance from 50%
 */
function getConfidence(probA: number): ConfidenceLevel {
  const distanceFrom50 = Math.abs(probA - 0.5);

  // 50-56% = Low confidence (near coin flip)
  if (distanceFrom50 < 0.06) return 'Low';

  // 56-65% = Medium confidence (clear but not dominant favorite)
  if (distanceFrom50 < 0.15) return 'Medium';

  // 65%+ = High confidence (strong favorite)
  return 'High';
}

/**
 * Generate expected outcome text
 */
function getExpectedText(probA: number, teamAName: string, teamBName: string): string {
  const distanceFrom50 = Math.abs(probA - 0.5);

  // Within 3% of 50% = coin flip
  if (distanceFrom50 < 0.03) {
    return 'Near coin flip';
  }

  const favored = probA > 0.5 ? teamAName : teamBName;
  const favoredProb = probA > 0.5 ? probA : 1 - probA;

  // 70%+ = strongly favored
  if (favoredProb >= 0.70) {
    return `${favored} strongly favored`;
  }

  return `${favored} favored`;
}

// ============= Main Prediction Function =============

/**
 * Predict match outcome between two teams
 *
 * @param teamAStats - Stats for Team A (power_score, sos, division_id)
 * @param teamBStats - Stats for Team B (power_score, sos, division_id)
 * @param divisionWeights - Map of division_id to division_weight (from cache)
 * @param teamAName - Display name for Team A (for outcome text)
 * @param teamBName - Display name for Team B (for outcome text)
 * @returns Prediction result with probabilities, text, confidence, and breakdown
 */
export function predictMatch(
  teamAStats: TeamStats,
  teamBStats: TeamStats,
  divisionWeights: Map<string, number>,
  teamAName: string = 'Team A',
  teamBName: string = 'Team B'
): PredictionResult {
  // Get raw values with defaults
  const powerScoreA = teamAStats.power_score ?? DEFAULT_POWER_SCORE;
  const powerScoreB = teamBStats.power_score ?? DEFAULT_POWER_SCORE;
  const sosA = teamAStats.sos ?? DEFAULT_SOS;
  const sosB = teamBStats.sos ?? DEFAULT_SOS;

  // Look up division weights
  const divisionWeightA = teamAStats.division_id
    ? divisionWeights.get(teamAStats.division_id) ?? DEFAULT_DIVISION_WEIGHT
    : DEFAULT_DIVISION_WEIGHT;
  const divisionWeightB = teamBStats.division_id
    ? divisionWeights.get(teamBStats.division_id) ?? DEFAULT_DIVISION_WEIGHT
    : DEFAULT_DIVISION_WEIGHT;

  // Normalize/scale all inputs to comparable ranges
  const normalizedPowerScoreA = normalizePowerScore(powerScoreA);
  const normalizedPowerScoreB = normalizePowerScore(powerScoreB);
  const scaledSosA = scaleSOS(sosA);
  const scaledSosB = scaleSOS(sosB);
  const scaledDivWeightA = scaleDivisionWeight(divisionWeightA);
  const scaledDivWeightB = scaleDivisionWeight(divisionWeightB);

  // Calculate composite team ratings
  const teamRatingA = calculateTeamRating(normalizedPowerScoreA, scaledSosA, scaledDivWeightA);
  const teamRatingB = calculateTeamRating(normalizedPowerScoreB, scaledSosB, scaledDivWeightB);

  // Rating difference (positive = Team A stronger)
  const ratingDiff = teamRatingA - teamRatingB;

  // Convert to probability using logistic function
  const probA = logistic(LOGISTIC_K * ratingDiff);
  const probB = 1 - probA;

  // Determine confidence and expected outcome text
  const confidence = getConfidence(probA);
  const expectedText = getExpectedText(probA, teamAName, teamBName);

  return {
    probA,
    probB,
    expectedText,
    confidence,
    breakdown: {
      powerScoreA,
      powerScoreB,
      sosA,
      sosB,
      divisionWeightA,
      divisionWeightB,
      teamRatingA,
      teamRatingB,
      ratingDiff,
    },
  };
}

/**
 * Check if a completed match result was an upset
 *
 * @param winnerProbability - Pre-match probability of the winner (0-1)
 * @returns true if the result qualifies as an upset
 */
export function isUpset(winnerProbability: number): boolean {
  return winnerProbability <= UPSET_THRESHOLD;
}

/**
 * Format probability as percentage string
 */
export function formatProbability(prob: number): string {
  return `${Math.round(prob * 100)}%`;
}

/**
 * Generate the "Why" line showing exact inputs used
 */
export function formatBreakdown(breakdown: PredictionBreakdown): string {
  const { powerScoreA, powerScoreB, sosA, sosB, divisionWeightA, divisionWeightB } = breakdown;

  const parts = [
    `Power ${Math.round(powerScoreA)} vs ${Math.round(powerScoreB)}`,
    `SOS ${sosA.toFixed(2)} vs ${sosB.toFixed(2)}`,
    `Div ${divisionWeightA.toFixed(2)} vs ${divisionWeightB.toFixed(2)}`,
  ];

  return parts.join(' · ');
}
