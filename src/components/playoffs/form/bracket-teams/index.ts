
/**
 * Bracket Form Teams Module
 * 
 * This module provides components and utilities for team selection in bracket forms.
 * Simplified architecture with direct team selection management.
 */

// Main container component (no wrapper needed)
export { BracketFormTeamsContainer } from './components/BracketFormTeamsContainer';

// UI Components
export {
  TeamSelectionError,
  TeamSelectionLoading,
  TeamSelectionEmpty,
  TeamSelectionForm
} from './components';

// Simplified Custom Hooks
export {
  useBracketFormData,
  useTeamSelectionState,
  useBracketFormValidation
} from './hooks';

// Re-export seed validation hook
export { useSeedValidation } from '@/hooks/playoffs/useSeedValidation';

// Types - Note: Import Division directly from '@/types' where needed
export type {
  BracketFormTeamsProps,
  BracketFormTeamsContainerProps,
  BracketFormStateResult,
  FormValidationResult,
  ValidationProgress,
  BracketFormDataResult,
  ProcessedTeam,
  SeedValidationResult,
  SeedValidationState
} from './types';
