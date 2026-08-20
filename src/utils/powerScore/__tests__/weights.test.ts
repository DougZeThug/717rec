import { describe, expect, it } from 'vitest';

import {
  DEFAULT_POWER_SCORE_WEIGHTS,
  isValidWeights,
  powerScore100,
  powerScore100Career,
  weightsEqual,
} from '../weights';

// The numeric fixtures here are asserted against the REGENERATED SQL
// functions in supabase/tests/power_score_weight_sandbox.sql. If one of these
// expected values changes, the SQL test must change with it (and vice versa).

describe('powerScore100 (standings — no floor)', () => {
  it('matches the SQL fixture triples under the default 40/45/15', () => {
    expect(powerScore100(0.75, 0.9, 0.7)).toBeCloseTo(81, 9);
    expect(powerScore100(0, 0.5, 0)).toBeCloseTo(22.5, 9);
    expect(powerScore100(1, 1, 1)).toBeCloseTo(100, 9);
  });

  it('applies the SQL COALESCE rules: win/game read as 0, sos as 0.5', () => {
    // ?? in the mirror treats undefined identically to the nulls pinned here.
    expect(powerScore100(null, null, null)).toBeCloseTo(22.5, 9);
    expect(powerScore100(0.5, null, 0.5)).toBeCloseTo(0.5 * 40 + 0.5 * 15 + 0.5 * 45, 9);
  });

  it('scores a perfect team at exactly 100 under any valid triple', () => {
    expect(powerScore100(1, 1, 1, { win: 50, sos: 35, game: 15 })).toBeCloseTo(100, 9);
    expect(powerScore100(1, 1, 1, { win: 30, sos: 60, game: 10 })).toBeCloseTo(100, 9);
  });

  it('recomputes the SQL smoke-test loser under 50/35/15', () => {
    // team2 in the SQL fixture: 0 win rate, sos 1.0, game rate 1/3 → 40.0
    expect(powerScore100(0, 1.0, 1 / 3, { win: 50, sos: 35, game: 15 })).toBeCloseTo(40, 6);
  });

  it('has no performance floor — full SOS credit even at zero performance', () => {
    expect(powerScore100(0, 1.0, 0)).toBeCloseTo(45, 9);
  });
});

describe('powerScore100Career (earned schedule credit)', () => {
  it('agrees with the standings variant above the 30% performance floor', () => {
    expect(powerScore100Career(0.75, 0.9, 0.7)).toBeCloseTo(powerScore100(0.75, 0.9, 0.7), 9);
  });

  it('is unchanged at exactly the floor', () => {
    // (0.3*40 + 0.3*15) / 55 = 0.3 exactly
    expect(powerScore100Career(0.3, 0.85, 0.3)).toBeCloseTo(54.75, 9);
  });

  it('scales SOS points linearly below the floor', () => {
    // performance 0.15 → half the schedule credit: 8.25 + 0.85*45*0.5 = 27.375
    expect(powerScore100Career(0.15, 0.85, 0.15)).toBeCloseTo(27.375, 9);
  });

  it('matches the SQL smoke-test loser under both fixture triples', () => {
    expect(powerScore100Career(0, 1.0, 1 / 3)).toBeCloseTo(18.6363636364, 6);
    expect(powerScore100Career(0, 1.0, 1 / 3, { win: 50, sos: 35, game: 15 })).toBeCloseTo(
      13.9743589744,
      6
    );
  });

  it('derives the performance denominator from win + game weights', () => {
    const weights = { win: 30, sos: 60, game: 10 };
    // base = 0.3*30 + 0.3*10 = 12; performance = 12/40 = 0.3 → exactly at the floor
    expect(powerScore100Career(0.3, 0.85, 0.3, weights)).toBeCloseTo(12 + 0.85 * 60, 9);
    // base = 4; performance = 0.1 → a third of the credit
    expect(powerScore100Career(0.1, 0.85, 0.1, weights)).toBeCloseTo(4 + (0.85 * 60) / 3, 9);
  });

  it('scores a perfect team at exactly 100 under any valid triple', () => {
    expect(powerScore100Career(1, 1, 1)).toBeCloseTo(100, 9);
    expect(powerScore100Career(1, 1, 1, { win: 30, sos: 60, game: 10 })).toBeCloseTo(100, 9);
  });
});

describe('isValidWeights', () => {
  it('accepts the default and the what-if triples', () => {
    expect(isValidWeights(DEFAULT_POWER_SCORE_WEIGHTS)).toBe(true);
    expect(isValidWeights({ win: 50, sos: 35, game: 15 })).toBe(true);
    expect(isValidWeights({ win: 30, sos: 60, game: 10 })).toBe(true);
    expect(isValidWeights({ win: 100, sos: 0, game: 0 })).toBe(true);
  });

  it('tolerates float representation of decimal triples', () => {
    expect(isValidWeights({ win: 33.4, sos: 33.3, game: 33.3 })).toBe(true);
  });

  it('rejects triples that do not sum to 100', () => {
    expect(isValidWeights({ win: 40, sos: 45, game: 16 })).toBe(false);
    expect(isValidWeights({ win: 30, sos: 60, game: 20 })).toBe(false);
  });

  it('rejects negative and non-finite weights', () => {
    expect(isValidWeights({ win: -10, sos: 95, game: 15 })).toBe(false);
    expect(isValidWeights({ win: NaN, sos: 45, game: 15 })).toBe(false);
    expect(isValidWeights({ win: Infinity, sos: -Infinity, game: 15 })).toBe(false);
  });

  it('rejects 0/100/0 — the career formula divides by win + game', () => {
    expect(isValidWeights({ win: 0, sos: 100, game: 0 })).toBe(false);
  });
});

describe('weightsEqual', () => {
  it('compares the three fields exactly', () => {
    expect(weightsEqual({ win: 40, sos: 45, game: 15 }, DEFAULT_POWER_SCORE_WEIGHTS)).toBe(true);
    expect(weightsEqual({ win: 40, sos: 46, game: 14 }, DEFAULT_POWER_SCORE_WEIGHTS)).toBe(false);
  });
});
