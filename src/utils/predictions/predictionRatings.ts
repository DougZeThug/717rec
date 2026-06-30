import {
  MIN_H2H_MATCHES,
  WEIGHT_CAREER,
  WEIGHT_CAREER_POWER,
  WEIGHT_CAREER_SOS,
  WEIGHT_CAREER_WINPCT,
  WEIGHT_CURRENT_SEASON,
  WEIGHT_DIVISION,
  WEIGHT_H2H,
  WEIGHT_POWER_SCORE,
  WEIGHT_SOS,
} from './predictionConstants';

export interface EffectiveWeights {
  seasonWeight: number;
  careerWeight: number;
  h2hWeight: number;
}

export function calculateSeasonRating(
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

export function calculateCareerRating(
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

export function calculateH2HRating(
  wins: number,
  losses: number
): { rating: number; dominanceFactor: number } {
  const total = wins + losses;

  if (total < MIN_H2H_MATCHES) {
    return { rating: 0.5, dominanceFactor: 0 };
  }

  const winRate = wins / total;
  const dominanceFactor = Math.abs(winRate - 0.5) * 2;
  const scaledRating = 0.5 + ((winRate - 0.5) * (1 + dominanceFactor)) / 2;

  return {
    rating: Math.max(0, Math.min(1, scaledRating)),
    dominanceFactor,
  };
}

export function getEffectiveWeights(hasH2H: boolean): EffectiveWeights {
  if (hasH2H) {
    return {
      seasonWeight: WEIGHT_CURRENT_SEASON,
      careerWeight: WEIGHT_CAREER,
      h2hWeight: WEIGHT_H2H,
    };
  }

  const totalNonH2H = WEIGHT_CAREER + WEIGHT_CURRENT_SEASON;
  const careerRatio = WEIGHT_CAREER / totalNonH2H;
  const seasonRatio = WEIGHT_CURRENT_SEASON / totalNonH2H;

  return {
    seasonWeight: WEIGHT_CURRENT_SEASON + WEIGHT_H2H * seasonRatio,
    careerWeight: WEIGHT_CAREER + WEIGHT_H2H * careerRatio,
    h2hWeight: 0,
  };
}

export function calculateCompositeRating(
  seasonRating: number,
  careerRating: number,
  h2hRating: number,
  hasCareerData: boolean,
  weights: EffectiveWeights
): number {
  const effectiveCareerRating = hasCareerData ? careerRating : seasonRating;

  return (
    seasonRating * weights.seasonWeight +
    effectiveCareerRating * weights.careerWeight +
    h2hRating * weights.h2hWeight
  );
}
