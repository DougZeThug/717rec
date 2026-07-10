import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { pairKey } from '../pairKey';
import { attemptRepairPass, tryCrossSlotSwap } from '../swapRepair';
import {
  expectEveryTeamPlaysExactly,
  expectNoDuplicatePairs,
  expectNoTeamDoubleBookedPerSlot,
  makeMatch,
  makeTeam,
} from './testHelpers';

describe('attemptRepairPass', () => {
  it('pairs two unmatched same-tier teams', () => {
    const [a, b] = ['a', 'b'].map((id) => makeTeam(id));
    const allTeams = [a, b];
    const tonightPairs = new Set<string>();
    const matchCounts = new Map<string, number>();
    const newPairs = new Set<string>();

    const matches = attemptRepairPass(
      [a, b],
      allTeams,
      'S2',
      new Set(),
      tonightPairs,
      matchCounts,
      1,
      newPairs,
      0
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].teamAId).toBe('a');
    expect(matches[0].teamBId).toBe('b');
    expect(matchCounts.get('a')).toBe(1);
    expect(matchCounts.get('b')).toBe(1);
  });

  it('adds the new pair to tonightPairs and newPairs', () => {
    const [a, b] = ['a', 'b'].map((id) => makeTeam(id));
    const tonightPairs = new Set<string>();
    const matchCounts = new Map<string, number>();
    const newPairs = new Set<string>();

    attemptRepairPass([a, b], [a, b], 'S2', new Set(), tonightPairs, matchCounts, 1, newPairs, 0);

    expect(tonightPairs.has(pairKey('a', 'b'))).toBe(true);
    expect(newPairs.has(pairKey('a', 'b'))).toBe(true);
  });

  it('returns empty array when season rematch is blocked', () => {
    const [a, b] = ['a', 'b'].map((id) => makeTeam(id));
    const played = new Set([pairKey('a', 'b')]);
    const tonightPairs = new Set<string>();
    const matchCounts = new Map<string, number>();
    const newPairs = new Set<string>();

    const matches = attemptRepairPass(
      [a, b],
      [a, b],
      'S2',
      played,
      tonightPairs,
      matchCounts,
      1,
      newPairs,
      0
    );

    expect(matches).toHaveLength(0);
  });

  it('returns empty array for empty unmatched list', () => {
    const matches = attemptRepairPass(
      [],
      [],
      'S2',
      new Set(),
      new Set(),
      new Map(),
      1,
      new Set(),
      0
    );
    expect(matches).toHaveLength(0);
  });
});

describe('tryCrossSlotSwap', () => {
  it('rearranges first-slot matches to unblock a complete second slot', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const teams = [a, b, c, d];
    const result = tryCrossSlotSwap(
      [makeMatch('S1', a, b), makeMatch('S1', c, d)],
      [],
      teams,
      'S1',
      'S2',
      new Set([pairKey('a', 'd'), pairKey('b', 'c')]),
      undefined,
      1,
      0,
      new Set()
    );

    expect(result).not.toBeNull();
    expect(result?.s1).toHaveLength(2);
    expect(result?.s2).toHaveLength(2);

    const allMatches = [...(result?.s1 ?? []), ...(result?.s2 ?? [])];
    expectEveryTeamPlaysExactly(
      allMatches,
      teams.map((team) => team.id),
      2
    );
    expectNoTeamDoubleBookedPerSlot(allMatches, ['S1', 'S2']);
    expectNoDuplicatePairs(allMatches);
    expect(result?.s1.map((match) => pairKey(match.teamAId, match.teamBId))).not.toEqual([
      pairKey('a', 'b'),
      pairKey('c', 'd'),
    ]);
  });

  it('returns null when no first-slot rearrangement can satisfy constraints', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const result = tryCrossSlotSwap(
      [makeMatch('S1', a, b), makeMatch('S1', c, d)],
      [],
      [a, b, c, d],
      'S1',
      'S2',
      new Set([pairKey('a', 'c'), pairKey('b', 'd'), pairKey('a', 'd'), pairKey('b', 'c')]),
      undefined,
      1,
      0,
      new Set()
    );

    expect(result).toBeNull();
  });
});
