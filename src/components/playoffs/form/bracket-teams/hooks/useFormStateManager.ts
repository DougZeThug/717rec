import { useCallback } from 'react';

import { BracketFormStateResult, ProcessedTeam } from '../types';
import { SeedManagementResult, useSeedManagement } from './useSeedManagement';

interface FormStateManagerResult {
  // Team selection state
  teamSelectionState: BracketFormStateResult;

  // Seed management state
  seedManagementState: SeedManagementResult;

  // Unified form state
  hasUnsavedChanges: boolean;
  canSave: boolean;

  // Actions
  saveAllChanges: () => Promise<void>;
  cancelAllChanges: () => void;

  // Cross-tab synchronization
  syncedTeams: ProcessedTeam[];
}

export const useFormStateManager = (
  initialTeams: ProcessedTeam[],
  teamSelectionState: BracketFormStateResult,
  seedValidation: any,
  onSeedChange?: (teamId: string, seed: number | null) => void
): FormStateManagerResult => {
  // Initialize seed management
  const seedManagementState = useSeedManagement(initialTeams, seedValidation, onSeedChange);

  // Synchronized teams that reflect both selection and seed changes
  const syncedTeams = seedManagementState.processedTeams.map((team) => ({
    ...team,
    isSelected: teamSelectionState.selected.has(team.id),
  }));

  // Check if we have unsaved changes
  const hasUnsavedChanges = seedManagementState.state.isDirty;
  const canSave = hasUnsavedChanges && !seedManagementState.hasConflicts;

  // Save all changes
  const saveAllChanges = useCallback(async () => {
    if (!canSave) return;
    seedManagementState.actions.commitChanges();
  }, [canSave, seedManagementState.actions]);

  // Cancel all changes
  const cancelAllChanges = useCallback(() => {
    seedManagementState.actions.cancelChanges();
  }, [seedManagementState.actions]);

  return {
    teamSelectionState,
    seedManagementState,
    hasUnsavedChanges,
    canSave,
    saveAllChanges,
    cancelAllChanges,
    syncedTeams,
  };
};
