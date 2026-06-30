import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/types/errors';

import {
  assertDistinct,
  assertNonEmptyString,
  assertNonNegativeNumber,
  assertValidUuid,
  isNotEmpty,
  isValidUUID,
  validateDivisionId,
  validateTeamIds,
} from '../validation';

const VALID_V4_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('isValidUUID', () => {
  it('returns true for a valid v4 UUID', () => {
    expect(isValidUUID(VALID_V4_UUID)).toBe(true);
  });

  it.each([
    { label: 'empty string', value: '' as unknown as string },
    { label: 'non-string input', value: 123 as unknown as string },
    { label: 'malformed UUID', value: '550e8400-e29b-41d4-a716-44665544' as unknown as string },
    { label: 'non-v4 UUID', value: '550e8400-e29b-11d4-a716-446655440000' as unknown as string },
  ])('returns false for $label', ({ value }) => {
    expect(isValidUUID(value)).toBe(false);
  });
});

describe('isNotEmpty', () => {
  it.each([
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
    { label: 'empty string', value: '' },
    { label: 'whitespace-only string', value: '   \t\n  ' },
  ])('returns false for $label', ({ value }) => {
    expect(isNotEmpty(value)).toBe(false);
  });

  it.each([
    { label: 'plain non-empty text', value: 'hello' },
    { label: 'trimmed non-empty text', value: '  hello  ' },
  ])('returns true for $label', ({ value }) => {
    expect(isNotEmpty(value)).toBe(true);
  });
});

describe('validateTeamIds', () => {
  it('returns invalid when input is not an array', () => {
    expect(validateTeamIds('not-an-array' as unknown as string[])).toEqual({
      isValid: false,
      errors: ['Team IDs must be an array'],
    });
  });

  it('returns invalid when array is empty', () => {
    expect(validateTeamIds([])).toEqual({
      isValid: false,
      errors: ['At least one team ID is required'],
    });
  });

  it('captures per-index messages for mixed valid and invalid IDs', () => {
    const result = validateTeamIds([VALID_V4_UUID, 'not-a-uuid', '   ']);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      'Team ID at index 1 is not a valid UUID: not-a-uuid',
      'Team ID at index 2 is empty',
    ]);
  });

  it('accumulates multiple errors for multiple invalid entries', () => {
    const result = validateTeamIds(['bad-uuid', '', 'also-bad']);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      'Team ID at index 0 is not a valid UUID: bad-uuid',
      'Team ID at index 1 is empty',
      'Team ID at index 2 is not a valid UUID: also-bad',
    ]);
  });

  it('returns valid with no errors when all IDs are valid', () => {
    const result = validateTeamIds([
      VALID_V4_UUID,
      '123e4567-e89b-42d3-a456-426614174000',
      '8f14e45f-ceea-4bc5-94f6-6f7f6f7f6f7f',
    ]);

    expect(result).toEqual({ isValid: true, errors: [] });
  });
});

describe('validateDivisionId', () => {
  it.each([
    { label: 'empty string', value: '' },
    { label: 'whitespace-only string', value: '   ' },
    { label: 'null', value: null as unknown as string },
    { label: 'undefined', value: undefined as unknown as string },
  ])('returns required error for $label', ({ value }) => {
    expect(validateDivisionId(value)).toEqual({
      isValid: false,
      error: 'Division ID is required',
    });
  });

  it('returns format error (including input) for invalid UUID', () => {
    expect(validateDivisionId('not-a-uuid')).toEqual({
      isValid: false,
      error: 'Division ID is not a valid UUID: not-a-uuid',
    });
  });

  it('returns valid for a valid UUID', () => {
    expect(validateDivisionId(VALID_V4_UUID)).toEqual({ isValid: true });
  });
});

// ─── assertNonEmptyString ─────────────────────────────────────────────────────

describe('assertNonEmptyString', () => {
  it('does not throw for a non-empty string', () => {
    expect(() => assertNonEmptyString('Alice', 'firstName')).not.toThrow();
  });

  it.each([
    { label: 'empty string', value: '' },
    { label: 'whitespace-only string', value: '   \t\n  ' },
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
    { label: 'number', value: 42 },
  ])('throws ValidationError for $label', ({ value }) => {
    expect(() => assertNonEmptyString(value, 'firstName')).toThrow(ValidationError);
  });

  it('includes the field name in the error message', () => {
    expect(() => assertNonEmptyString('', 'firstName')).toThrow(/firstName/);
  });
});

// ─── assertValidUuid ──────────────────────────────────────────────────────────

describe('assertValidUuid', () => {
  it('does not throw for a valid UUID', () => {
    expect(() => assertValidUuid(VALID_V4_UUID, 'teamId')).not.toThrow();
  });

  it.each([
    { label: 'empty string', value: '' },
    { label: 'non-UUID text', value: 'team-1' },
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
    { label: 'number', value: 123 },
  ])('throws ValidationError for $label', ({ value }) => {
    expect(() => assertValidUuid(value, 'teamId')).toThrow(ValidationError);
  });

  it('includes the field name in the error message', () => {
    expect(() => assertValidUuid('not-a-uuid', 'teamId')).toThrow(/teamId/);
  });
});

// ─── assertNonNegativeNumber ──────────────────────────────────────────────────

describe('assertNonNegativeNumber', () => {
  it.each([
    { label: 'zero', value: 0 },
    { label: 'positive integer', value: 3 },
    { label: 'positive decimal', value: 2.5 },
  ])('does not throw for $label', ({ value }) => {
    expect(() => assertNonNegativeNumber(value, 'team1_score')).not.toThrow();
  });

  it.each([
    { label: 'negative number', value: -1 },
    { label: 'NaN', value: NaN },
    { label: 'Infinity', value: Infinity },
    { label: 'string', value: '3' },
    { label: 'null', value: null },
  ])('throws ValidationError for $label', ({ value }) => {
    expect(() => assertNonNegativeNumber(value, 'team1_score')).toThrow(ValidationError);
  });

  it('includes the field name in the error message', () => {
    expect(() => assertNonNegativeNumber(-1, 'team1_score')).toThrow(/team1_score/);
  });
});

// ─── assertDistinct ───────────────────────────────────────────────────────────

describe('assertDistinct', () => {
  it('does not throw when the two values are different', () => {
    expect(() => assertDistinct('team-a', 'team-b', 'must differ')).not.toThrow();
  });

  it('throws ValidationError when the two values are equal', () => {
    expect(() => assertDistinct('team-a', 'team-a', 'Winner and loser must be different')).toThrow(
      ValidationError
    );
  });

  it('uses the provided message in the thrown error', () => {
    expect(() => assertDistinct(5, 5, 'team1 and team2 must differ')).toThrow(
      'team1 and team2 must differ'
    );
  });
});
