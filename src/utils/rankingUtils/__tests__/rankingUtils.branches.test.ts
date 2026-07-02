import { describe, expect, it, vi } from 'vitest';

import type { Match, Team } from '@/types';

vi.mock('@/utils/logger', () => ({ teamLog: vi.fn() }));
vi.mock('@/utils/teamDetailsUtils/gameStatsUtils', () => ({
  calculateGameStats: vi.fn(() => ({
    gamesWon: 4,
    gamesLost: 2,
    gameWinPercentage: 4 / 6,
    closeMatchLosses: 0,
  })),
}));
vi.mock('../divisionWeightsCache', () => ({ getDefaultDivisionWeight: () => 0.85 }));

import { calculateHeadToHead } from '../calculateHeadToHead';
import { calculateSOS } from '../calculateSOS';
import { calculateStreak } from '../calculateStreak';
import { createRankingObject } from '../createRankingObject';

const team = (id: string, overrides: Partial<Team> = {}): Team =>
  ({ id, name: `Team ${id}`, ...overrides }) as Team;
const match = (
  id: string,
  t1: string,
  t2: string,
  winner: string | null,
  extra: Partial<Match> = {}
): Match =>
  ({ id, team1Id: t1, team2Id: t2, winnerId: winner, iscompleted: true, ...extra }) as Match;

describe('calculateHeadToHead edge cases', () => {
  const T = 't1';

  it('returns empty map when allMatches is undefined', () => {
    expect(calculateHeadToHead(T, [team('t2')], undefined)).toEqual({});
  });

  it('returns empty map when allTeams is empty', () => {
    expect(calculateHeadToHead(T, [], [match('m1', T, 't2', T)])).toEqual({});
  });

  it('skips team entries without an id and null entries', () => {
    const teams = [
      team('t2'),
      { name: 'No Id Team' } as Team,
      null as unknown as Team,
    ];
    const result = calculateHeadToHead(T, teams, []);
    expect(Object.keys(result)).toEqual(['t2']);
  });

  it('labels opponents without a name as "Unknown Team"', () => {
    const result = calculateHeadToHead(T, [team('t2', { name: undefined })], []);
    expect(result['t2'].opponentName).toBe('Unknown Team');
  });

  it('records neither a win nor a loss for a tie (winnerId is a third party or null)', () => {
    const result = calculateHeadToHead(
      T,
      [team('t2')],
      [match('m1', T, 't2', null), match('m2', T, 't2', 'someone-else')]
    );
    expect(result['t2']).toEqual({ opponentName: 'Team t2', wins: 0, losses: 0 });
  });

  it('ignores matches against opponents that are not in allTeams', () => {
    const result = calculateHeadToHead(T, [team('t2')], [match('m1', T, 'ghost-team', T)]);
    expect(result['t2']).toEqual({ opponentName: 'Team t2', wins: 0, losses: 0 });
    expect(result['ghost-team']).toBeUndefined();
  });

  it('ignores matches not involving the team and null match entries', () => {
    const matches = [match('m1', 't2', 't3', 't2'), null as unknown as Match];
    const result = calculateHeadToHead(T, [team('t2'), team('t3')], matches);
    expect(result['t2'].wins).toBe(0);
    expect(result['t3'].wins).toBe(0);
  });

  it('counts a loss when the team plays as team2 and loses', () => {
    const result = calculateHeadToHead(T, [team('t2')], [match('m1', 't2', T, 't2')]);
    expect(result['t2'].losses).toBe(1);
  });
});

