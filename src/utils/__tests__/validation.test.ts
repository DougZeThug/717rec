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
