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
  SeedInputField,
  SeedOrderList,
  SeedOverrideControls,
  SeedStatusBadge,
  TeamSelectionEmpty,
  TeamSelectionError,
  TeamSelectionForm,
  TeamSelectionLoading,
} from './components';

// Simplified Custom Hooks
export {
  useBracketFormData,
  useBracketFormValidation,
  useFormStateManager,
  useMutationStateManager,
  useOptimisticTeamMutations,
  useSeedManagement,
  useTeamSeedMutation,
  useTeamSelectionState,
} from './hooks';

// Re-export seed validation hook
export { useSeedValidation } from '@/hooks/playoffs/useSeedValidation';

// Types - Note: Import Division directly from '@/types' where needed
export type {
  BracketFormDataResult,
  BracketFormStateResult,
  BracketFormTeamsContainerProps,
  BracketFormTeamsProps,
  FormValidationResult,
  ProcessedTeam,
  SeedValidationResult,
  SeedValidationState,
  ValidationProgress,
} from './types';

// Seed Management Types
export type {
  SeedManagementActions,
  SeedManagementResult,
  SeedManagementState,
} from './hooks/useSeedManagement';
export type { BulkSeedUpdateParams, TeamSeedUpdate } from './hooks/useTeamSeedMutation';
