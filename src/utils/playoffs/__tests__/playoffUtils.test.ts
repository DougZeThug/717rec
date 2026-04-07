import { describe, it, expect } from 'vitest';
import { isValidUuidSafe, isBracketComplete, isBracketInProgress } from '../playoffUtils';
import type { PlayoffBracket } from '../playoffTypes';

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
