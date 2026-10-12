import { describe, expect, it } from 'vitest';

import type { Ranking } from '@/types';

// Import through the barrel so index.ts re-exports are exercised too.
import { sortRankings, updateRankChanges } from '../index';

const ranking = (overrides: Partial<Ranking> = {}): Ranking =>
  ({
    teamId: 'team-1',
    teamName: 'Team One',
    wins: 0,
    losses: 0,
    winPercentage: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameWinPercentage: 0,
    sos: 0.5,
    powerScore: 50,
    headToHead: {},
    closeMatchLosses: 0,
    ...overrides,
  }) as Ranking;

describe('sortRankings (field/direction branches)', () => {
  const teams = [
    ranking({
      teamId: 'a',
      teamName: 'Alpha',
      wins: 2,
      winPercentage: 0.4,
      sos: 0.7,
      powerScore: 55,
    }),
    ranking({
      teamId: 'b',
      teamName: 'Bravo',
      wins: 8,
      winPercentage: 0.9,
      sos: 0.5,
      powerScore: 80,
    }),
    ranking({
      teamId: 'c',
      teamName: 'Charlie',
      wins: 5,
      winPercentage: 0.6,
      sos: 0.9,
      powerScore: 65,
    }),
  ];

  it('sorts by winPercentage descending', () => {
    const result = sortRankings(teams, 'winPercentage', 'desc');
    expect(result.map((r) => r.teamId)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by winPercentage ascending', () => {
    const result = sortRankings(teams, 'winPercentage', 'asc');
    expect(result.map((r) => r.teamId)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by sos descending', () => {
    const result = sortRankings(teams, 'sos', 'desc');
    expect(result.map((r) => r.teamId)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by wins descending', () => {
    const result = sortRankings(teams, 'wins', 'desc');
    expect(result.map((r) => r.teamId)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by teamName ascending (alphabetical)', () => {
    const result = sortRankings(teams, 'teamName', 'asc');
    expect(result.map((r) => r.teamName)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('sorts by teamName descending (reverse alphabetical)', () => {
    const result = sortRankings(teams, 'teamName', 'desc');
    expect(result.map((r) => r.teamName)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  it('falls back to powerScore for an unknown sort field', () => {
    const result = sortRankings(teams, 'somethingElse', 'desc');
    expect(result.map((r) => r.teamId)).toEqual(['b', 'c', 'a']);
  });

  // The four columns of B-34. Games, Game % and Streak had no case of their own
  // and fell through to a power-score sort; the arrow moved, so the control
  // looked like it had worked. See docs/product-description/bug-triage.md.
  describe('columns that used to fall through to power score (B-34)', () => {
    // Power score order is b (80) > a (55) > c (30), so every expectation below
    // that differs from ['b', 'a', 'c'] fails against the old fallback.
    const byGames = [
      ranking({
        teamId: 'a',
        teamName: 'Alpha',
        powerScore: 55,
        gamesWon: 4,
        gameWinPercentage: 0.2,
      }),
      ranking({
        teamId: 'b',
        teamName: 'Bravo',
        powerScore: 80,
        gamesWon: 1,
        gameWinPercentage: 0.9,
      }),
      ranking({
        teamId: 'c',
        teamName: 'Charlie',
        powerScore: 30,
        gamesWon: 9,
        gameWinPercentage: 0.5,
      }),
    ];

    it('sorts by gamesWon descending', () => {
      const result = sortRankings(byGames, 'gamesWon', 'desc');
      expect(result.map((r) => r.teamId)).toEqual(['c', 'a', 'b']);
    });

    it('sorts by gamesWon ascending', () => {
      const result = sortRankings(byGames, 'gamesWon', 'asc');
      expect(result.map((r) => r.teamId)).toEqual(['b', 'a', 'c']);
    });

    it('sorts by gameWinPercentage descending', () => {
      const result = sortRankings(byGames, 'gameWinPercentage', 'desc');
      expect(result.map((r) => r.teamId)).toEqual(['b', 'c', 'a']);
    });

    it('sorts by gameWinPercentage ascending', () => {
      const result = sortRankings(byGames, 'gameWinPercentage', 'asc');
      expect(result.map((r) => r.teamId)).toEqual(['a', 'c', 'b']);
    });

    it('sorts streaks by run length, wins above losses', () => {
      const streaks = [
        ranking({ teamId: 'l9', powerScore: 90, streak: 'L9' }),
        ranking({ teamId: 'w2', powerScore: 20, streak: 'W2' }),
        ranking({ teamId: 'w10', powerScore: 10, streak: 'W10' }),
        ranking({ teamId: 'l1', powerScore: 80, streak: 'L1' }),
      ];

      // W10 > W2 > L1 > L9 — not the string order, and not the power order.
      expect(sortRankings(streaks, 'streak', 'desc').map((r) => r.teamId)).toEqual([
        'w10',
        'w2',
        'l1',
        'l9',
      ]);
      expect(sortRankings(streaks, 'streak', 'asc').map((r) => r.teamId)).toEqual([
        'l9',
        'l1',
        'w2',
        'w10',
      ]);
    });

    it('sorts a team with no streak last in both directions', () => {
      // No completed match — the table shows "N/A". That is "no value", not a
      // run of zero, so it must not land between W1 and L1.
      const streaks = [
        ranking({ teamId: 'none', powerScore: 99, streak: undefined }),
        ranking({ teamId: 'win', powerScore: 10, streak: 'W1' }),
        ranking({ teamId: 'loss', powerScore: 20, streak: 'L1' }),
      ];

      expect(sortRankings(streaks, 'streak', 'desc').map((r) => r.teamId)).toEqual([
        'win',
        'loss',
        'none',
      ]);
      expect(sortRankings(streaks, 'streak', 'asc').map((r) => r.teamId)).toEqual([
        'loss',
        'win',
        'none',
      ]);
    });

    it('keeps power-score order for teams tied on another column', () => {
      const tied = [
        ranking({ teamId: 'low', powerScore: 20, gamesWon: 5 }),
        ranking({ teamId: 'high', powerScore: 90, gamesWon: 5 }),
      ];
      // The array arrives in power-score order and the sort is stable.
      expect(sortRankings(tied, 'gamesWon', 'desc').map((r) => r.teamId)).toEqual(['low', 'high']);
    });
  });

  it('does not mutate the input array', () => {
    const input = [...teams];
    sortRankings(input, 'wins', 'asc');
    expect(input.map((r) => r.teamId)).toEqual(['a', 'b', 'c']);
  });

  it('sorts powerScore ascending while keeping nulls at the end', () => {
    const result = sortRankings(
      [
        ranking({ teamId: 'null-team', powerScore: null as unknown as number }),
        ranking({ teamId: 'high', powerScore: 80 }),
        ranking({ teamId: 'low', powerScore: 20 }),
      ],
      'powerScore',
      'asc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['low', 'high', 'null-team']);
  });

  it('keeps nulls last in descending powerScore order too', () => {
    const result = sortRankings(
      [
        ranking({ teamId: 'high', powerScore: 80 }),
        ranking({ teamId: 'null-team', powerScore: null as unknown as number }),
        ranking({ teamId: 'low', powerScore: 20 }),
      ],
      'powerScore',
      'desc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['high', 'low', 'null-team']);
  });

  it('applies tiebreakers when both powerScores are null (division tier first)', () => {
    const result = sortRankings(
      [
        ranking({
          teamId: 'rec',
          teamName: 'Rec Team',
          divisionName: 'Recreational',
          powerScore: null as unknown as number,
        }),
        ranking({
          teamId: 'comp',
          teamName: 'Comp Team',
          divisionName: 'Competitive',
          powerScore: null as unknown as number,
        }),
      ],
      'powerScore',
      'desc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['comp', 'rec']);
  });

  it('breaks powerScore ties in the same tier by win percentage', () => {
    const result = sortRankings(
      [
        ranking({
          teamId: 'lower-win',
          divisionName: 'Intermediate',
          powerScore: 60,
          winPercentage: 0.4,
        }),
        ranking({
          teamId: 'higher-win',
          divisionName: 'Intermediate',
          powerScore: 60,
          winPercentage: 0.8,
        }),
      ],
      'powerScore',
      'desc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['higher-win', 'lower-win']);
  });

  it('breaks powerScore + tier + win% ties alphabetically by team name', () => {
    const result = sortRankings(
      [
        ranking({
          teamId: 'z',
          teamName: 'Zebras',
          divisionName: 'Intermediate',
          powerScore: 60,
          winPercentage: 0.5,
        }),
        ranking({
          teamId: 'a',
          teamName: 'Aardvarks',
          divisionName: 'Intermediate',
          powerScore: 60,
          winPercentage: 0.5,
        }),
      ],
      'powerScore',
      'desc'
    );
    expect(result.map((r) => r.teamName)).toEqual(['Aardvarks', 'Zebras']);
  });

  it('treats powerScores as equal when they round to the same displayed value', () => {
    const result = sortRankings(
      [
        ranking({
          teamId: 'lower-win',
          divisionName: 'Intermediate',
          powerScore: 60.04, // displays as 60.0
          winPercentage: 0.3,
        }),
        ranking({
          teamId: 'higher-win',
          divisionName: 'Intermediate',
          powerScore: 60.01, // displays as 60.0
          winPercentage: 0.9,
        }),
      ],
      'powerScore',
      'desc'
    );
    // Raw scores differ, but rounded display values tie → win% tiebreaker wins
    expect(result.map((r) => r.teamId)).toEqual(['higher-win', 'lower-win']);
  });

  it('returns 0 (stable) for exact ties on non-powerScore fields', () => {
    const result = sortRankings(
      [ranking({ teamId: 'first', wins: 4 }), ranking({ teamId: 'second', wins: 4 })],
      'wins',
      'desc'
    );
    expect(result.map((r) => r.teamId)).toEqual(['first', 'second']);
  });
});

describe('updateRankChanges', () => {
  it('computes rankChange from previousRank and new position', () => {
    const result = updateRankChanges([
      ranking({ teamId: 'up', previousRank: 3 }), // now rank 1 → +2
      ranking({ teamId: 'down', previousRank: 1 }), // now rank 2 → -1
      ranking({ teamId: 'same', previousRank: 3 }), // now rank 3 → 0
    ]);
    expect(result[0].rankChange).toBe(2);
    expect(result[1].rankChange).toBe(-1);
    expect(result[2].rankChange).toBe(0);
  });

  it('leaves rankChange undefined when previousRank is undefined', () => {
    // A team with no prior ranking has no movement to report, which is different
    // from having moved zero places. undefined is what makes RankTrendIndicator
    // render "-" instead of a literal "0" a new team never earned.
    const result = updateRankChanges([ranking({ teamId: 'new-team' })]);
    expect(result[0].rankChange).toBeUndefined();
  });
});
