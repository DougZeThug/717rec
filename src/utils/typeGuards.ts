
import { Team, Division } from '@/types';

/**
 * Type guard to validate if a value is a proper Team array
 */
export function isTeamArray(maybe: unknown): maybe is Team[] {
  return Array.isArray(maybe) && maybe.every(item => 
    item && 
    typeof item === 'object' && 
    'id' in item && 
    'name' in item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string'
  );
}

/**
 * Type guard to validate if a value is a proper Division array
 */
export function isDivisionArray(maybe: unknown): maybe is Division[] {
  return Array.isArray(maybe) && maybe.every(item =>
    item &&
    typeof item === 'object' &&
    'id' in item &&
    'name' in item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string'
  );
}

/**
 * Type guard to validate if a display division name is valid
 * Now validates against display_division names instead of internal division IDs
 */
export function isDivisionIdValid(divisions: Division[], displayDivisionName: unknown): displayDivisionName is string {
  if (typeof displayDivisionName !== 'string' || !displayDivisionName) return false;
  
  // Check if any division has this display_division
  return divisions.some(d => 
    (d.display_division && d.display_division === displayDivisionName) ||
    (!d.display_division && d.name === displayDivisionName)
  );
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
