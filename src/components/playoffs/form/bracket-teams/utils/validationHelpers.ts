
/**
 * Validation utility functions for bracket form inputs
 */

/**
 * Validates bracket title input
 * @param title - The bracket title to validate
 * @returns Validation result with success status and error message
 */
export const validateBracketTitle = (title: string): { isValid: boolean; error?: string } => {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Bracket title is required' };
  }
  
  if (title.trim().length < 3) {
    return { isValid: false, error: 'Bracket title must be at least 3 characters long' };
  }
  
  if (title.length > 50) {
    return { isValid: false, error: 'Bracket title must be 50 characters or less' };
  }
  
  return { isValid: true };
};

/**
 * Validates division selection
 * @param divisionId - The selected division ID
 * @param availableDivisions - Array of available division IDs
 * @returns Validation result with success status and error message
 */
export const validateDivisionSelection = (
  divisionId: string,
  availableDivisions: string[]
): { isValid: boolean; error?: string } => {
  if (!divisionId || divisionId.trim().length === 0) {
    return { isValid: false, error: 'Division selection is required' };
  }
  
  if (!availableDivisions.includes(divisionId)) {
    return { isValid: false, error: 'Invalid division selected' };
  }
  
  return { isValid: true };
};

/**
 * Validates bracket format selection
 * @param format - The selected bracket format
 * @returns Validation result with success status and error message
 */
export const validateBracketFormat = (format: string): { isValid: boolean; error?: string } => {
  const validFormats = ['Single Elimination', 'Double Elimination'];
  
  if (!format || format.trim().length === 0) {
    return { isValid: false, error: 'Bracket format is required' };
  }
  
  if (!validFormats.includes(format)) {
    return { isValid: false, error: 'Invalid bracket format selected' };
  }
  
  return { isValid: true };
};

/**
 * Validates the entire bracket form
 * @param formData - The complete form data object
 * @returns Validation result with success status and array of error messages
 */
export const validateBracketForm = (formData: {
  title: string;
  divisionId: string;
  format: string;
  teams: string[];
  minTeams?: number;
  maxTeams?: number;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const titleValidation = validateBracketTitle(formData.title);
  if (!titleValidation.isValid) {
    errors.push(titleValidation.error!);
  }
  
  const formatValidation = validateBracketFormat(formData.format);
  if (!formatValidation.isValid) {
    errors.push(formatValidation.error!);
  }
  
  const minTeams = formData.minTeams || 2;
  const maxTeams = formData.maxTeams || 16;
  
  if (formData.teams.length < minTeams) {
    errors.push(`At least ${minTeams} teams are required`);
  }
  
  if (formData.teams.length > maxTeams) {
    errors.push(`Maximum ${maxTeams} teams allowed`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
