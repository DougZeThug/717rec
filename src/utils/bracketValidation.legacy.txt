
import { BracketValidationService } from '@/services/brackets/validation/BracketValidationService';

// Re-export from the new validation service for backward compatibility
export {
  BracketValidationService,
  type ValidationResult as BracketValidationResult,
  type TeamValidationResult
} from '@/services/brackets/validation/BracketValidationService';

// Legacy function exports for backward compatibility
export const validateBracketFormData = BracketValidationService.validateFormData;
export const validateTeamSelection = BracketValidationService.validateTeamSelection;
export const sanitizeBracketFormData = BracketValidationService.sanitizeFormData;

// Create a default export for backward compatibility
export const BracketValidation = BracketValidationService;
