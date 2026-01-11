import { Division, Team } from '@/types';

/**
 * Type guard to validate if a value is a proper Team array
 */
export function isTeamArray(maybe: unknown): maybe is Team[] {
  return (
    Array.isArray(maybe) &&
    maybe.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        'id' in item &&
        'name' in item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string'
    )
  );
}

/**
 * Type guard to validate if a value is a proper Division array
 */
export function isDivisionArray(maybe: unknown): maybe is Division[] {
  return (
    Array.isArray(maybe) &&
    maybe.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        'id' in item &&
        'name' in item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string'
    )
  );
}

/**
 * Type guard to validate if a division ID exists in the divisions array
 */
export function isDivisionIdValid(divisions: Division[], id: unknown): id is string {
  if (typeof id !== 'string' || !id) return false;
  return divisions.some((d) => d.id === id);
}

/**
 * Type guard to validate if a value is a valid string
 */
export function isValidString(maybe: unknown): maybe is string {
  return typeof maybe === 'string' && maybe.length > 0;
}

/**
 * Type guard to validate if a value is a valid number
 */
export function isValidNumber(maybe: unknown): maybe is number {
  return typeof maybe === 'number' && !isNaN(maybe) && isFinite(maybe);
}
