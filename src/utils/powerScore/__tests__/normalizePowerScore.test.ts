import { describe, expect, it } from 'vitest';

import { normalizePowerScore } from '../normalizePowerScore';

describe('normalizePowerScore', () => {
  it('returns null for null input', () => {
    expect(normalizePowerScore(null, 'v_team_details')).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizePowerScore(undefined, 'v_team_details')).toBeNull();
  });

  it('passes through v_team_details scores unchanged', () => {
    expect(normalizePowerScore(65.5, 'v_team_details')).toBe(65.5);
  });

  it('passes through calculated scores unchanged', () => {
    expect(normalizePowerScore(72.0, 'calculated')).toBe(72.0);
  });

  it('passes through raw_0_100 scores unchanged', () => {
    expect(normalizePowerScore(50.0, 'raw_0_100')).toBe(50.0);
  });

  it('multiplies team_season_stats scores by 100', () => {
    expect(normalizePowerScore(0.655, 'team_season_stats')).toBeCloseTo(65.5);
  });

  it('handles team_season_stats score of 0', () => {
    expect(normalizePowerScore(0, 'team_season_stats')).toBe(0);
  });

  it('handles team_season_stats score of 1', () => {
    expect(normalizePowerScore(1, 'team_season_stats')).toBe(100);
  });
});
