import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { Team } from '@/types';

import { pairKey } from '../pairKey';
import { attemptRepairPass } from '../swapRepair';

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
  });

  it('adds the new pair to tonightPairs', () => {
    const [a, b] = ['a', 'b'].map((id) => makeTeam(id));
    const tonightPairs = new Set<string>();
    const matchCounts = new Map<string, number>();
    const newPairs = new Set<string>();

    attemptRepairPass([a, b], [a, b], 'S2', new Set(), tonightPairs, matchCounts, 1, newPairs, 0);

    expect(tonightPairs.has(pairKey('a', 'b'))).toBe(true);
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
      played, // a and b already played this season
      tonightPairs,
      matchCounts,
      1,
      newPairs,
      0 // level 0 blocks season rematches
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
