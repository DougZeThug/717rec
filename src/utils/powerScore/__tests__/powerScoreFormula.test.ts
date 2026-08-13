import { describe, expect, it } from 'vitest';

/**
 * Mirrors the SQL `power_score_100()` formula for unit-test verification.
 * Inputs are 0-1 scale; output is 0-100 scale.
 *
 * The real source of truth is the SQL function. This local copy exists only to
 * make the formula behavior testable in JSDOM without a database connection.
 * If the SQL formula changes, this helper must be updated to match.
 */
function powerScore100(
  weightedWinPct: number,
  sos: number,
  weightedGameWinPct: number
): number {
  const performance = (weightedWinPct * 40 + weightedGameWinPct * 15) / 55;
  const scheduleCredit = Math.min(1, performance / 0.30);
  return (
    weightedWinPct * 40 +
    weightedGameWinPct * 15 +
    sos * 45 * scheduleCredit
  );
}

describe('powerScoreFormula', () => {
  it('returns 0 at zero performance', () => {
    expect(powerScore100(0, 0.5, 0)).toBeCloseTo(0, 1);
  });

  it('is unchanged at exactly the 30% performance threshold', () => {
    const weightedWinPct = 0.30;
    const weightedGameWinPct = 0.30;
    const sos = 0.85;

    const performance = (weightedWinPct * 40 + weightedGameWinPct * 15) / 55;
    expect(performance).toBeCloseTo(0.30, 2);

    const score = powerScore100(weightedWinPct, sos, weightedGameWinPct);
    const oldFormulaScore = weightedWinPct * 40 + weightedGameWinPct * 15 + sos * 45;
    expect(score).toBeCloseTo(oldFormulaScore, 1);
  });

  it('scales SOS linearly below the 30% threshold', () => {
    const weightedWinPct = 0.15;
    const weightedGameWinPct = 0.15;
    const sos = 0.85;

    const performance = (weightedWinPct * 40 + weightedGameWinPct * 15) / 55;
    const scheduleCredit = performance / 0.30; // 0.5
    const expectedSosPoints = sos * 45 * scheduleCredit;
    const expected = weightedWinPct * 40 + weightedGameWinPct * 15 + expectedSosPoints;

    expect(powerScore100(weightedWinPct, sos, weightedGameWinPct)).toBeCloseTo(
      expected,
      1
    );
  });

  it('keeps high-performing teams unchanged regardless of SOS', () => {
    const weightedWinPct = 0.75;
    const weightedGameWinPct = 0.70;
    const sos = 0.90;

    const score = powerScore100(weightedWinPct, sos, weightedGameWinPct);
    const oldFormulaScore = weightedWinPct * 40 + weightedGameWinPct * 15 + sos * 45;
    expect(score).toBeCloseTo(oldFormulaScore, 1);
  });

  it('does not return a negative score for extreme losing records', () => {
    const score = powerScore100(0, 1.0, 0);
    expect(score).toBeCloseTo(0, 1);
  });
});
