import { describe, expect, it } from 'vitest';

import { formatPowerScore, getDisplayedPowerScore } from '../formatPowerScore';

describe('formatPowerScore', () => {
  it('returns em dash when power score is absent', () => {
    const score: number | undefined = undefined;
    expect(formatPowerScore(score)).toBe('—');
  });

  // v_team_details returns NULL for a team that has not played and for Hidden
  // teams, so null reaches this helper and used to throw on .toFixed.
  it('returns em dash for null rather than throwing', () => {
    const score: number | null = null;
    expect(() => formatPowerScore(score)).not.toThrow();
    expect(formatPowerScore(score)).toBe('—');
  });

  it('formats 0 as "0.0"', () => {
    expect(formatPowerScore(0)).toBe('0.0');
  });

  it('formats 100 as "100.0"', () => {
    expect(formatPowerScore(100)).toBe('100.0');
  });

  it('rounds to 1 decimal place', () => {
    expect(formatPowerScore(65.56)).toBe('65.6');
    expect(formatPowerScore(65.54)).toBe('65.5');
  });

  it('formats a typical mid-range score', () => {
    expect(formatPowerScore(72.3)).toBe('72.3');
  });
});

describe('getDisplayedPowerScore', () => {
  it('passes null and undefined straight through', () => {
    // Named rather than passed inline: an inline `undefined` for an optional
    // parameter reads as redundant to static analysis, but the undefined path
    // is exactly what this case covers.
    const absent: number | undefined = undefined;
    expect(getDisplayedPowerScore(null)).toBeNull();
    expect(getDisplayedPowerScore(absent)).toBeNull();
  });

  // The whole point of this helper: sorting must agree with what the table
  // prints. Math.round(x * 10) / 10 gives 41.7 here, which is what made two
  // rows printed as "41.6" sort as though they differed.
  it('agrees with formatPowerScore on a .x5 boundary', () => {
    expect(getDisplayedPowerScore(41.65)).toBe(41.6);
    expect(formatPowerScore(41.65)).toBe('41.6');
  });

  it('agrees with formatPowerScore across a spread of scores', () => {
    for (const raw of [0, 0.15, 1.45, 41.6, 41.65, 65.56, 65.54, 72.3, 99.95, 100]) {
      expect(String(getDisplayedPowerScore(raw))).toBe(String(Number(formatPowerScore(raw))));
    }
  });
});
