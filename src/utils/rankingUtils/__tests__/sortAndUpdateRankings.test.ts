import { describe, expect, it } from 'vitest';

import type { Ranking } from '@/types';

import { sortAndUpdateRankings } from '../sortAndUpdateRankings';

const ranking = (teamId: string, powerScore: number | null, previousRank?: number): Ranking =>
  ({
    teamId,
    teamName: `Team ${teamId}`,
    wins: 0,
    losses: 0,
    winPercentage: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameWinPercentage: 0,
    sos: 0.5,
    powerScore: powerScore as number,
    headToHead: {},
    closeMatchLosses: 0,
    previousRank,
  }) as Ranking;

describe('sortAndUpdateRankings', () => {
  it('sorts by powerScore descending', () => {
    const input = [ranking('c', 60), ranking('a', 90), ranking('b', 75)];
    const result = sortAndUpdateRankings(input, {});
    expect(result.map((r) => r.teamId)).toEqual(['a', 'b', 'c']);
  });

  it('puts null powerScores at the end', () => {
    const input = [ranking('null-team', null), ranking('top', 80)];
    const result = sortAndUpdateRankings(input, {});
    expect(result[0].teamId).toBe('top');
    expect(result[1].teamId).toBe('null-team');
  });

  it('computes positive rankChange when team moved up', () => {
    // team-a was rank 3, now sorted to rank 1 → rankChange = 3 - 1 = +2
    const input = [ranking('a', 90, 3), ranking('b', 75, 1), ranking('c', 60, 2)];
    const result = sortAndUpdateRankings(input, {});
    expect(result[0].rankChange).toBe(2);
  });

  it('computes negative rankChange when team moved down', () => {
    // team-b was rank 1, now sorted to rank 2 → rankChange = 1 - 2 = -1
    const input = [ranking('a', 90, 3), ranking('b', 75, 1), ranking('c', 60, 2)];
    const result = sortAndUpdateRankings(input, {});
    expect(result[1].rankChange).toBe(-1);
  });

  it('returns rankChange of 0 when rank is unchanged', () => {
    const input = [ranking('a', 90, 1)];
    const result = sortAndUpdateRankings(input, {});
    expect(result[0].rankChange).toBe(0);
  });

  it('handles empty rankings array', () => {
    expect(sortAndUpdateRankings([], {})).toEqual([]);
  });
});
