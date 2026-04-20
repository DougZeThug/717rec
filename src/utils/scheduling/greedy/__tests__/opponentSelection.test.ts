import { describe, expect, it } from 'vitest';

import { Team } from '@/types';

import { findBestOpponent } from '../opponentSelection';
import { pairKey } from '../pairKey';

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

describe('findBestOpponent', () => {
  it('returns null when no valid candidates exist', () => {
    const team = makeTeam('a');
    const result = findBestOpponent(
      team,
      [],
      new Set(),
      new Set(),
      new Map(),
      1
    );
    expect(result).toBeNull();
  });

  it('excludes self from candidates', () => {
    const team = makeTeam('a');
    const result = findBestOpponent(
      team,
      [team], // only self
      new Set(),
      new Set(),
      new Map(),
      1
    );
    expect(result).toBeNull();
  });

  it('returns the only valid candidate', () => {
    const team = makeTeam('a');
    const opp = makeTeam('b');
    const result = findBestOpponent(
      team,
      [opp],
      new Set(),
      new Set(),
      new Map(),
      1
    );
    expect(result?.id).toBe('b');
  });

  it('prefers same-tier opponent over cross-tier', () => {
    const team = makeTeam('a', 'Competitive');
    const sameTier = makeTeam('b', 'Competitive');
    const crossTier = makeTeam('c', 'Recreational'); // tier gap 2, blocked at level 1
    const result = findBestOpponent(
      team,
      [crossTier, sameTier],
      new Set(),
      new Set(),
      new Map(),
      1,
      1 // allow cross-tier
    );
    expect(result?.id).toBe('b'); // same-tier preferred
  });

  it('excludes season rematches at level 0', () => {
    const team = makeTeam('a');
    const opp = makeTeam('b');
    const played = new Set([pairKey('a', 'b')]);
    const result = findBestOpponent(
      team,
      [opp],
      played,
      new Set(),
      new Map(),
      1,
      0
    );
    expect(result).toBeNull();
  });

  it('prefers non-rematch when level 2 allows rematches', () => {
    const team = makeTeam('a', 'Competitive');
    const freshOpp = makeTeam('b', 'Competitive');
    const rematchOpp = makeTeam('c', 'Competitive');
    const played = new Set([pairKey('a', 'c')]);
    const result = findBestOpponent(
      team,
      [rematchOpp, freshOpp],
      played,
      new Set(),
      new Map(),
      1,
      2 // rematches allowed
    );
    expect(result?.id).toBe('b'); // fresh opponent preferred
  });

  it('uses alphabetical tie-break for equal candidates', () => {
    const team = makeTeam('z', 'Competitive');
    const alpha = makeTeam('apple', 'Competitive');
    const beta = makeTeam('banana', 'Competitive');
    const result = findBestOpponent(
      team,
      [beta, alpha],
      new Set(),
      new Set(),
      new Map(),
      1
    );
    expect(result?.id).toBe('apple');
  });
});
