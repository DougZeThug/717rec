import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { Team } from '@/types';

import { pairKey } from '../pairKey';
import { generateSlotPairings } from '../slotPairing';

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
    expect(new Set(pairedIds).size).toBe(4); // all 4 distinct teams
  });

  it('assigns the correct slot name to all matches', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = generateSlotPairings(teams, 'Early', new Set(), new Set(), matchCounts, 1);

    matches.forEach((m) => expect(m.slot).toBe('Early'));
  });

  it('pairs 6 same-tier teams into 3 matches', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = generateSlotPairings(teams, 'S1', new Set(), new Set(), matchCounts, 1);

    expect(matches).toHaveLength(3);
  });

  it('excludes the bye team when byeTeamId is provided', () => {
    const teams = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const matchCounts = new Map(teams.map((t) => [t.id, 0]));

    const matches = generateSlotPairings(
      teams,
      'S1',
      new Set(),
      new Set(),
      matchCounts,
      1,
      'a' // 'a' gets a bye
    );

    const pairedIds = matches.flatMap((m) => [m.teamAId, m.teamBId]);
    expect(pairedIds).not.toContain('a');
  });

  it('avoids season rematches at level 0', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    // Force a-b to have played already
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

    // a should not play b
    const playedAB = matches.some(
      (m) => (m.teamAId === 'a' && m.teamBId === 'b') || (m.teamAId === 'b' && m.teamBId === 'a')
    );
    expect(playedAB).toBe(false);
  });
});
