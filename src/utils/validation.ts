/**
 * Validation utilities for the application
 */

import { ValidationError } from '@/types/errors';

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ─── Assertion guards (throw ValidationError) ────────────────────────────────
// Small, reusable input guards for the service layer. Each throws a
// ValidationError (a ServiceError subclass) so callers surface a friendly
// validation message instead of a raw Supabase error — and so the guard runs
// before any database round-trip.

/**
 * Assert that a value is a non-empty string (rejects '' and whitespace-only).
 * @throws {ValidationError} when the value is missing, not a string, or blank.
 */
export function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
}

/**
 * Assert that a value is a valid UUID string.
 * @throws {ValidationError} when the value is missing or not a valid UUID.
 */
export function assertValidUuid(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string' || !isValidUUID(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
}

/**
 * Assert that a value is a finite, non-negative number (for scores/stats).
 * @throws {ValidationError} when the value is not a number or is negative.
 */
export function assertNonNegativeNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative number`);
  }
}

/**
 * Assert that two values are different (e.g. winner ≠ loser, team1 ≠ team2).
 * @throws {ValidationError} with the given message when the two values are equal.
 */
export function assertDistinct<T>(a: T, b: T, message: string): void {
  if (a === b) {
    throw new ValidationError(message);
  }
}
