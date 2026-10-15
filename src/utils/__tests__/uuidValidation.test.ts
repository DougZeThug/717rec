import { describe, expect, it } from 'vitest';

import { isValidUuidSafe } from '../uuidValidation';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const INVALID_UUID = 'not-a-uuid';

describe('isValidUuidSafe', () => {
  it('returns true for a valid UUID', () => {
    expect(isValidUuidSafe(VALID_UUID)).toBe(true);
  });

  it('returns false for a non-string', () => {
    const undef: unknown = undefined;
    expect(isValidUuidSafe(123)).toBe(false);
    expect(isValidUuidSafe(null)).toBe(false);
    expect(isValidUuidSafe(undef)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidUuidSafe('')).toBe(false);
  });

  it('returns false for an invalid UUID string', () => {
    expect(isValidUuidSafe(INVALID_UUID)).toBe(false);
  });
});
