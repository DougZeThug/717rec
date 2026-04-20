import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { Team } from '@/types';

import { scheduleOdd } from '../scheduleOdd';
import { GreedySchedulerResult } from '../types';

function makeTeam(id: string, divisionName = 'Competitive'): Team {
  return {
    id,
    name: `Team ${id}`,
    division_id: `div-${id}`,
    divisionName,
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    created_at: new Date().toISOString(),
  } as Team;
}

function makeDiagnostics(): GreedySchedulerResult['diagnostics'] {
  return {
    relaxationApplied: 0,
    constraintsRelaxed: [],
    repairAttempted: false,
    rematchesRepaired: 0,
    perTeamRematchAllowances: [],
  };
}

describe('scheduleOdd', () => {
  beforeEach(() => vi.clearAllMocks());

  it('produces 3 total matches for 3 same-tier teams', () => {
    const teams = ['a', 'b', 'c'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = scheduleOdd({
      teams,
      sortedTeams: teams,
      slot1: 'S1',
      slot2: 'S2',
      thirdSlot: 'S3',
      playedSet: new Set(),
      tonightPairs: new Set(),
      newPairs: new Set(),
      teamMatchCounts: matchCounts,
      maxTierGap: 1,
      byeStrategy: 'last',
      relaxationLevel: 0,
      perTeamRematchAllowed: new Set(),
      diagnostics: makeDiagnostics(),
    });

    // 3 teams: S1 has 1 match (2 teams), S2 has 1 match (2 teams), S3 has 1 bye match
    expect(matches).toHaveLength(3);
  });

  it('includes a S3 match with the two bye teams', () => {
    const teams = ['a', 'b', 'c'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = scheduleOdd({
      teams,
      sortedTeams: teams,
      slot1: 'S1',
      slot2: 'S2',
      thirdSlot: 'S3',
      playedSet: new Set(),
      tonightPairs: new Set(),
      newPairs: new Set(),
      teamMatchCounts: matchCounts,
      maxTierGap: 1,
      byeStrategy: 'last',
      relaxationLevel: 0,
      perTeamRematchAllowed: new Set(),
      diagnostics: makeDiagnostics(),
    });

    const s3Match = matches.find((m) => m.slot === 'S3');
    expect(s3Match).toBeDefined();
  });

  it('all 3 teams appear in the match list', () => {
    const teams = ['a', 'b', 'c'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = scheduleOdd({
      teams,
      sortedTeams: teams,
      slot1: 'S1',
      slot2: 'S2',
      thirdSlot: 'S3',
      playedSet: new Set(),
      tonightPairs: new Set(),
      newPairs: new Set(),
      teamMatchCounts: matchCounts,
      maxTierGap: 1,
      byeStrategy: 'last',
      relaxationLevel: 0,
      perTeamRematchAllowed: new Set(),
      diagnostics: makeDiagnostics(),
    });

    const allIds = new Set(matches.flatMap((m) => [m.teamAId, m.teamBId]));
    expect(allIds.has('a')).toBe(true);
    expect(allIds.has('b')).toBe(true);
    expect(allIds.has('c')).toBe(true);
  });
});
