/**
 * Match Prediction Utility
 *
 * A simple, honest heuristic for predicting match outcomes.
 * This is NOT a sophisticated ML model - it's a transparent calculation
 * using existing metrics: Power Score, SOS, Division Weight, and Head-to-Head record.
 *
 * The prediction uses:
 * - 65% Career Performance (Power Score, SOS, Win%)
 * - 25% Current Season (Power Score, SOS, Division)
 * - 10% Head-to-Head (with dominance scaling, min 2 matches)
 *
 * The prediction is deterministic and designed to be variance-tolerant
 * for a recreational volleyball league where upsets are common.
 */

// ============= Types =============

export interface TeamStats {
  // Current season stats
  power_score: number | null;
  sos: number | null;
  division_id: string | null;

  // Career stats (optional, used when available)
  career_power_score?: number | null;
  career_sos?: number | null;
  career_win_percentage?: number | null;
}

export interface HeadToHeadStats {
  team1Wins: number;
  team2Wins: number;
  totalMatches: number;
}

export interface PredictionBreakdown {
  // Current season stats
  powerScoreA: number;
  powerScoreB: number;
  sosA: number;
  sosB: number;
  divisionWeightA: number;
  divisionWeightB: number;

  // Career stats
  careerPowerA: number;
  careerPowerB: number;
  careerSosA: number;
  careerSosB: number;
  careerWinPctA: number;
  careerWinPctB: number;

  // Head-to-Head stats
  h2hWinsA: number;
  h2hWinsB: number;
  h2hTotalMatches: number;
  h2hRatingA: number;
  h2hRatingB: number;
  h2hDominanceFactor: number;
  hasH2HData: boolean;

  // Ratings
  seasonRatingA: number;
  seasonRatingB: number;
  careerRatingA: number;
  careerRatingB: number;
  teamRatingA: number;
  teamRatingB: number;
  ratingDiff: number;

