import { describe, expect, it } from 'vitest';

import {
  assertValidUuid,
  assertValidUuidOrNull,
  isValidUuidSafe,
  validateUuidArray,
} from '../uuidValidation';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const INVALID_UUID = 'not-a-uuid';

describe('assertValidUuid', () => {
  it('does not throw for a valid UUID', () => {
    expect(() => assertValidUuid(VALID_UUID, 'id')).not.toThrow();
  });

  it('throws for null', () => {
    expect(() => assertValidUuid(null, 'id')).toThrow('id is required');
  });

  it('throws for undefined', () => {
    expect(() => assertValidUuid(undefined, 'id')).toThrow('id is required');
  });

  it('throws for empty string', () => {
    expect(() => assertValidUuid('', 'id')).toThrow('id is required');
  });

  it('throws for whitespace-only string', () => {
    expect(() => assertValidUuid('   ', 'id')).toThrow('id cannot be empty');
  });

  it('throws for non-UUID string', () => {
    expect(() => assertValidUuid(INVALID_UUID, 'id')).toThrow('valid UUID format');
  });
});

describe('assertValidUuidOrNull', () => {
  it('does not throw for null', () => {
    expect(() => assertValidUuidOrNull(null, 'id')).not.toThrow();
  });

  it('does not throw for undefined', () => {
    expect(() => assertValidUuidOrNull(undefined, 'id')).not.toThrow();
  });

  it('does not throw for a valid UUID', () => {
    expect(() => assertValidUuidOrNull(VALID_UUID, 'id')).not.toThrow();
  });

  it('throws for empty string', () => {
    expect(() => assertValidUuidOrNull('', 'id')).toThrow('empty string');
  });

  it('throws for invalid UUID', () => {
    expect(() => assertValidUuidOrNull(INVALID_UUID, 'id')).toThrow('valid UUID format');
  });
});

describe('isValidUuidSafe', () => {
  it('returns true for a valid UUID', () => {
    expect(isValidUuidSafe(VALID_UUID)).toBe(true);
  });

  it('returns false for a non-string', () => {
    expect(isValidUuidSafe(123)).toBe(false);
    expect(isValidUuidSafe(null)).toBe(false);
    expect(isValidUuidSafe(undefined)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidUuidSafe('')).toBe(false);
  });

  it('returns false for an invalid UUID string', () => {
    expect(isValidUuidSafe(INVALID_UUID)).toBe(false);
  });
});

describe('validateUuidArray', () => {
  it('returns array of valid UUIDs', () => {
    const result = validateUuidArray([VALID_UUID], 'ids');
    expect(result).toEqual([VALID_UUID]);
  });

  it('throws for a non-array input', () => {
    expect(() => validateUuidArray('not-an-array' as unknown as unknown[], 'ids')).toThrow(
      'must be an array'
    );
  });

  it('throws for an array containing an invalid UUID, with index', () => {
    expect(() => validateUuidArray([VALID_UUID, INVALID_UUID], 'ids')).toThrow('ids[1]');
  });

  it('accepts empty array', () => {
    expect(validateUuidArray([], 'ids')).toEqual([]);
  });
});
