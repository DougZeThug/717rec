import { describe, expect, it } from 'vitest';

import type { Match } from '@/types';

import { calculateLeagueMatchStats, EMPTY_LEAGUE_MATCH_STATS } from '../leagueMatchStats';

const match = (
  id: string,
  team1Id: string,
  team2Id: string,
  team1Games: number,
  team2Games: number
): Match => ({
  id,
  team1Id,
  team2Id,
  iscompleted: true,
  winnerId: team1Games > team2Games ? team1Id : team2Id,
  loserId: team1Games > team2Games ? team2Id : team1Id,
  team1_game_wins: team1Games,
  team2_game_wins: team2Games,
});

describe('calculateLeagueMatchStats', () => {
  it('returns an empty map for no matches', () => {
    expect(calculateLeagueMatchStats(undefined).size).toBe(0);
    expect(calculateLeagueMatchStats([]).size).toBe(0);
  });

  it('measures both sides of every match in one pass', () => {
    const stats = calculateLeagueMatchStats([
      match('m1', 'a', 'b', 2, 0), // a sweeps b
      match('m2', 'b', 'a', 2, 1), // b wins a game 3
      match('m3', 'a', 'c', 2, 1), // a wins a game 3
    ]);

    // a: 3 matches, 1 sweep => 33.3%. Two game 3s, one won => 50%.
    expect(stats.get('a')!.sweepRate).toBeCloseTo(100 / 3, 5);
    expect(stats.get('a')!.game3Matches).toBe(2);
    expect(stats.get('a')!.clutchWinPct).toBeCloseTo(50, 5);

    // b: 2 matches, no sweep. One game 3, won.
    expect(stats.get('b')!.sweepRate).toBe(0);
    expect(stats.get('b')!.clutchWinPct).toBe(100);

    // c: 1 match, lost a game 3.
    expect(stats.get('c')!.game3Matches).toBe(1);
    expect(stats.get('c')!.clutchWinPct).toBe(0);
  });

  it('reports no game 3s for a team that has only played sweeps', () => {
    const stats = calculateLeagueMatchStats([match('m1', 'a', 'b', 2, 0)]);

    // Zero game 3s means there is no clutch rate — not a rate of zero.
    expect(stats.get('a')!.game3Matches).toBe(0);
    expect(stats.get('b')!.game3Matches).toBe(0);
  });

  it('leaves out an unplayed match', () => {
    const stats = calculateLeagueMatchStats([
      { id: 'm1', team1Id: 'a', team2Id: 'b', iscompleted: false },
    ]);

    expect(stats.get('a')!.sweepRate).toBe(0);
    expect(stats.get('a')!.game3Matches).toBe(0);
  });

  it('exposes a zeroed default for a team with no matches at all', () => {
    expect(EMPTY_LEAGUE_MATCH_STATS).toEqual({
      sweepRate: 0,
      clutchWinPct: 0,
      game3Matches: 0,
    });
  });
});
