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

/**
 * Validates if a string is not empty or undefined
 */
export function isNotEmpty(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim() !== '';
}

/**
 * Validates team IDs array
 */
export function validateTeamIds(teamIds: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(teamIds)) {
    errors.push('Team IDs must be an array');
    return { isValid: false, errors };
  }

  if (teamIds.length === 0) {
    errors.push('At least one team ID is required');
    return { isValid: false, errors };
  }

  teamIds.forEach((teamId, index) => {
    if (!isNotEmpty(teamId)) {
      errors.push(`Team ID at index ${index} is empty`);
    } else if (!isValidUUID(teamId)) {
      errors.push(`Team ID at index ${index} is not a valid UUID: ${teamId}`);
    }
  });

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates division ID
 */
export function validateDivisionId(divisionId: string): { isValid: boolean; error?: string } {
  if (!isNotEmpty(divisionId)) {
    return { isValid: false, error: 'Division ID is required' };
  }

  if (!isValidUUID(divisionId)) {
    return { isValid: false, error: `Division ID is not a valid UUID: ${divisionId}` };
  }

  return { isValid: true };
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
