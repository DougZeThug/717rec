import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { pairKey } from '../pairKey';
import { generateSlotPairings } from '../slotPairing';
import { expectNoDuplicatePairs, expectNoTeamDoubleBookedPerSlot, makeTeam } from './testHelpers';

describe('generateSlotPairings', () => {
  it('pairs all 4 same-tier teams into 2 matches', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));
    const newPairs = new Set<string>();

    const matches = generateSlotPairings(
      teams,
      'S1',
      new Set(),
      new Set(),
      matchCounts,
      1,
      undefined,
      newPairs
    );

    expect(matches).toHaveLength(2);
    const pairedIds = matches.flatMap((m) => [m.teamAId, m.teamBId]);
    expect(new Set(pairedIds).size).toBe(4);
    expectNoTeamDoubleBookedPerSlot(matches, ['S1']);
  });

  it('assigns the correct slot name to all matches', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = generateSlotPairings(teams, 'Early', new Set(), new Set(), matchCounts, 1);

    matches.forEach((m) => expect(m.slot).toBe('Early'));
  });

  it('pairs 6 same-tier teams into 3 matches without duplicate slot bookings', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = generateSlotPairings(teams, 'S1', new Set(), new Set(), matchCounts, 1);

    expect(matches).toHaveLength(3);
    expectNoTeamDoubleBookedPerSlot(matches, ['S1']);
  });

  it('excludes the bye team when byeTeamId is provided', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = generateSlotPairings(teams, 'S1', new Set(), new Set(), matchCounts, 1, 'a');

    const pairedIds = matches.flatMap((m) => [m.teamAId, m.teamBId]);
    expect(pairedIds).not.toContain('a');
    expect(matchCounts.get('a')).toBe(0);
  });

  it('avoids season rematches at level 0 when fresh opponents exist', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const played = new Set([pairKey('a', 'b')]);
    const matchCounts = new Map([a, b, c, d].map((t) => [t.id, 0]));

    const matches = generateSlotPairings(
      [a, b, c, d],
      'S1',
      played,
      new Set(),
      matchCounts,
      1,
      undefined,
      new Set(),
      0
    );

    const playedAB = matches.some(
      (m) => (m.teamAId === 'a' && m.teamBId === 'b') || (m.teamAId === 'b' && m.teamBId === 'a')
    );
    expect(playedAB).toBe(false);
  });

  it('increments match counts and records every new pair side effect', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));
    const tonightPairs = new Set<string>();
    const newPairs = new Set<string>();

    const matches = generateSlotPairings(
      teams,
      'S1',
      new Set(),
      tonightPairs,
      matchCounts,
      1,
      undefined,
      newPairs
    );

    for (const team of teams) {
      expect(matchCounts.get(team.id)).toBe(1);
    }
    for (const match of matches) {
      const key = pairKey(match.teamAId, match.teamBId);
      expect(tonightPairs.has(key)).toBe(true);
      expect(newPairs.has(key)).toBe(true);
    }
    expectNoDuplicatePairs(matches);
  });

  it('honors strict tier gaps at level 0', () => {
    const teams = [
      makeTeam('a', 'Competitive'),
      makeTeam('b', 'Competitive'),
      makeTeam('c', 'Recreational'),
      makeTeam('d', 'Recreational'),
    ];
    const matches = generateSlotPairings(
      teams,
      'S1',
      new Set(),
      new Set(),
      new Map(teams.map((team) => [team.id, 0])),
      1,
      undefined,
      new Set(),
      0
    );

    expect(matches).toHaveLength(2);
    for (const match of matches) {
      expect(Math.abs(match.tierA - match.tierB)).toBeLessThanOrEqual(1);
    }
  });

  it('allows tier gaps when relaxation reaches level 1', () => {
    const teams = [makeTeam('a', 'Competitive'), makeTeam('b', 'Recreational')];
    const matches = generateSlotPairings(
      teams,
      'S1',
      new Set(),
      new Set(),
      new Map(teams.map((team) => [team.id, 0])),
      1,
      undefined,
      new Set(),
      1
    );

    expect(matches).toHaveLength(1);
    expect(Math.abs(matches[0].tierA - matches[0].tierB)).toBe(2);
  });

  it('records per-team rematch allowances only when a team is stranded', () => {
    const teams = ['a', 'b'].map((id) => makeTeam(id));
    const rematchAllowedFor = new Set<string>();
    const matches = generateSlotPairings(
      teams,
      'S1',
      new Set([pairKey('a', 'b')]),
      new Set(),
      new Map(teams.map((team) => [team.id, 0])),
      1,
      undefined,
      new Set(),
      0,
      rematchAllowedFor
    );

    expect(matches).toHaveLength(1);
    expect(rematchAllowedFor).toEqual(new Set(['a']));
  });
});
