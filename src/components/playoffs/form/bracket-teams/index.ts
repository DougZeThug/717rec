
/**
 * Bracket Form Teams Module
 * 
 * This module provides components and utilities for team selection in bracket forms.
 * It handles team data processing, filtering, seeding, and user interaction state.
 */

// Main container component
export { BracketFormTeamsContainer } from './components/BracketFormTeamsContainer';

// UI Components
export {
  TeamSelectionError,
  TeamSelectionLoading,
  TeamSelectionEmpty,
  TeamSelectionForm
} from './components';

// Custom Hooks
export {
  useBracketFormData,
  useBracketFormState,
  useTeamSelectionState,
  useFormValidation,
  useTeamDataProcessor,
  useDivisionMapping,
  useTeamSelectionEffects
} from './hooks';

// Types
export type {
  BracketFormTeamsProps,
  BracketFormTeamsContainerProps,
  BracketFormStateResult,
  TeamSelectionStateResult,
  FormValidationResult,
  ValidationProgress,
  BracketFormDataResult,
  ProcessedTeam,
  Division
} from './types';
