import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { pairKey } from '../pairKey';
import { scheduleOdd } from '../scheduleOdd';
import {
  expectEveryTeamAppears,
  expectEveryTeamPlaysExactly,
  expectForbiddenPairsAbsent,
  expectNoDuplicatePairs,
  expectNoTeamDoubleBookedPerSlot,
  makeDiagnostics,
  makeTeam,
} from './testHelpers';

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

    expect(matches).toHaveLength(3);
    expectEveryTeamPlaysExactly(
      matches,
      teams.map((team) => team.id),
      2
    );
  });

  it('keeps slot byes distinct and pairs them in the third slot for 5 teams', () => {
    const teams = ['a', 'b', 'c', 'd', 'e'].map((id) => makeTeam(id));
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

    const s1TeamIds = new Set(
      matches
        .filter((match) => match.slot === 'S1')
        .flatMap((match) => [match.teamAId, match.teamBId])
    );
    const s2TeamIds = new Set(
      matches
        .filter((match) => match.slot === 'S2')
        .flatMap((match) => [match.teamAId, match.teamBId])
    );
    const s3Match = matches.find((match) => match.slot === 'S3');
    const bye1 = teams.find((team) => !s1TeamIds.has(team.id));
    const bye2 = teams.find((team) => !s2TeamIds.has(team.id));

    expect(matches.filter((match) => match.slot === 'S1')).toHaveLength(2);
    expect(matches.filter((match) => match.slot === 'S2')).toHaveLength(2);
    expect(s3Match).toBeDefined();
    expect(bye1?.id).not.toBe(bye2?.id);
    expect(new Set([s3Match?.teamAId, s3Match?.teamBId])).toEqual(new Set([bye1?.id, bye2?.id]));
    expectEveryTeamPlaysExactly(
      matches,
      teams.map((team) => team.id),
      2
    );
    expectNoTeamDoubleBookedPerSlot(matches, ['S1', 'S2', 'S3']);
    expectNoDuplicatePairs(matches);
  });

  it('schedules every team exactly twice in a 7-team odd block', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => makeTeam(id));
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

    expect(matches).toHaveLength(7);
    expectEveryTeamAppears(
      matches,
      teams.map((team) => team.id)
    );
    expectEveryTeamPlaysExactly(
      matches,
      teams.map((team) => team.id),
      2
    );
    expectNoTeamDoubleBookedPerSlot(matches, ['S1', 'S2', 'S3']);
  });

  it('does not schedule forbidden pairs in any odd-team slot', () => {
    const teams = ['a', 'b', 'c', 'd', 'e'].map((id) => makeTeam(id));
    const forbiddenPairs = new Set([pairKey('a', 'b')]);
    const tonightPairs = new Set(forbiddenPairs);
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = scheduleOdd({
      teams,
      sortedTeams: teams,
      slot1: 'S1',
      slot2: 'S2',
      thirdSlot: 'S3',
      playedSet: new Set(),
      tonightPairs,
      newPairs: new Set(),
      teamMatchCounts: matchCounts,
      forbiddenPairs,
      maxTierGap: 1,
      byeStrategy: 'last',
      relaxationLevel: 0,
      perTeamRematchAllowed: new Set(),
      diagnostics: makeDiagnostics(),
    });

    expect(matches).toHaveLength(5);
    expectForbiddenPairsAbsent(matches, forbiddenPairs);
    expectNoTeamDoubleBookedPerSlot(matches, ['S1', 'S2', 'S3']);
  });

  it('relaxes constrained bye selection without double-booking teams', () => {
    const teams = [
      makeTeam('a', 'Competitive'),
      makeTeam('b', 'Competitive'),
      makeTeam('c', 'Competitive'),
      makeTeam('d', 'Recreational'),
      makeTeam('e', 'Recreational'),
    ];
    const diagnostics = makeDiagnostics();
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = scheduleOdd({
      teams,
      sortedTeams: teams,
      slot1: 'S1',
      slot2: 'S2',
      thirdSlot: 'S3',
      playedSet: new Set([pairKey('d', 'e')]),
      tonightPairs: new Set(),
      newPairs: new Set(),
      teamMatchCounts: matchCounts,
      maxTierGap: 1,
      byeStrategy: 'last',
      relaxationLevel: 0,
      perTeamRematchAllowed: new Set(),
      diagnostics,
    });

    expect(matches).toHaveLength(5);
    expectEveryTeamPlaysExactly(
      matches,
      teams.map((team) => team.id),
      2
    );
    expectNoTeamDoubleBookedPerSlot(matches, ['S1', 'S2', 'S3']);
  });
});
