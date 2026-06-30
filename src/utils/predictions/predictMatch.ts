/**
 * Match Prediction Utility
 *
 * A simple, honest heuristic for predicting match outcomes.
 * This is NOT a sophisticated ML model - it's a transparent calculation
 * using existing metrics: Power Score, SOS, Division Weight, and Head-to-Head record.
 */
import {
  DEFAULT_CAREER_POWER,
  DEFAULT_CAREER_SOS,
  DEFAULT_CAREER_WINPCT,
  DEFAULT_DIVISION_WEIGHT,
  DEFAULT_POWER_SCORE,
  DEFAULT_SOS,
  LOGISTIC_K,
  MIN_H2H_MATCHES,
} from './predictionConstants';
import { getConfidence, getExpectedText } from './predictionFormatting';
import {
  calculateCareerRating,
  calculateCompositeRating,
  calculateH2HRating,
  calculateSeasonRating,
  getEffectiveWeights,
} from './predictionRatings';
import { logistic, normalizePowerScore, scaleDivisionWeight, scaleSOS } from './predictionScoring';
import type { HeadToHeadStats, PredictionResult, TeamStats } from './predictionTypes';

export { UPSET_THRESHOLD } from './predictionConstants';
export { formatBreakdown, formatProbability, isUpset } from './predictionFormatting';
export type {
  ConfidenceLevel,
  HeadToHeadStats,
  PredictionBreakdown,
  PredictionResult,
  TeamStats,
} from './predictionTypes';

/**
 * Predict match outcome between two teams.
 *
 * Uses: 65% Career Performance + 25% Current Season + 10% Head-to-Head.
 */
export function predictMatch(
  teamAStats: TeamStats,
  teamBStats: TeamStats,
  divisionWeights: Map<string, number>,
  teamAName = 'Team A',
  teamBName = 'Team B',
  h2hData?: HeadToHeadStats | null
): PredictionResult {
  const powerScoreA = teamAStats.power_score ?? DEFAULT_POWER_SCORE;
  const powerScoreB = teamBStats.power_score ?? DEFAULT_POWER_SCORE;
  const sosA = teamAStats.sos ?? DEFAULT_SOS;
  const sosB = teamBStats.sos ?? DEFAULT_SOS;

  const divisionWeightA = teamAStats.division_id
    ? (divisionWeights.get(teamAStats.division_id) ?? DEFAULT_DIVISION_WEIGHT)
    : DEFAULT_DIVISION_WEIGHT;
  const divisionWeightB = teamBStats.division_id
    ? (divisionWeights.get(teamBStats.division_id) ?? DEFAULT_DIVISION_WEIGHT)
    : DEFAULT_DIVISION_WEIGHT;

  const normalizedPowerScoreA = normalizePowerScore(powerScoreA);
  const normalizedPowerScoreB = normalizePowerScore(powerScoreB);
  const scaledSosA = scaleSOS(sosA);
  const scaledSosB = scaleSOS(sosB);
  const scaledDivWeightA = scaleDivisionWeight(divisionWeightA);
  const scaledDivWeightB = scaleDivisionWeight(divisionWeightB);

  const careerPowerA = teamAStats.career_power_score ?? DEFAULT_CAREER_POWER;
  const careerPowerB = teamBStats.career_power_score ?? DEFAULT_CAREER_POWER;
  const careerSosA = teamAStats.career_sos ?? DEFAULT_CAREER_SOS;
  const careerSosB = teamBStats.career_sos ?? DEFAULT_CAREER_SOS;
  const careerWinPctA = teamAStats.career_win_percentage ?? DEFAULT_CAREER_WINPCT;
  const careerWinPctB = teamBStats.career_win_percentage ?? DEFAULT_CAREER_WINPCT;

  const hasCareerDataA = teamAStats.career_power_score != null;
  const hasCareerDataB = teamBStats.career_power_score != null;

  const normalizedCareerPowerA = normalizePowerScore(careerPowerA);
  const normalizedCareerPowerB = normalizePowerScore(careerPowerB);
  const scaledCareerSosA = scaleSOS(careerSosA);
  const scaledCareerSosB = scaleSOS(careerSosB);

  const seasonRatingA = calculateSeasonRating(normalizedPowerScoreA, scaledSosA, scaledDivWeightA);
  const seasonRatingB = calculateSeasonRating(normalizedPowerScoreB, scaledSosB, scaledDivWeightB);

  const careerRatingA = calculateCareerRating(
    normalizedCareerPowerA,
    scaledCareerSosA,
    careerWinPctA
  );
  const careerRatingB = calculateCareerRating(
    normalizedCareerPowerB,
    scaledCareerSosB,
    careerWinPctB
  );

  const h2hWinsA = h2hData?.team1Wins ?? 0;
  const h2hWinsB = h2hData?.team2Wins ?? 0;
  const h2hTotalMatches = h2hData?.totalMatches ?? 0;
  const hasH2HData = h2hTotalMatches >= MIN_H2H_MATCHES;

  const h2hResultA = calculateH2HRating(h2hWinsA, h2hWinsB);
  const h2hResultB = calculateH2HRating(h2hWinsB, h2hWinsA);
  const h2hRatingA = h2hResultA.rating;
  const h2hRatingB = h2hResultB.rating;
  const h2hDominanceFactor = h2hResultA.dominanceFactor;

  const weights = getEffectiveWeights(hasH2HData);

  const teamRatingA = calculateCompositeRating(
    seasonRatingA,
    careerRatingA,
    h2hRatingA,
    hasCareerDataA,
    weights
  );
  const teamRatingB = calculateCompositeRating(
    seasonRatingB,
    careerRatingB,
    h2hRatingB,
    hasCareerDataB,
    weights
  );

  const ratingDiff = teamRatingA - teamRatingB;
  const probA = logistic(LOGISTIC_K * ratingDiff);
  const probB = 1 - probA;
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
      careerPowerA,
      careerPowerB,
      careerSosA,
      careerSosB,
      careerWinPctA,
      careerWinPctB,
      h2hWinsA,
      h2hWinsB,
      h2hTotalMatches,
      h2hRatingA,
      h2hRatingB,
      h2hDominanceFactor,
      hasH2HData,
      seasonRatingA,
      seasonRatingB,
      careerRatingA,
      careerRatingB,
      teamRatingA,
      teamRatingB,
      ratingDiff,
      hasCareerDataA,
      hasCareerDataB,
    },
  };
}
