import { describe, expect, it } from 'vitest';

import type { Match } from '@/types';

import { calculateStreak } from '../calculateStreak';

const match = (id: string, t1: string, t2: string, winner: string, date: string): Match =>
  ({ id, team1Id: t1, team2Id: t2, winnerId: winner, iscompleted: true, date }) as Match;

describe('calculateStreak', () => {
  const TEAM_ID = 'team-1';

  it('returns undefined for empty matches array', () => {
    expect(calculateStreak(TEAM_ID, [])).toBeUndefined();
  });

  it('returns undefined for undefined allMatches', () => {
    const missingMatches = undefined;
    expect(calculateStreak(TEAM_ID, missingMatches)).toBeUndefined();
  });

  it('returns undefined for empty teamId', () => {
    expect(calculateStreak('', [match('m1', TEAM_ID, 'team-2', TEAM_ID, '2024-01-01')])).toBeUndefined();
  });

  it('returns undefined when no completed matches involve the team', () => {
    const incompleteMatch = {
      id: 'm1',
      team1Id: TEAM_ID,
      team2Id: 'team-2',
      winnerId: TEAM_ID,
      iscompleted: false,
      date: '2024-01-01',
    } as Match;
    expect(calculateStreak(TEAM_ID, [incompleteMatch])).toBeUndefined();
  });

  it('returns W1 for a single win', () => {
    expect(calculateStreak(TEAM_ID, [match('m1', TEAM_ID, 'team-2', TEAM_ID, '2024-01-01')])).toBe('W1');
  });

  it('returns L1 for a single loss', () => {
    expect(calculateStreak(TEAM_ID, [match('m1', TEAM_ID, 'team-2', 'team-2', '2024-01-01')])).toBe('L1');
  });

  it('calculates multi-game winning streak (most recent first)', () => {
    const matches = [
      match('m3', TEAM_ID, 'team-4', 'team-4', '2024-01-01'), // oldest: loss
      match('m2', TEAM_ID, 'team-3', TEAM_ID, '2024-01-02'), // win
      match('m1', TEAM_ID, 'team-2', TEAM_ID, '2024-01-03'), // most recent: win
    ];
    expect(calculateStreak(TEAM_ID, matches)).toBe('W2');
  });

  it('calculates multi-game losing streak', () => {
    const matches = [
      match('m3', TEAM_ID, 'team-4', TEAM_ID, '2024-01-01'), // oldest: win
      match('m2', TEAM_ID, 'team-3', 'team-3', '2024-01-02'), // loss
      match('m1', TEAM_ID, 'team-2', 'team-2', '2024-01-03'), // most recent: loss
    ];
    expect(calculateStreak(TEAM_ID, matches)).toBe('L2');
  });

  it('excludes ties (winnerId undefined) from streak', () => {
    const matches = [
      {
        id: 'm1',
        team1Id: TEAM_ID,
        team2Id: 'team-2',
        winnerId: undefined,
        iscompleted: true,
        date: '2024-01-03',
      } as Match,
      match('m2', TEAM_ID, 'team-3', TEAM_ID, '2024-01-02'),
      match('m3', TEAM_ID, 'team-4', TEAM_ID, '2024-01-01'),
    ];
    // The tie should be skipped; streak should be W2 from the two wins
    expect(calculateStreak(TEAM_ID, matches)).toBe('W2');
  });

  describe('orderKey', () => {
    const keyed = (id: string, winner: string, orderKey: number, date?: string): Match =>
      ({
        id,
        team1Id: TEAM_ID,
        team2Id: 'opponent',
        winnerId: winner,
        iscompleted: true,
        orderKey,
        date,
      }) as Match;

    it('orders by orderKey in preference to date', () => {
      // Dates say the win is most recent; orderKey says the loss is.
      const matches = [
        keyed('win', TEAM_ID, 0, '2024-06-01'),
        keyed('loss', 'opponent', 1, '2024-01-01'),
      ];
      expect(calculateStreak(TEAM_ID, matches)).toBe('L1');
    });

    it('sorts keyed matches after dated ones when keys exceed date timestamps', () => {
      // This is how playoff matches are pinned after the regular season.
      const matches = [
        match('reg-1', TEAM_ID, 'opponent', TEAM_ID, '2024-01-01'),
        match('reg-2', TEAM_ID, 'opponent', TEAM_ID, '2024-01-08'),
        keyed('playoff-loss', 'opponent', Number.MAX_SAFE_INTEGER),
      ];
      expect(calculateStreak(TEAM_ID, matches)).toBe('L1');
    });

    it('handles a keyed match with no date at all', () => {
      const matches = [keyed('only', TEAM_ID, 5)];
      expect(calculateStreak(TEAM_ID, matches)).toBe('W1');
    });
  });
});
