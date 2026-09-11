import { describe, expect, it } from 'vitest';

import type { PlayoffBracket, PlayoffMatch } from '../playoffTypes';
import {
  hasPlayStarted,
  isBracketComplete,
  isBracketInProgress,
  isValidUuidSafe,
} from '../playoffUtils';

const makeBracket = (state: PlayoffBracket['state']): PlayoffBracket => ({
  id: 'b1',
  format: 'Single Elimination',
  state,
});

describe('isValidUuidSafe', () => {
  it('returns true for a valid v4 UUID', () => {
    expect(isValidUuidSafe('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for a valid v1 UUID', () => {
    expect(isValidUuidSafe('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidUuidSafe('')).toBe(false);
  });

  it('returns false for a partial UUID', () => {
    expect(isValidUuidSafe('550e8400-e29b-41d4')).toBe(false);
  });

  it('returns false for a non-UUID string', () => {
    expect(isValidUuidSafe('hello')).toBe(false);
  });

  it('returns false for all zeros (invalid variant bits)', () => {
    // The variant nibble must be 8, 9, a, or b — all zeros is invalid
    expect(isValidUuidSafe('00000000-0000-1000-0000-000000000000')).toBe(false);
  });
});

describe('isBracketComplete', () => {
  it('returns true when state is "completed"', () => {
    expect(isBracketComplete(makeBracket('completed'))).toBe(true);
  });

  it('returns false when state is "in_progress"', () => {
    expect(isBracketComplete(makeBracket('in_progress'))).toBe(false);
  });

  it('returns false when state is "pending"', () => {
    expect(isBracketComplete(makeBracket('pending'))).toBe(false);
  });
});

describe('isBracketInProgress', () => {
  it('returns true when state is "in_progress"', () => {
    expect(isBracketInProgress(makeBracket('in_progress'))).toBe(true);
  });

  it('returns false when state is "completed"', () => {
    expect(isBracketInProgress(makeBracket('completed'))).toBe(false);
  });

  it('returns false when state is "pending"', () => {
    expect(isBracketInProgress(makeBracket('pending'))).toBe(false);
  });
});

const makeMatch = (overrides: Partial<PlayoffMatch>): PlayoffMatch =>
  ({
    id: 'm1',
    round: 1,
    position: 1,
    bracket_id: 'b1',
    matchType: 'winners',
    bestOf: 3,
    team1Id: 't-1',
    team2Id: 't-2',
    winnerId: null,
    team1Score: null,
    team2Score: null,
    status: 'pending',
    ...overrides,
  }) as PlayoffMatch;

describe('hasPlayStarted', () => {
  it('returns false when there are no matches', () => {
    expect(hasPlayStarted([])).toBe(false);
    expect(hasPlayStarted(undefined)).toBe(false);
  });

  it('returns false for a bracket that has been drawn but not played', () => {
    expect(hasPlayStarted([makeMatch({ status: 'pending' })])).toBe(false);
  });

  // The bracket library records the win for a team facing a BYE as it draws
  // the bracket. Nobody has played, so the bracket has not started.
  it('ignores the win the library writes for a team facing a BYE', () => {
    expect(hasPlayStarted([makeMatch({ team2Id: null, winnerId: 't-1', status: 'pending' })])).toBe(
      false
    );
  });

  it('counts a win between two real teams', () => {
    expect(hasPlayStarted([makeMatch({ winnerId: 't-1', status: 'pending' })])).toBe(true);
  });

  it('counts a score, even without a winner', () => {
    expect(hasPlayStarted([makeMatch({ team2Score: 4 })])).toBe(true);
  });

  it('counts a game win, even without a score', () => {
    expect(hasPlayStarted([makeMatch({ team1GameWins: 1 })])).toBe(true);
  });

  it('counts a match that is being played, before any score', () => {
    expect(hasPlayStarted([makeMatch({ status: 'in_progress' })])).toBe(true);
  });

  // An admin can walk a one-sided match forward on an older bracket. That
  // marks it played, so the bracket has started even at 0 points.
  it('counts a one-sided match an admin has marked played', () => {
    expect(
      hasPlayStarted([
        makeMatch({ team2Id: null, winnerId: 't-1', team1Score: 0, status: 'completed' }),
      ])
    ).toBe(true);
  });

  it('finds a played match anywhere in the list', () => {
    expect(
      hasPlayStarted([
        makeMatch({ id: 'm1', status: 'pending' }),
        makeMatch({ id: 'm2', winnerId: 't-2', status: 'completed' }),
      ])
    ).toBe(true);
  });
});
