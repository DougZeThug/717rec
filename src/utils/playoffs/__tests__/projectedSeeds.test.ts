import { describe, expect, it } from 'vitest';

import type { Ranking } from '@/types';

import { getFinalRegularSeasonWeek, groupSeedsByDivision } from '../projectedSeeds';

const ranked = (
  teamId: string,
  teamName: string,
  divisionName: string | null,
  powerScore: number | null
): Ranking => ({
  teamId,
  teamName,
  wins: 0,
  losses: 0,
  winPercentage: 0,
  gamesWon: 0,
  gamesLost: 0,
  gameWinPercentage: 0,
  sos: 0.5,
  powerScore,
  divisionName,
  headToHead: {},
  closeMatchLosses: 0,
});

describe('groupSeedsByDivision', () => {
  it('numbers each division from 1 and keeps the order it was given', () => {
    const seeds = groupSeedsByDivision([
      ranked('c1', 'Comp One', 'Competitive', 91.2),
      ranked('i1', 'Inter One', 'Intermediate', 74.5),
      ranked('c2', 'Comp Two', 'Competitive', 88.1),
      ranked('i2', 'Inter Two', 'Intermediate', 70.0),
      ranked('c3', 'Comp Three', 'Competitive', 80.4),
    ]);

    expect(seeds.Competitive.map((s) => [s.seed, s.teamName])).toEqual([
      [1, 'Comp One'],
      [2, 'Comp Two'],
      [3, 'Comp Three'],
    ]);
    expect(seeds.Intermediate.map((s) => [s.seed, s.teamName])).toEqual([
      [1, 'Inter One'],
      [2, 'Inter Two'],
    ]);
  });

  it('never re-sorts, so a division keeps the order useTeamRankings produced', () => {
    // Deliberately out of power-score order: the caller's order is the contract.
    const seeds = groupSeedsByDivision([
      ranked('a', 'Lower Score First', 'Competitive', 40),
      ranked('b', 'Higher Score Second', 'Competitive', 95),
    ]);

    expect(seeds.Competitive.map((s) => s.teamName)).toEqual([
      'Lower Score First',
      'Higher Score Second',
    ]);
  });

  it('keeps a null power score as null rather than coercing it to zero', () => {
    const seeds = groupSeedsByDivision([
      ranked('a', 'Scored', 'Recreational', 51.5),
      ranked('b', 'Unscored', 'Recreational', null),
    ]);

    expect(seeds.Recreational[1]).toEqual({
      seed: 2,
      teamId: 'b',
      teamName: 'Unscored',
      powerScore: null,
    });
  });

  it('skips a team with no division', () => {
    const seeds = groupSeedsByDivision([
      ranked('a', 'Placed', 'Competitive', 60),
      ranked('b', 'Unplaced', null, 70),
    ]);

    expect(Object.keys(seeds)).toEqual(['Competitive']);
    expect(seeds.Competitive).toHaveLength(1);
  });

  it('returns an empty map for no rankings', () => {
    expect(groupSeedsByDivision([])).toEqual({});
  });
});

describe('getFinalRegularSeasonWeek', () => {
  it('counts the end date into the week that contains it', () => {
    // 2026-06-02 → 2026-08-04 is 63 days, so the end lands in week 10.
    expect(getFinalRegularSeasonWeek('2026-06-02', '2026-08-04')).toBe(10);
  });

  it('treats the first seven days as weeks 1 and 2, matching useSeasonWeek', () => {
    expect(getFinalRegularSeasonWeek('2026-06-02', '2026-06-02')).toBe(1);
    expect(getFinalRegularSeasonWeek('2026-06-02', '2026-06-08')).toBe(1);
    expect(getFinalRegularSeasonWeek('2026-06-02', '2026-06-09')).toBe(2);
  });

  it('gives no number when the season has no end date', () => {
    expect(getFinalRegularSeasonWeek('2026-06-02', null)).toBeNull();
    expect(getFinalRegularSeasonWeek('2026-06-02', undefined)).toBeNull();
  });

  it('gives no number when the season has no start date', () => {
    expect(getFinalRegularSeasonWeek(null, '2026-08-04')).toBeNull();
    expect(getFinalRegularSeasonWeek(undefined, '2026-08-04')).toBeNull();
  });

  it('gives no number when the end precedes the start', () => {
    expect(getFinalRegularSeasonWeek('2026-08-04', '2026-06-02')).toBeNull();
  });

  it('gives no number for an unreadable date', () => {
    expect(getFinalRegularSeasonWeek('not-a-date', '2026-08-04')).toBeNull();
    expect(getFinalRegularSeasonWeek('2026-06-02', 'not-a-date')).toBeNull();
  });
});
