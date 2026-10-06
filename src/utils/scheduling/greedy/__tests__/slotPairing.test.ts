import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { scheduleLog, warnLog } from '@/utils/logger';

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

describe('generateSlotPairings swap pass', () => {
  // Greedy pairs a (Intermediate) with b (Intermediate) first. That strands
  // c (Competitive) and d (Recreational): a tier gap of 2 blocks c vs d.
  // The swap pass must then break (a, b) and re-pair the stranded teams.
  const setup = (blockedTonightPairs: string[] = []) => {
    const teamA = makeTeam('a', 'Intermediate');
    const teamB = makeTeam('b', 'Intermediate');
    const teamC = makeTeam('c', 'Competitive');
    const teamD = makeTeam('d', 'Recreational');
    const teams = [teamA, teamB, teamC, teamD];
    const tonightPairs = new Set(blockedTonightPairs);
    const newPairs = new Set<string>();
    const teamMatchCounts = new Map(teams.map((t) => [t.id, 0]));
    const matches = generateSlotPairings(
      teams,
      'S1',
      new Set(),
      tonightPairs,
      teamMatchCounts,
      1,
      undefined,
      newPairs
    );
    return { matches, tonightPairs, newPairs, teamMatchCounts };
  };

  const idsOf = (m: { teamAId: string; teamBId: string }) => [m.teamAId, m.teamBId];

  it('swaps (U1,A) + (U2,B) when option 1 works', () => {
    const { matches, tonightPairs, newPairs, teamMatchCounts } = setup();

    expect(matches.map(idsOf)).toEqual([
      ['c', 'a'],
      ['d', 'b'],
    ]);
    expect(matches[0]).toMatchObject({
      slot: 'S1',
      teamAName: 'Team c',
      teamBName: 'Team a',
      divisionA: 'Competitive',
      divisionB: 'Intermediate',
      tierA: 1,
      tierB: 2,
    });
    expect(matches[1]).toMatchObject({
      slot: 'S1',
      teamAName: 'Team d',
      teamBName: 'Team b',
      divisionA: 'Recreational',
      divisionB: 'Intermediate',
      tierA: 3,
      tierB: 2,
    });
    const expectedKeys = new Set([pairKey('c', 'a'), pairKey('d', 'b')]);
    expect(tonightPairs).toEqual(expectedKeys);
    expect(newPairs).toEqual(expectedKeys);
    for (const id of ['a', 'b', 'c', 'd']) {
      expect(teamMatchCounts.get(id)).toBe(1);
    }
    expect(scheduleLog).toHaveBeenCalledWith(
      'Swap fix: replaced (Team a vs Team b) with (Team c vs Team a) + (Team d vs Team b)'
    );
    expect(warnLog).not.toHaveBeenCalledWith(expect.stringContaining('Swap pass'));
  });

  it('swaps (U1,B) + (U2,A) when only option 2 works', () => {
    // Session pair a-c blocks option 1 ((c,a) + (d,b)).
    const { matches, tonightPairs, newPairs, teamMatchCounts } = setup([pairKey('a', 'c')]);

    expect(matches.map(idsOf)).toEqual([
      ['c', 'b'],
      ['d', 'a'],
    ]);
    expect(tonightPairs).toEqual(
      new Set([pairKey('a', 'c'), pairKey('c', 'b'), pairKey('d', 'a')])
    );
    expect(newPairs).toEqual(new Set([pairKey('c', 'b'), pairKey('d', 'a')]));
    for (const id of ['a', 'b', 'c', 'd']) {
      expect(teamMatchCounts.get(id)).toBe(1);
    }
    expect(scheduleLog).toHaveBeenCalledWith(
      'Swap fix: replaced (Team a vs Team b) with (Team c vs Team b) + (Team d vs Team a)'
    );
  });

  it('leaves matches unchanged and warns when no swap works', () => {
    // a-c blocks option 1 and a-d blocks option 2.
    const { matches, tonightPairs, newPairs, teamMatchCounts } = setup([
      pairKey('a', 'c'),
      pairKey('a', 'd'),
    ]);

    expect(matches.map(idsOf)).toEqual([['a', 'b']]);
    expect(tonightPairs).toEqual(
      new Set([pairKey('a', 'c'), pairKey('a', 'd'), pairKey('a', 'b')])
    );
    expect(newPairs).toEqual(new Set([pairKey('a', 'b')]));
    expect(teamMatchCounts.get('a')).toBe(1);
    expect(teamMatchCounts.get('b')).toBe(1);
    expect(teamMatchCounts.get('c')).toBe(0);
    expect(teamMatchCounts.get('d')).toBe(0);
    expect(scheduleLog).not.toHaveBeenCalled();
    expect(warnLog).toHaveBeenCalledWith('Swap pass: 2 teams still unmatched after swap attempts');
  });
});
