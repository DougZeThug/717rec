import { describe, expect, it } from 'vitest';

import type { Match } from '@/types';

import { calculateStreak } from '../calculateStreak';

const match = (
  id: string,
  t1: string,
  t2: string,
  winner: string | null,
  extra: Partial<Match> = {}
): Match =>
  ({ id, team1Id: t1, team2Id: t2, winnerId: winner, iscompleted: true, ...extra }) as Match;

describe('calculateStreak edge cases', () => {
  const TEAM_ID = 't1';

  it('handles matches with no date (falls back to epoch 0 ordering)', () => {
    expect(calculateStreak(TEAM_ID, [match('m1', TEAM_ID, 't2', TEAM_ID)])).toBe('W1');
  });

  it('sorts undated matches after dated ones (most recent dated match leads)', () => {
    const matches = [
      match('m-old', TEAM_ID, 't2', 't2'), // no date → treated as oldest
      match('m-new', TEAM_ID, 't3', TEAM_ID, { date: '2024-05-01' }),
    ];
    // Most recent (dated) match is a win, older undated match is a loss → W1
    expect(calculateStreak(TEAM_ID, matches)).toBe('W1');
  });

  it('counts a streak when the team plays as team2', () => {
    const matches = [
      match('m1', 't2', TEAM_ID, TEAM_ID, { date: '2024-01-02' }),
      match('m2', 't3', TEAM_ID, TEAM_ID, { date: '2024-01-01' }),
    ];
    expect(calculateStreak(TEAM_ID, matches)).toBe('W2');
  });

  it('stops counting at the first result that breaks the streak', () => {
    const matches = [
      match('m1', TEAM_ID, 't2', 't2', { date: '2024-01-04' }), // loss (most recent)
      match('m2', TEAM_ID, 't3', 't3', { date: '2024-01-03' }), // loss
      match('m3', TEAM_ID, 't4', TEAM_ID, { date: '2024-01-02' }), // win → break
      match('m4', TEAM_ID, 't5', 't5', { date: '2024-01-01' }), // loss (not counted)
    ];
    expect(calculateStreak(TEAM_ID, matches)).toBe('L2');
  });
});
