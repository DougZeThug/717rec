import { describe, expect, it } from 'vitest';

import { powerScore100, powerScore100Career } from '../weights';

// Behavioral pins for the earned-schedule career floor, kept from before the
// formula mirrors moved into src/utils/powerScore/weights.ts. This file used
// to carry its own local mirror labeled power_score_100() while actually
// implementing the CAREER variant (the floor belongs to
// power_score_100_career() only) — it now exercises the shared, correctly
// named mirrors instead. Cross-database parity lives in weights.test.ts and
// supabase/tests/power_score_weight_sandbox.sql.

describe('powerScore100Career (earned schedule floor behavior)', () => {
  it('returns 0 at zero performance', () => {
    expect(powerScore100Career(0, 0.5, 0)).toBeCloseTo(0, 1);
  });

  it('is unchanged at exactly the 30% performance threshold', () => {
    const weightedWinPct = 0.3;
    const weightedGameWinPct = 0.3;
    const sos = 0.85;

    const performance = (weightedWinPct * 40 + weightedGameWinPct * 15) / 55;
    expect(performance).toBeCloseTo(0.3, 2);

    const score = powerScore100Career(weightedWinPct, sos, weightedGameWinPct);
    const noFloorScore = powerScore100(weightedWinPct, sos, weightedGameWinPct);
    expect(score).toBeCloseTo(noFloorScore, 1);
  });

  it('scales SOS linearly below the 30% threshold', () => {
    const weightedWinPct = 0.15;
    const weightedGameWinPct = 0.15;
    const sos = 0.85;

    const performance = (weightedWinPct * 40 + weightedGameWinPct * 15) / 55;
    const scheduleCredit = performance / 0.3; // 0.5
    const expectedSosPoints = sos * 45 * scheduleCredit;
    const expected = weightedWinPct * 40 + weightedGameWinPct * 15 + expectedSosPoints;

    expect(powerScore100Career(weightedWinPct, sos, weightedGameWinPct)).toBeCloseTo(expected, 1);
  });

  it('keeps high-performing teams unchanged regardless of SOS', () => {
    const weightedWinPct = 0.75;
    const weightedGameWinPct = 0.7;
    const sos = 0.9;

    const score = powerScore100Career(weightedWinPct, sos, weightedGameWinPct);
    expect(score).toBeCloseTo(powerScore100(weightedWinPct, sos, weightedGameWinPct), 1);
  });

  it('does not return a negative score for extreme losing records', () => {
    const score = powerScore100Career(0, 1.0, 0);
    expect(score).toBeCloseTo(0, 1);
  });

  it('does NOT apply to the standings variant — that one keeps full SOS credit', () => {
    // The defect this file used to encode: the floor was attributed to
    // power_score_100(). The standings score has no floor at all.
    expect(powerScore100(0, 1.0, 0)).toBeCloseTo(45, 9);
  });
});
