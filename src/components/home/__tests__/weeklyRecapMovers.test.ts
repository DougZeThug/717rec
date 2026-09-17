import { describe, expect, it } from 'vitest';

import type { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';

import { hasVisibleMovers, isVisibleMover } from '../weeklyRecapMovers';

const trend = (teamId: string, delta: number): WeeklyPowerScoreTrend => ({
  teamId,
  teamName: `Team ${teamId}`,
  division: 'Competitive',
  logoUrl: undefined,
  currentScore: 53.8,
  previousScore: 53.8 - delta,
  delta,
  percentChange: 0,
  currentWeek: 7,
  previousWeek: 6,
});

describe('isVisibleMover', () => {
  it('hides a delta that would print as +0.0 and keeps one that would not', () => {
    expect(isVisibleMover(trend('a', 0.04))).toBe(false);
    expect(isVisibleMover(trend('a', 0.05))).toBe(true);
    expect(isVisibleMover(trend('a', -0.05))).toBe(true);
  });
});

describe('hasVisibleMovers', () => {
  it('reports a riser that clears the threshold', () => {
    expect(hasVisibleMovers([trend('a', 0.6)])).toBe(true);
  });

  it('reports a faller that clears the threshold', () => {
    expect(hasVisibleMovers([], trend('b', -0.8))).toBe(true);
  });

  it('ignores movers that would round to zero', () => {
    expect(hasVisibleMovers([trend('a', 0.02)], trend('b', -0.01))).toBe(false);
  });

  it('ignores a riser that fell and a faller that rose', () => {
    // MoversSection splits the two lists by sign, so a wrong-signed entry draws
    // no row and must not hold the card open on its own.
    expect(hasVisibleMovers([trend('a', -0.9)], trend('b', 0.9))).toBe(false);
  });

  it('reports nothing when there are no movers at all', () => {
    expect(hasVisibleMovers([])).toBe(false);
  });
});
