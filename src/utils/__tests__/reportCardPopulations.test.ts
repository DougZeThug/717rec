import { describe, expect, it } from 'vitest';

import type { Ranking } from '@/types';
import type { CareerRanking } from '@/types/career';
import type { LeagueTeamMatchStats } from '@/utils/teamDetailsUtils/leagueMatchStats';

import {
  collectCareerPopulations,
  collectSeasonPopulations,
  isCareerGradeable,
} from '../reportCardPopulations';

const ranking = (overrides: Partial<Ranking>): Ranking =>
  ({
    teamId: 'team-1',
    teamName: 'Team One',
    wins: 5,
    losses: 5,
    winPercentage: 0.5,
    gamesWon: 10,
    gamesLost: 10,
    gameWinPercentage: 0.5,
    sos: 0.5,
    powerScore: 50,
    headToHead: {},
    closeMatchLosses: 0,
    ...overrides,
  }) as Ranking;

const careerRanking = (overrides: Partial<CareerRanking>): CareerRanking =>
  ({
    teamId: 'team-1',
    teamName: 'Team One',
    careerMatchWins: 5,
    careerMatchLosses: 5,
    careerWinPercentage: 0.5,
    careerGameWinPercentage: 0.5,
    careerSweepRate: 20,
    careerClutchWinPct: 50,
    careerClutchGame3s: 4,
    careerPowerScore: 50,
    careerSos: 0.5,
    ...overrides,
  }) as CareerRanking;

const stats = (overrides: Partial<LeagueTeamMatchStats> = {}): LeagueTeamMatchStats => ({
  sweepRate: 0,
  clutchWinPct: 0,
  game3Matches: 0,
  ...overrides,
});

describe('collectSeasonPopulations', () => {
  it('returns every list in the order the teams were given', () => {
    const rankings = [
      ranking({
        teamId: 'a',
        powerScore: 90,
        winPercentage: 0.9,
        sos: 0.8,
        gameWinPercentage: 0.7,
      }),
      ranking({
        teamId: 'b',
        powerScore: 10,
        winPercentage: 0.1,
        sos: 0.2,
        gameWinPercentage: 0.3,
      }),
    ];
    const matchStats = new Map([
      ['a', stats({ sweepRate: 75, clutchWinPct: 100, game3Matches: 2 })],
      ['b', stats({ sweepRate: 25, clutchWinPct: 0, game3Matches: 2 })],
    ]);

    const populations = collectSeasonPopulations(rankings, matchStats);

    expect(populations).toEqual({
      powerScores: [90, 10],
      winPcts: [0.9, 0.1],
      sos: [0.8, 0.2],
      gameWinPcts: [0.7, 0.3],
      sweepRates: [75, 25],
      clutchRates: [100, 0],
    });
  });

  it('leaves a team with no game 3 out of the clutch list only', () => {
    // The clutch list is deliberately shorter than the rest: a team with no
    // deciding game has no rate, and counting it as a zero would drag every
    // other team's rank down.
    const rankings = [
      ranking({ teamId: 'played' }),
      ranking({ teamId: 'never' }),
      ranking({ teamId: 'also-played' }),
    ];
    const matchStats = new Map([
      ['played', stats({ sweepRate: 10, clutchWinPct: 80, game3Matches: 5 })],
      ['never', stats({ sweepRate: 90, clutchWinPct: 0, game3Matches: 0 })],
      ['also-played', stats({ sweepRate: 50, clutchWinPct: 20, game3Matches: 1 })],
    ]);

    const populations = collectSeasonPopulations(rankings, matchStats);

    expect(populations.clutchRates).toEqual([80, 20]);
    expect(populations.sweepRates).toEqual([10, 90, 50]);
    expect(populations.sweepRates).toHaveLength(3);
  });

  it('falls back to zeroed statistics for a rated team with no matches in the list', () => {
    // Rated, so it is graded — but nothing in the match list mentions it, which
    // is what happens for a team whose matches are all still in progress.
    const populations = collectSeasonPopulations([ranking({ teamId: 'ghost' })], new Map());

    expect(populations.sweepRates).toEqual([0]);
    expect(populations.clutchRates).toEqual([]);
  });

  // Raised in review of the B-36 fix: a team with no power score used to be
  // pushed in as a 0, which both graded a team that had played nothing and
  // padded the population every other team is ranked against.
  it('leaves a team with no power score out of every list', () => {
    const populations = collectSeasonPopulations(
      [ranking({ teamId: 'unrated', powerScore: null })],
      new Map()
    );

    expect(populations).toEqual({
      powerScores: [],
      winPcts: [],
      sos: [],
      gameWinPcts: [],
      sweepRates: [],
      clutchRates: [],
    });
  });

  it('stops an unrated team flattering the teams that have played', () => {
    // Two rated teams, one unrated. The unrated team used to contribute a 0 to
    // powerScores, so the weaker rated team looked better than it was.
    const rated = [
      ranking({ teamId: 'strong', powerScore: 80 }),
      ranking({ teamId: 'weak', powerScore: 40 }),
    ];
    const withUnrated = [...rated, ranking({ teamId: 'unrated', powerScore: null })];

    expect(collectSeasonPopulations(withUnrated, new Map()).powerScores).toEqual(
      collectSeasonPopulations(rated, new Map()).powerScores
    );
    // The old behaviour produced [80, 40, 0] — a third value below 'weak'.
    expect(collectSeasonPopulations(withUnrated, new Map()).powerScores).toEqual([80, 40]);
  });

  it('returns empty lists for no teams', () => {
    expect(collectSeasonPopulations([], new Map())).toEqual({
      powerScores: [],
      winPcts: [],
      sos: [],
      gameWinPcts: [],
      sweepRates: [],
      clutchRates: [],
    });
  });
});

