import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { pairKey } from '../pairKey';
import { scheduleEven } from '../scheduleEven';
import {
  expectEveryTeamPlaysExactly,
  expectForbiddenPairsAbsent,
  expectNoDuplicatePairs,
  expectNoTeamDoubleBookedPerSlot,
  makeDiagnostics,
  makeTeam,
} from './testHelpers';

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

    expect(matches).toHaveLength(4);
    expectEveryTeamPlaysExactly(matches, ['a', 'b', 'c', 'd'], 2);
  });

  it('keeps every team to one match per slot for larger even schedules', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => makeTeam(id));
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

    expect(matches).toHaveLength(6);
    expectEveryTeamPlaysExactly(
      matches,
      teams.map((team) => team.id),
      2
    );
    expectNoTeamDoubleBookedPerSlot(matches, ['S1', 'S2']);
    expectNoDuplicatePairs(matches);
  });

  it('does not schedule forbidden pairs across either slot', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const forbiddenPairs = new Set([pairKey('a', 'b')]);
    const tonightPairs = new Set(forbiddenPairs);
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const { matches } = scheduleEven({
      teams,
      sortedTeams: teams,
      slot1: 'S1',
      slot2: 'S2',
      playedSet: new Set(),
      tonightPairs,
      newPairs: new Set(),
      teamMatchCounts: matchCounts,
      forbiddenPairs,
      maxTierGap: 1,
      relaxationLevel: 0,
      perTeamRematchAllowed: new Set(),
      diagnostics: makeDiagnostics(),
    });

    expect(matches).toHaveLength(4);
    expectForbiddenPairsAbsent(matches, forbiddenPairs);
    expectNoTeamDoubleBookedPerSlot(matches, ['S1', 'S2']);
  });

  it('relaxes tier constraints when strict tiers cannot fill both slots', () => {
    const teams = [
      makeTeam('a', 'Competitive'),
      makeTeam('b', 'Competitive'),
      makeTeam('c', 'Recreational'),
      makeTeam('d', 'Recreational'),
    ];
    const diagnostics = makeDiagnostics();
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const { matches, relaxationLevel } = scheduleEven({
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
      diagnostics,
    });

    expect(matches).toHaveLength(4);
    expect(relaxationLevel).toBeGreaterThanOrEqual(1);
    expect(diagnostics.relaxationApplied).toBeGreaterThanOrEqual(1);
    expect(diagnostics.constraintsRelaxed).toContain('tier_constraints');
    expectNoTeamDoubleBookedPerSlot(matches, ['S1', 'S2']);
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
