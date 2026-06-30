import { UPSET_THRESHOLD } from './predictionConstants';
import type { ConfidenceLevel, PredictionBreakdown } from './predictionTypes';

export function getConfidence(probA: number): ConfidenceLevel {
  const distanceFrom50 = Math.abs(probA - 0.5);

  if (distanceFrom50 < 0.06) return 'Low';
  if (distanceFrom50 < 0.15) return 'Medium';
  return 'High';
}

export function getExpectedText(probA: number, teamAName: string, teamBName: string): string {
  const distanceFrom50 = Math.abs(probA - 0.5);

  if (distanceFrom50 < 0.03) {
    return 'Near coin flip';
  }

  const favored = probA > 0.5 ? teamAName : teamBName;
  const favoredProb = probA > 0.5 ? probA : 1 - probA;

  if (favoredProb >= 0.7) {
    return `${favored} strongly favored`;
  }

  return `${favored} favored`;
}

export function isUpset(winnerProbability: number): boolean {
  return winnerProbability <= UPSET_THRESHOLD;
}

export function formatProbability(prob: number): string {
  return `${Math.round(prob * 100)}%`;
}

export function formatBreakdown(breakdown: PredictionBreakdown): string {
  const {
    powerScoreA,
    powerScoreB,
    careerPowerA,
    careerPowerB,
    careerWinPctA,
    careerWinPctB,
    h2hWinsA,
    h2hWinsB,
    hasCareerDataA,
    hasCareerDataB,
    hasH2HData,
  } = breakdown;

  const parts = [`Season: ${Math.round(powerScoreA)} vs ${Math.round(powerScoreB)}`];

  if (hasCareerDataA || hasCareerDataB) {
    parts.push(`Career: ${Math.round(careerPowerA)} vs ${Math.round(careerPowerB)}`);
    parts.push(`Win%: ${Math.round(careerWinPctA * 100)}% vs ${Math.round(careerWinPctB * 100)}%`);
  }

  if (hasH2HData) {
    parts.push(`H2H: ${h2hWinsA}-${h2hWinsB}`);
  }

  return parts.join(' · ');
}
