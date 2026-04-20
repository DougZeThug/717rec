import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { Team } from '@/types';

import { scheduleEven } from '../scheduleEven';
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

describe('scheduleEven', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pairs all 4 teams across S1 and S2', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const { matches } = scheduleEven({
      teams,
      sortedTeams: teams,
      slot1: 'S1',
      slot2: 'S2',
      playedSet: new Set(),
      tonightPairs: new Set(),
      newPairs: new Set(),
      teamMatchCounts: matchCounts,
      forbiddenPairs: undefined,
      maxTierGap: 1,
      relaxationLevel: 0,
      perTeamRematchAllowed: new Set(),
      diagnostics: makeDiagnostics(),
    });

    expect(matches).toHaveLength(4); // 4 teams × 2 slots = 4 matches (2 per slot)
    const allPairedIds = matches.flatMap((m) => [m.teamAId, m.teamBId]);
    // Each team appears in exactly 2 matches
    const idCounts = new Map<string, number>();
    for (const id of allPairedIds) idCounts.set(id, (idCounts.get(id) || 0) + 1);
    expect([...idCounts.values()].every((c) => c === 2)).toBe(true);
  });

  it('no team appears twice in the same slot', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const { matches } = scheduleEven({
      teams,
      sortedTeams: teams,
      slot1: 'S1',
      slot2: 'S2',
      playedSet: new Set(),
      tonightPairs: new Set(),
      newPairs: new Set(),
      teamMatchCounts: matchCounts,
      forbiddenPairs: undefined,
      maxTierGap: 1,
      relaxationLevel: 0,
      perTeamRematchAllowed: new Set(),
      diagnostics: makeDiagnostics(),
    });

    for (const slotName of ['S1', 'S2']) {
      const slotMatches = matches.filter((m) => m.slot === slotName);
      const slotIds = slotMatches.flatMap((m) => [m.teamAId, m.teamBId]);
      expect(new Set(slotIds).size).toBe(slotIds.length); // no duplicates
    }
  });

  it('assigns correct slot names', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const { matches } = scheduleEven({
      teams,
      sortedTeams: teams,
      slot1: '8:30',
      slot2: '9:00',
      playedSet: new Set(),
      tonightPairs: new Set(),
      newPairs: new Set(),
      teamMatchCounts: matchCounts,
      forbiddenPairs: undefined,
      maxTierGap: 1,
      relaxationLevel: 0,
      perTeamRematchAllowed: new Set(),
      diagnostics: makeDiagnostics(),
    });

    const slotNames = new Set(matches.map((m) => m.slot));
    expect(slotNames.has('8:30')).toBe(true);
    expect(slotNames.has('9:00')).toBe(true);
  });
});
