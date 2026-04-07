import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

vi.mock('@/utils/logger', () => ({ teamLog: vi.fn() }));
vi.mock('@/utils/teamDetailsUtils/gameStatsUtils', () => ({
  calculateGameStats: vi.fn(() => ({
    gamesWon: 10,
    gamesLost: 5,
    gameWinPercentage: 10 / 15,
    closeMatchLosses: 1,
  })),
}));
vi.mock('../divisionWeightsCache', () => ({ getDefaultDivisionWeight: () => 0.85 }));

import { createRankingObject } from '../createRankingObject';

const makeTeam = (id: string, overrides: Partial<Team> = {}): Team =>
  ({
    id,
    name: `Team ${id}`,
    wins: 5,
    losses: 3,
    division_id: 'div-1',
    divisionName: 'Division A',
    power_score: 75.5,
    ...overrides,
  }) as Team;

describe('createRankingObject', () => {
  const divisionWeights = new Map([['div-1', 0.9]]);

  it('creates a ranking object with all required fields populated', () => {
    const t = makeTeam('t1');
    const result = createRankingObject(t, [t, makeTeam('t2')], [], {}, divisionWeights);

    expect(result.teamId).toBe('t1');
    expect(result.teamName).toBe('Team t1');
    expect(result.wins).toBe(5);
    expect(result.losses).toBe(3);
    expect(result.winPercentage).toBeCloseTo(5 / 8);
    expect(result.powerScore).toBe(75.5);
    expect(result.gamesWon).toBe(10);
    expect(result.gamesLost).toBe(5);
    expect(result.divisionName).toBe('Division A');
  });

  it('returns winPercentage of 0 when team has no wins and no losses', () => {
    const t = makeTeam('t1', { wins: 0, losses: 0 });
    const result = createRankingObject(t, [t], [], {}, divisionWeights);
    expect(result.winPercentage).toBe(0);
  });

  it('uses power_score from team object directly', () => {
    const t = makeTeam('t1', { power_score: 42.5 });
    const result = createRankingObject(t, [t], [], {}, divisionWeights);
    expect(result.powerScore).toBe(42.5);
  });

  it('defaults powerScore to 0 when team.power_score is undefined', () => {
    const t = makeTeam('t1', { power_score: undefined });
    const result = createRankingObject(t, [t], [], {}, divisionWeights);
    expect(result.powerScore).toBe(0);
  });

  it('sets previousRank and initialises rankChange to 0 before sorting', () => {
    const t = makeTeam('t1');
    const result = createRankingObject(t, [t], [], { t1: 3 }, divisionWeights);
    expect(result.previousRank).toBe(3);
    expect(result.rankChange).toBe(0);
  });

  it('sets rankChange to undefined when no previous rank exists', () => {
    const t = makeTeam('t1');
    const result = createRankingObject(t, [t], [], {}, divisionWeights);
    expect(result.rankChange).toBeUndefined();
  });
});
