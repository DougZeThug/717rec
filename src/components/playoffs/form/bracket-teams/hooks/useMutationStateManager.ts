import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/hooks/useToast';

import { useOptimisticTeamMutations } from './useOptimisticTeamMutations';
import { TeamSeedUpdate } from './useTeamSeedMutation';

export interface MutationStateManagerConfig {
  autoSaveDelay?: number;
  maxRetries?: number;
  batchThreshold?: number;
}

export interface MutationState {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;
  retryCount: number;
  pendingChanges: Map<string, TeamSeedUpdate>;
  errors: Array<{
    id: string;
    message: string;
    timestamp: Date;
    teamId?: string;
  }>;
}

export interface MutationActions {
  saveChanges: () => Promise<void>;
  saveIndividualChange: (teamId: string, seed: number | null) => Promise<void>;
  discardChanges: () => void;
  discardIndividualChange: (teamId: string) => void;
  retryFailedUpdates: () => Promise<void>;
  clearErrors: () => void;
  enableAutoSave: () => void;
  disableAutoSave: () => void;
}

export const useMutationStateManager = (config: MutationStateManagerConfig = {}) => {
  const { autoSaveDelay = 2000, maxRetries = 3, batchThreshold = 5 } = config;

  const { toast } = useToast();
  const optimisticMutations = useOptimisticTeamMutations();

  const [mutationState, setMutationState] = useState<MutationState>({
    isSaving: false,
    hasUnsavedChanges: false,
    lastSaveTime: null,
    retryCount: 0,
    pendingChanges: new Map(),
    errors: [],
  });

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Track pending changes from optimistic mutations
  useEffect(() => {
    const hasOptimisticChanges = optimisticMutations.state.pendingUpdates.size > 0;
    const hasPendingChanges = mutationState.pendingChanges.size > 0;

    setMutationState((prev) => ({
      ...prev,
      hasUnsavedChanges: hasOptimisticChanges || hasPendingChanges,
      isSaving: optimisticMutations.isLoading,
    }));
  }, [
    optimisticMutations.state.pendingUpdates,
    optimisticMutations.isLoading,
    mutationState.pendingChanges.size,
  ]);

  // Auto-save functionality
  const scheduleAutoSave = useCallback(() => {
    if (!autoSaveEnabled || mutationState.pendingChanges.size === 0) return;

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      saveChanges();
    }, autoSaveDelay);

    setAutoSaveTimeout(timeout);
  }, [autoSaveEnabled, mutationState.pendingChanges.size, autoSaveDelay]);

  // Add or update a pending change
  const addPendingChange = useCallback(
    (teamId: string, seed: number | null) => {
      setMutationState((prev) => {
        const newPendingChanges = new Map(prev.pendingChanges);
        newPendingChanges.set(teamId, { teamId, seed });

        return {
          ...prev,
          pendingChanges: newPendingChanges,
          hasUnsavedChanges: true,
        };
      });

      if (autoSaveEnabled) {
        scheduleAutoSave();
      }
    },
    [autoSaveEnabled, scheduleAutoSave]
  );

  // Save all pending changes
  const saveChanges = useCallback(async () => {
    if (mutationState.pendingChanges.size === 0) return;

    setMutationState((prev) => ({ ...prev, isSaving: true }));

    try {
      const changes = Array.from(mutationState.pendingChanges.values());

      if (changes.length >= batchThreshold) {
        // Use batch update for multiple changes
        await new Promise<void>((resolve, reject) => {
          optimisticMutations.updateBatch(changes);
          // Note: The optimistic mutation hook handles success/error internally
          // We need a way to know when it's complete - this is simplified
          setTimeout(() => {
            if (optimisticMutations.state.lastError) {
              reject(optimisticMutations.state.lastError);
            } else {
              resolve();
            }
          }, 1000);
        });
      } else {
        // Use individual updates for smaller changes
        for (const change of changes) {
          await new Promise<void>((resolve, reject) => {
            optimisticMutations.updateSingle(change);
            setTimeout(() => {
              if (optimisticMutations.state.lastError) {
                reject(optimisticMutations.state.lastError);
              } else {
                resolve();
              }
            }, 500);
          });
        }
      }

      // Clear pending changes on success
      setMutationState((prev) => ({
        ...prev,
        pendingChanges: new Map(),
        lastSaveTime: new Date(),
        retryCount: 0,
        isSaving: false,
      }));

      toast({
        title: 'Changes Saved',
        description: `Successfully saved ${changes.length} seed changes`,
      });
    } catch (error) {
      setMutationState((prev) => ({
        ...prev,
        isSaving: false,
        retryCount: prev.retryCount + 1,
        errors: [
          ...prev.errors,
          {
            id: Date.now().toString(),
            message: error instanceof Error ? error.message : 'Save failed',
            timestamp: new Date(),
          },
        ],
      }));

      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save changes',
        variant: 'destructive',
      });
    }
  }, [mutationState.pendingChanges, batchThreshold, optimisticMutations, toast]);

  // Save individual change immediately
  const saveIndividualChange = useCallback(
    async (teamId: string, seed: number | null) => {
      try {
        optimisticMutations.updateSingle({ teamId, seed });

        // Remove from pending changes if it exists
        setMutationState((prev) => {
          const newPendingChanges = new Map(prev.pendingChanges);
          newPendingChanges.delete(teamId);
          return {
            ...prev,
            pendingChanges: newPendingChanges,
          };
        });
      } catch (error) {
        setMutationState((prev) => ({
          ...prev,
          errors: [
            ...prev.errors,
            {
              id: Date.now().toString(),
              message: error instanceof Error ? error.message : 'Update failed',
              timestamp: new Date(),
              teamId,
            },
          ],
        }));
      }
    },
    [optimisticMutations]
  );

  // Discard all pending changes
  const discardChanges = useCallback(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }

    setMutationState((prev) => ({
      ...prev,
      pendingChanges: new Map(),
      hasUnsavedChanges: false,
    }));

    // Also rollback any optimistic updates
    optimisticMutations.rollback();

    toast({
      title: 'Changes Discarded',
      description: 'All pending changes have been discarded',
    });
  }, [autoSaveTimeout, optimisticMutations, toast]);

  // Discard individual change
  const discardIndividualChange = useCallback(
    (teamId: string) => {
      setMutationState((prev) => {
        const newPendingChanges = new Map(prev.pendingChanges);
        newPendingChanges.delete(teamId);
        return {
          ...prev,
          pendingChanges: newPendingChanges,
        };
      });

      optimisticMutations.rollback([teamId]);
    },
    [optimisticMutations]
  );

  // Retry failed updates
  const retryFailedUpdates = useCallback(async () => {
    if (mutationState.retryCount >= maxRetries) {
      toast({
        title: 'Max Retries Reached',
        description: 'Cannot retry - maximum retry attempts exceeded',
        variant: 'destructive',
      });
      return;
    }

    await saveChanges();
  }, [mutationState.retryCount, maxRetries, saveChanges, toast]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setMutationState((prev) => ({ ...prev, errors: [] }));
    optimisticMutations.clearError();
  }, [optimisticMutations]);

  // Auto-save controls
  const enableAutoSave = useCallback(() => {
    setAutoSaveEnabled(true);
    if (mutationState.pendingChanges.size > 0) {
      scheduleAutoSave();
    }
  }, [mutationState.pendingChanges.size, scheduleAutoSave]);

  const disableAutoSave = useCallback(() => {
    setAutoSaveEnabled(false);
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }
  }, [autoSaveTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  return {
    state: {
      ...mutationState,
      autoSaveEnabled,
      optimisticState: optimisticMutations.state,
    },
    actions: {
      saveChanges,
      saveIndividualChange,
      discardChanges,
      discardIndividualChange,
      retryFailedUpdates,
      clearErrors,
      enableAutoSave,
      disableAutoSave,
      addPendingChange,
    },
  };
};
