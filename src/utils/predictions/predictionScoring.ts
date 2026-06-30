import { DEFAULT_POWER_SCORE, DEFAULT_SOS } from './predictionConstants';

export function logistic(x: number): number {
  const clampedX = Math.max(-10, Math.min(10, x));
  return 1 / (1 + Math.exp(-clampedX));
}

export function normalizePowerScore(ps: number | null): number {
  const score = ps ?? DEFAULT_POWER_SCORE;
  return Math.max(0, Math.min(100, score)) / 100;
}

export function scaleSOS(sos: number | null): number {
  const value = sos ?? DEFAULT_SOS;
  return Math.max(0, Math.min(1, (value - 0.35) / 0.85));
}

export function scaleDivisionWeight(dw: number): number {
  return Math.max(0, Math.min(1, dw - 0.5));
}
