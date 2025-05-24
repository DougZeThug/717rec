
// Re-export from the new validation service for backward compatibility
export {
  BracketValidationService as BracketValidation,
  type ValidationResult as BracketValidationResult,
  type TeamValidationResult
} from '@/services/brackets/validation/BracketValidationService';

// Legacy function exports for backward compatibility
export const validateBracketFormData = BracketValidation.validateFormData;
export const validateTeamSelection = BracketValidation.validateTeamSelection;
export const sanitizeBracketFormData = BracketValidation.sanitizeFormData;

// Re-export the class methods as standalone functions
const BracketValidation = BracketValidationService;