describe('collectCareerPopulations', () => {
  it('returns every list in the order the teams were given', () => {
    const populations = collectCareerPopulations([
      careerRanking({
        teamId: 'a',
        careerPowerScore: 80,
        careerWinPercentage: 0.8,
        careerSos: 0.7,
        careerGameWinPercentage: 0.6,
        careerSweepRate: 40,
        careerClutchWinPct: 90,
      }),
      careerRanking({
        teamId: 'b',
        careerPowerScore: 30,
        careerWinPercentage: 0.3,
        careerSos: 0.4,
        careerGameWinPercentage: 0.2,
        careerSweepRate: 10,
        careerClutchWinPct: 25,
      }),
    ]);

    expect(populations).toEqual({
      powerScores: [80, 30],
      winPcts: [0.8, 0.3],
      sos: [0.7, 0.4],
      gameWinPcts: [0.6, 0.2],
      sweepRates: [40, 10],
      clutchRates: [90, 25],
    });
  });

  it('leaves a team with no career game 3 out of the clutch list only', () => {
    const populations = collectCareerPopulations([
      careerRanking({ teamId: 'none', careerClutchGame3s: 0, careerClutchWinPct: 0 }),
      careerRanking({ teamId: 'some', careerClutchGame3s: 3, careerClutchWinPct: 66 }),
    ]);

    expect(populations.clutchRates).toEqual([66]);
    expect(populations.powerScores).toHaveLength(2);
  });

  // The career twin of the season case above. A team that has never played gets
  // a career power score of 0 rather than null, so it cannot be spotted by the
  // score — it is counted out by its career match record instead.
  it('leaves a team that has never played a career match out of every list', () => {
    const populations = collectCareerPopulations([
      careerRanking({
        teamId: 'never-played',
        careerMatchWins: 0,
        careerMatchLosses: 0,
        careerPowerScore: 0,
        careerWinPercentage: 0,
        careerGameWinPercentage: 0,
        careerSweepRate: 0,
        careerClutchGame3s: 0,
      }),
    ]);

    expect(populations).toEqual({
      powerScores: [],
      winPcts: [],
      sos: [],
      gameWinPcts: [],
      sweepRates: [],
      clutchRates: [],
    });
  });

  it('stops a team that has never played flattering the teams that have', () => {
    const played = [
      careerRanking({ teamId: 'strong', careerPowerScore: 80 }),
      careerRanking({ teamId: 'weak', careerPowerScore: 40 }),
    ];
    const withNewcomer = [
      ...played,
      careerRanking({
        teamId: 'newcomer',
        careerMatchWins: 0,
        careerMatchLosses: 0,
        careerPowerScore: 0,
      }),
    ];

    expect(collectCareerPopulations(withNewcomer).powerScores).toEqual(
      collectCareerPopulations(played).powerScores
    );
    // The old behaviour produced [80, 40, 0] — a third value at the very floor,
    // which lifted every real team's percentile.
    expect(collectCareerPopulations(withNewcomer).powerScores).toEqual([80, 40]);
  });

  it('counts a team that has only ever lost, because it did play', () => {
    const populations = collectCareerPopulations([
      careerRanking({
        teamId: 'winless',
        careerMatchWins: 0,
        careerMatchLosses: 6,
        careerWinPercentage: 0,
      }),
    ]);

    expect(populations.powerScores).toHaveLength(1);
    expect(populations.winPcts).toEqual([0]);
  });

  it('returns empty lists for no teams', () => {
    expect(collectCareerPopulations([]).clutchRates).toEqual([]);
  });
});

describe('isCareerGradeable', () => {
  it.each([
    ['a team with wins and losses', 4, 2, true],
    ['a team that has only won', 3, 0, true],
    ['a team that has only lost', 0, 3, true],
    ['a team that has never played', 0, 0, false],
  ])('%s', (_label, careerMatchWins, careerMatchLosses, expected) => {
    expect(isCareerGradeable({ careerMatchWins, careerMatchLosses })).toBe(expected);
  });
});
