/**
 * Validation utilities for the application
 */

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