  // Flags
  hasCareerDataA: boolean;
  hasCareerDataB: boolean;
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
 * Main bucket weights:
 * - 65% Career Performance (most statistically robust)
 * - 25% Current Season (recent form)
 * - 10% Head-to-Head (historical matchup advantage)
 */
const WEIGHT_CURRENT_SEASON = 0.25;
const WEIGHT_CAREER = 0.65;
const WEIGHT_H2H = 0.10;

/**
 * Minimum head-to-head matches required for H2H factor to apply.
 * Below this threshold, H2H weight is redistributed to Career and Season.
 */
const MIN_H2H_MATCHES = 2;

/**
 * Current season component weights (within the 25% bucket):
 * - Power Score: 70% of 25% = 17.5% total
 * - SOS: 15% of 25% = 3.75% total
 * - Division: 15% of 25% = 3.75% total
 */
const WEIGHT_POWER_SCORE = 0.70;
const WEIGHT_SOS = 0.15;
const WEIGHT_DIVISION = 0.15;

/**
 * Career component weights (within the 65% bucket):
 * - Career Power Score: 70% of 65% = 45.5% total
 * - Career SOS: 15% of 65% = 9.75% total
 * - Career Win %: 15% of 65% = 9.75% total
 */
const WEIGHT_CAREER_POWER = 0.70;
const WEIGHT_CAREER_SOS = 0.15;
const WEIGHT_CAREER_WINPCT = 0.15;

/**
 * Default values when stats are missing
 */
const DEFAULT_POWER_SCORE = 50;  // Middle of 0-100 range
const DEFAULT_SOS = 0.85;        // League-wide average SOS
const DEFAULT_DIVISION_WEIGHT = 0.85; // Reasonable default tier

// Career defaults
const DEFAULT_CAREER_POWER = 50;
const DEFAULT_CAREER_SOS = 0.85;
const DEFAULT_CAREER_WINPCT = 0.50;

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
 * Calculate current season team rating from normalized components
 */
function calculateSeasonRating(
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
 * Calculate career team rating from normalized components
 */
function calculateCareerRating(
  normalizedCareerPower: number,
  scaledCareerSOS: number,
  careerWinPct: number
): number {
  return (
    normalizedCareerPower * WEIGHT_CAREER_POWER +
    scaledCareerSOS * WEIGHT_CAREER_SOS +
    careerWinPct * WEIGHT_CAREER_WINPCT
  );
}

/**
 * Calculate head-to-head advantage rating with dominance scaling.
 *
 * Dominance Factor: How one-sided is the record?
 * - 6-0 (100% dominance) -> Full H2H weight applied
 * - 4-2 (67% win rate) -> Moderate H2H weight
 * - 4-3 (57% win rate) -> Reduced H2H weight (close series)
 *
 * Formula: H2H Rating = base + (winRate - 0.5) * dominance boost
 * This gives:
 * - 6-0: Strong advantage (rating ~0.75)
 * - 4-2: Moderate advantage (rating ~0.60)
 * - 3-3: Neutral (rating = 0.50)
 */
function calculateH2HRating(wins: number, losses: number): { rating: number; dominanceFactor: number } {
  const total = wins + losses;

  if (total < MIN_H2H_MATCHES) {
    return { rating: 0.5, dominanceFactor: 0 }; // Neutral, no H2H applied
  }

  const winRate = wins / total;

  // Dominance factor: how far from 50-50 is the record?
  // |winRate - 0.5| * 2 gives 0 for 50-50, 1 for 100-0
  const dominanceFactor = Math.abs(winRate - 0.5) * 2;

  // Scale the rating: 0.5 is neutral, deviations scaled by dominance
  // More dominant records get amplified effect
  const scaledRating = 0.5 + (winRate - 0.5) * (1 + dominanceFactor) / 2;

  return {
    rating: Math.max(0, Math.min(1, scaledRating)),
    dominanceFactor,
  };
}

/**
 * Calculate effective weights when H2H data is missing or insufficient.
 * Redistributes H2H weight proportionally to Career and Season.
 */
function getEffectiveWeights(hasH2H: boolean): {
  seasonWeight: number;
  careerWeight: number;
  h2hWeight: number;
} {
  if (hasH2H) {
    return {
      seasonWeight: WEIGHT_CURRENT_SEASON, // 0.25
      careerWeight: WEIGHT_CAREER,          // 0.65
      h2hWeight: WEIGHT_H2H,                // 0.10
    };
  }

  // Redistribute H2H weight proportionally
  // Career:Season ratio is 65:25 = 72.2%:27.8%
  const totalNonH2H = WEIGHT_CAREER + WEIGHT_CURRENT_SEASON;
  const careerRatio = WEIGHT_CAREER / totalNonH2H;
  const seasonRatio = WEIGHT_CURRENT_SEASON / totalNonH2H;

  return {
    seasonWeight: WEIGHT_CURRENT_SEASON + WEIGHT_H2H * seasonRatio,  // ~0.278
    careerWeight: WEIGHT_CAREER + WEIGHT_H2H * careerRatio,          // ~0.722
    h2hWeight: 0,
  };
}

/**
 * Calculate composite team rating from all factors
 */
function calculateCompositeRating(
  seasonRating: number,
  careerRating: number,
  h2hRating: number,
  hasCareerData: boolean,
  weights: { seasonWeight: number; careerWeight: number; h2hWeight: number }
): number {
  const effectiveCareerRating = hasCareerData ? careerRating : seasonRating;

  return (
    seasonRating * weights.seasonWeight +
    effectiveCareerRating * weights.careerWeight +
    h2hRating * weights.h2hWeight
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
 * Uses: 65% Career Performance + 25% Current Season + 10% Head-to-Head
 *
 * @param teamAStats - Stats for Team A (power_score, sos, division_id, career stats)
 * @param teamBStats - Stats for Team B (power_score, sos, division_id, career stats)
 * @param divisionWeights - Map of division_id to division_weight (from cache)
 * @param teamAName - Display name for Team A (for outcome text)
 * @param teamBName - Display name for Team B (for outcome text)
 * @param h2hData - Optional head-to-head stats between teams
 * @returns Prediction result with probabilities, text, confidence, and breakdown
 */
export function predictMatch(
  teamAStats: TeamStats,
  teamBStats: TeamStats,
  divisionWeights: Map<string, number>,
  teamAName = 'Team A',
  teamBName = 'Team B',
  h2hData?: HeadToHeadStats | null
): PredictionResult {
  // === Current Season Stats ===
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

  // Normalize/scale current season inputs
  const normalizedPowerScoreA = normalizePowerScore(powerScoreA);
  const normalizedPowerScoreB = normalizePowerScore(powerScoreB);
  const scaledSosA = scaleSOS(sosA);
  const scaledSosB = scaleSOS(sosB);
  const scaledDivWeightA = scaleDivisionWeight(divisionWeightA);
  const scaledDivWeightB = scaleDivisionWeight(divisionWeightB);

  // === Career Stats ===
  const careerPowerA = teamAStats.career_power_score ?? DEFAULT_CAREER_POWER;
  const careerPowerB = teamBStats.career_power_score ?? DEFAULT_CAREER_POWER;
  const careerSosA = teamAStats.career_sos ?? DEFAULT_CAREER_SOS;
  const careerSosB = teamBStats.career_sos ?? DEFAULT_CAREER_SOS;
  const careerWinPctA = teamAStats.career_win_percentage ?? DEFAULT_CAREER_WINPCT;
  const careerWinPctB = teamBStats.career_win_percentage ?? DEFAULT_CAREER_WINPCT;

  // Check if we have career data
  const hasCareerDataA = teamAStats.career_power_score != null;
  const hasCareerDataB = teamBStats.career_power_score != null;

  // Normalize/scale career inputs
  const normalizedCareerPowerA = normalizePowerScore(careerPowerA);
  const normalizedCareerPowerB = normalizePowerScore(careerPowerB);
  const scaledCareerSosA = scaleSOS(careerSosA);
  const scaledCareerSosB = scaleSOS(careerSosB);

  // === Calculate Ratings ===
  
  // Current season ratings
  const seasonRatingA = calculateSeasonRating(normalizedPowerScoreA, scaledSosA, scaledDivWeightA);
  const seasonRatingB = calculateSeasonRating(normalizedPowerScoreB, scaledSosB, scaledDivWeightB);

  // Career ratings
  const careerRatingA = calculateCareerRating(normalizedCareerPowerA, scaledCareerSosA, careerWinPctA);
  const careerRatingB = calculateCareerRating(normalizedCareerPowerB, scaledCareerSosB, careerWinPctB);

  // === Head-to-Head ===
  const h2hWinsA = h2hData?.team1Wins ?? 0;
  const h2hWinsB = h2hData?.team2Wins ?? 0;
  const h2hTotalMatches = h2hData?.totalMatches ?? 0;
  const hasH2HData = h2hTotalMatches >= MIN_H2H_MATCHES;

  const h2hResultA = calculateH2HRating(h2hWinsA, h2hWinsB);
  const h2hResultB = calculateH2HRating(h2hWinsB, h2hWinsA);
  const h2hRatingA = h2hResultA.rating;
  const h2hRatingB = h2hResultB.rating;
  const h2hDominanceFactor = h2hResultA.dominanceFactor;

  // Get effective weights (redistributes H2H weight if insufficient data)
  const weights = getEffectiveWeights(hasH2HData);

  // Composite ratings (65% career + 25% season + 10% H2H)
  const teamRatingA = calculateCompositeRating(seasonRatingA, careerRatingA, h2hRatingA, hasCareerDataA, weights);
  const teamRatingB = calculateCompositeRating(seasonRatingB, careerRatingB, h2hRatingB, hasCareerDataB, weights);

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
      // Current season
      powerScoreA,
      powerScoreB,
      sosA,
      sosB,
      divisionWeightA,
      divisionWeightB,
      // Career
      careerPowerA,
      careerPowerB,
      careerSosA,
      careerSosB,
      careerWinPctA,
      careerWinPctB,
      // Head-to-Head
      h2hWinsA,
      h2hWinsB,
      h2hTotalMatches,
      h2hRatingA,
      h2hRatingB,
      h2hDominanceFactor,
      hasH2HData,
      // Ratings
      seasonRatingA,
      seasonRatingB,
      careerRatingA,
      careerRatingB,
      teamRatingA,
      teamRatingB,
      ratingDiff,
      // Flags
      hasCareerDataA,
      hasCareerDataB,
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
  const {
    powerScoreA, powerScoreB,
    careerPowerA, careerPowerB,
    careerWinPctA, careerWinPctB,
    h2hWinsA, h2hWinsB,
    hasCareerDataA, hasCareerDataB,
    hasH2HData,
  } = breakdown;

  const parts = [
    `Season: ${Math.round(powerScoreA)} vs ${Math.round(powerScoreB)}`,
  ];

  // Only show career stats if at least one team has career data
  if (hasCareerDataA || hasCareerDataB) {
    parts.push(`Career: ${Math.round(careerPowerA)} vs ${Math.round(careerPowerB)}`);
    parts.push(`Win%: ${Math.round(careerWinPctA * 100)}% vs ${Math.round(careerWinPctB * 100)}%`);
  }

  // Show H2H record if sufficient matches
  if (hasH2HData) {
    parts.push(`H2H: ${h2hWinsA}-${h2hWinsB}`);
  }

  return parts.join(' · ');
}
