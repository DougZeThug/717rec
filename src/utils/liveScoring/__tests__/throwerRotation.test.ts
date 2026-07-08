import { describe, expect, it } from 'vitest';

import { deriveNextThrowers } from '../throwerRotation';
import type { RoundRecord } from '../types';

const round = (
  roundNumber: number,
  team1ThrowerId: string | null,
  team2ThrowerId: string | null
): RoundRecord => ({ roundNumber, team1: 0, team2: 0, team1ThrowerId, team2ThrowerId });

describe('deriveNextThrowers', () => {
  it('starts with slot-1 players when no rounds exist', () => {
    expect(deriveNextThrowers([], { team1: ['a1', 'a2'], team2: ['b1', 'b2'] })).toEqual({
      team1ThrowerId: 'a1',
      team2ThrowerId: 'b1',
    });
  });

  it('alternates between the two selected players', () => {
    const rounds = [round(1, 'a1', 'b1')];
    expect(deriveNextThrowers(rounds, { team1: ['a1', 'a2'], team2: ['b1', 'b2'] })).toEqual({
      team1ThrowerId: 'a2',
      team2ThrowerId: 'b2',
    });
  });

  it('wraps back to the first player after the second throws', () => {
    const rounds = [round(1, 'a1', 'b1'), round(2, 'a2', 'b2')];
    expect(deriveNextThrowers(rounds, { team1: ['a1', 'a2'], team2: ['b1', 'b2'] })).toEqual({
      team1ThrowerId: 'a1',
      team2ThrowerId: 'b1',
    });
  });

  it('uses the LATEST round even when the log is unsorted (undo/refresh safe)', () => {
    const rounds = [round(2, 'a2', 'b2'), round(1, 'a1', 'b1')];
    expect(deriveNextThrowers(rounds, { team1: ['a1', 'a2'], team2: ['b1', 'b2'] })).toEqual({
      team1ThrowerId: 'a1',
      team2ThrowerId: 'b1',
    });
  });

  it('rebuilds correctly after an undo removes the last round', () => {
    const rounds = [round(1, 'a1', 'b1')]; // round 2 was undone
    expect(deriveNextThrowers(rounds, { team1: ['a1', 'a2'], team2: ['b1', 'b2'] })).toEqual({
      team1ThrowerId: 'a2',
      team2ThrowerId: 'b2',
    });
  });

  it('single-player side always throws', () => {
    const rounds = [round(1, 'a1', 'b1')];
    expect(deriveNextThrowers(rounds, { team1: ['a1'], team2: ['b1', 'b2'] })).toEqual({
      team1ThrowerId: 'a1',
      team2ThrowerId: 'b2',
    });
  });

  it('empty roster side yields null (thrower attribution optional)', () => {
    expect(deriveNextThrowers([], { team1: [], team2: ['b1'] })).toEqual({
      team1ThrowerId: null,
      team2ThrowerId: 'b1',
    });
  });

  it('falls back to slot 1 when the last thrower left the roster', () => {
    const rounds = [round(1, 'gone', 'b1')];
    expect(deriveNextThrowers(rounds, { team1: ['a1', 'a2'], team2: ['b1', 'b2'] })).toEqual({
      team1ThrowerId: 'a1',
      team2ThrowerId: 'b2',
    });
  });
});