describe('calculateSOS edge cases', () => {
  it('returns 0.5 when team is null/undefined', () => {
    expect(
      calculateSOS(null as unknown as Team, [team('t2')], [], new Map())
    ).toBe(0.5);
  });

  it('returns 0.5 when allMatches is undefined', () => {
    const t1 = team('t1', { division_id: 'div-1' });
    expect(calculateSOS(t1, [t1, team('t2')], undefined, new Map())).toBe(0.5);
  });

  it('resolves the opponent from team1Id when the team played as team2', () => {
    const t1 = team('t1', { division_id: 'div-1' });
    const t2 = team('t2', { division_id: 'div-2' });
    const weights = new Map([['div-2', 0.95]]);
    const sos = calculateSOS(t1, [t1, t2], [match('m1', 't2', 't1', 't1')], weights);
    expect(sos).toBe(0.95);
  });

  it('returns 0.5 when no opponents can be resolved from allTeams', () => {
    const t1 = team('t1', { division_id: 'div-1' });
    const sos = calculateSOS(t1, [t1], [match('m1', 't1', 'ghost', 't1')], new Map());
    expect(sos).toBe(0.5);
  });
});

describe('calculateStreak edge cases', () => {
  const T = 't1';

  it('handles matches with no date (falls back to epoch 0 ordering)', () => {
    expect(calculateStreak(T, [match('m1', T, 't2', T)])).toBe('W1');
  });

  it('sorts undated matches after dated ones (most recent dated match leads)', () => {
    const matches = [
      match('m-old', T, 't2', 't2'), // no date → treated as oldest
      match('m-new', T, 't3', T, { date: '2024-05-01' }),
    ];
    // Most recent (dated) match is a win, older undated match is a loss → W1
    expect(calculateStreak(T, matches)).toBe('W1');
  });

  it('counts a streak when the team plays as team2', () => {
    const matches = [
      match('m1', 't2', T, T, { date: '2024-01-02' }),
      match('m2', 't3', T, T, { date: '2024-01-01' }),
    ];
    expect(calculateStreak(T, matches)).toBe('W2');
  });

  it('stops counting at the first result that breaks the streak', () => {
    const matches = [
      match('m1', T, 't2', 't2', { date: '2024-01-04' }), // loss (most recent)
      match('m2', T, 't3', 't3', { date: '2024-01-03' }), // loss
      match('m3', T, 't4', T, { date: '2024-01-02' }), // win → break
      match('m4', T, 't5', 't5', { date: '2024-01-01' }), // loss (not counted)
    ];
    expect(calculateStreak(T, matches)).toBe('L2');
  });
});

describe('createRankingObject edge cases', () => {
  const weights = new Map([['div-1', 0.9]]);

  it('falls back to "Unknown Team" when the team has no name', () => {
    const t = team('t1', { name: undefined, wins: 1, losses: 1 });
    const result = createRankingObject(t, [t], [], {}, weights);
    expect(result.teamName).toBe('Unknown Team');
  });

  it('coerces non-numeric wins/losses to 0', () => {
    const t = team('t1', {
      wins: 'garbage' as unknown as number,
      losses: undefined,
    });
    const result = createRankingObject(t, [t], [], {}, weights);
    expect(result.wins).toBe(0);
    expect(result.losses).toBe(0);
    expect(result.winPercentage).toBe(0);
  });

  it('includes streak and head-to-head computed from matches', () => {
    const t1 = team('t1', { wins: 1, losses: 0, division_id: 'div-1' });
    const t2 = team('t2', { division_id: 'div-1' });
    const matches = [match('m1', 't1', 't2', 't1', { date: '2024-01-01' })];
    const result = createRankingObject(t1, [t1, t2], matches, {}, weights);
    expect(result.streak).toBe('W1');
    expect(result.headToHead['t2']).toEqual({
      opponentName: 'Team t2',
      wins: 1,
      losses: 0,
    });
    expect(result.sos).toBe(0.9);
  });

  it('passes through logo and image urls', () => {
    const t = team('t1', {
      wins: 0,
      losses: 0,
      logoUrl: 'logo.png',
      imageUrl: 'image.png',
    });
    const result = createRankingObject(t, [t], [], {}, weights);
    expect(result.logoUrl).toBe('logo.png');
    expect(result.imageUrl).toBe('image.png');
  });
});
