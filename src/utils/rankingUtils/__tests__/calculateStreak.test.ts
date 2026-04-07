import { describe, expect, it } from 'vitest';

import type { Match } from '@/types';

import { calculateStreak } from '../calculateStreak';

const match = (id: string, t1: string, t2: string, winner: string, date: string): Match =>
  ({ id, team1Id: t1, team2Id: t2, winnerId: winner, iscompleted: true, date }) as Match;

describe('calculateStreak', () => {
  const T = 'team-1';

  it('returns undefined for empty matches array', () => {
    expect(calculateStreak(T, [])).toBeUndefined();
  });

  it('returns undefined for undefined allMatches', () => {
    expect(calculateStreak(T, undefined)).toBeUndefined();
  });

  it('returns undefined for empty teamId', () => {
    expect(calculateStreak('', [match('m1', T, 'team-2', T, '2024-01-01')])).toBeUndefined();
  });

  it('returns undefined when no completed matches involve the team', () => {
    const m = {
      id: 'm1',
      team1Id: T,
      team2Id: 'team-2',
      winnerId: T,
      iscompleted: false,
      date: '2024-01-01',
    } as Match;
    expect(calculateStreak(T, [m])).toBeUndefined();
  });

  it('returns W1 for a single win', () => {
    expect(calculateStreak(T, [match('m1', T, 'team-2', T, '2024-01-01')])).toBe('W1');
  });

  it('returns L1 for a single loss', () => {
    expect(calculateStreak(T, [match('m1', T, 'team-2', 'team-2', '2024-01-01')])).toBe('L1');
  });

  it('calculates multi-game winning streak (most recent first)', () => {
    const matches = [
      match('m3', T, 'team-4', 'team-4', '2024-01-01'), // oldest: loss
      match('m2', T, 'team-3', T, '2024-01-02'), // win
      match('m1', T, 'team-2', T, '2024-01-03'), // most recent: win
    ];
    expect(calculateStreak(T, matches)).toBe('W2');
  });

  it('calculates multi-game losing streak', () => {
    const matches = [
      match('m3', T, 'team-4', T, '2024-01-01'), // oldest: win
      match('m2', T, 'team-3', 'team-3', '2024-01-02'), // loss
      match('m1', T, 'team-2', 'team-2', '2024-01-03'), // most recent: loss
    ];
    expect(calculateStreak(T, matches)).toBe('L2');
  });
});
