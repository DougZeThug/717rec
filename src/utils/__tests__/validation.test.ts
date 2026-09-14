import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/types/errors';

import {
  assertDistinct,
  assertNonEmptyString,
  assertNonNegativeNumber,
  assertValidUuid,
  isValidUUID,
} from '../validation';

const VALID_V4_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('isValidUUID', () => {
  it.each([
    { label: 'a v4 UUID', value: VALID_V4_UUID },
    { label: 'a v1 UUID', value: '550e8400-e29b-11d4-a716-446655440000' },
    // Seeded by supabase/migrations/00000000000000_baseline.sql — version and
    // variant nibbles are not v4, but the row is a real team.
    {
      label: 'a stored team id with non-v4 nibbles',
      value: 'f8a9b0c1-d2e3-4f5a-6b7c-8d9e0f1a2b3c',
    },
    { label: 'the nil UUID', value: '00000000-0000-0000-0000-000000000000' },
  ])('returns true for $label', ({ value }) => {
    expect(isValidUUID(value)).toBe(true);
  });

  it.each([
    { label: 'empty string', value: '' as unknown as string },
    { label: 'non-string input', value: 123 as unknown as string },
    { label: 'malformed UUID', value: '550e8400-e29b-41d4-a716-44665544' as unknown as string },
    { label: 'UUID with a non-hex character', value: '550e8400-e29b-41d4-a716-44665544000g' },
    { label: 'UUID with wrong group lengths', value: '550e840-0e29b-41d4-a716-446655440000' },
  ])('returns false for $label', ({ value }) => {
    expect(isValidUUID(value)).toBe(false);
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
