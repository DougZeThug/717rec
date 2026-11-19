import { describe, expect, it } from 'vitest';

import type { PlayoffMatch } from '@/types/playoffTypes';

import { hasPlayStarted } from '../playoffUtils';

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
    // A bracket carries no matches at all until they load, and both dialogs
    // pass that straight through. skipcq: JS-W1042
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
