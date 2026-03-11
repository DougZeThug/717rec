import { useCallback, useEffect, useRef, useState } from 'react';

import { ProcessedTeam, SeedValidationState } from '../types';

export interface SeedManagementState {
  mode: 'automatic' | 'manual';
  pendingChanges: Map<string, number>;
  isDirty: boolean;
  draggedTeam: ProcessedTeam | null;
}

export interface SeedManagementActions {
  setMode: (mode: 'automatic' | 'manual') => void;
  updateTeamSeed: (teamId: string, seed: number | null) => void;
  reorderTeams: (teams: ProcessedTeam[]) => void;
  resetToAutomatic: () => void;
  commitChanges: () => void;
  cancelChanges: () => void;
  setDraggedTeam: (team: ProcessedTeam | null) => void;
}

export interface SeedManagementResult {
  state: SeedManagementState;
  actions: SeedManagementActions;
  processedTeams: ProcessedTeam[];
  hasConflicts: boolean;
}

export const useSeedManagement = (
  initialTeams: ProcessedTeam[],
  validation: SeedValidationState,
  onSeedChange?: (teamId: string, seed: number | null) => void
): SeedManagementResult => {
  // Ensure we have valid arrays and objects to prevent React errors
  const safeInitialTeams = Array.isArray(initialTeams) ? initialTeams : [];
  const safeValidation = validation || {
    hasConflicts: false,
    conflicts: [],
    isLoading: false,
    errorMessage: null,
  };

  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic');
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());
  const [draggedTeam, setDraggedTeam] = useState<ProcessedTeam | null>(null);
  const [processedTeams, setProcessedTeams] = useState<ProcessedTeam[]>(safeInitialTeams);
  const isInitializedRef = useRef(false);

  // Only sync with initialTeams on mount or when explicitly requested
  useEffect(() => {
    if (!isInitializedRef.current) {
      setProcessedTeams(safeInitialTeams);
      isInitializedRef.current = true;
    }
  }, [safeInitialTeams]);

  const isDirty = pendingChanges.size > 0;
  const hasConflicts = safeValidation.hasConflicts;

  const updateTeamSeed = useCallback(
    (teamId: string, seed: number | null) => {
      setPendingChanges((prev) => {
        const next = new Map(prev);
        if (seed === null) {
          next.delete(teamId);
        } else {
          next.set(teamId, seed);
        }
        return next;
      });

      // Update local team state
      setProcessedTeams((prev) =>
        prev.map((team) => (team.id === teamId ? { ...team, seed: seed || team.seed } : team))
      );

      // Call external handler if provided
      if (onSeedChange) {
        onSeedChange(teamId, seed);
      }
    },
    [onSeedChange]
  );

  const reorderTeams = useCallback(
    (reorderedTeams: ProcessedTeam[]) => {
      setProcessedTeams(reorderedTeams);

      // Update pending changes for all reordered teams
      const changes = new Map<string, number>();
      reorderedTeams.forEach((team) => {
        changes.set(team.id, team.seed);
        if (onSeedChange) {
          onSeedChange(team.id, team.seed);
        }
      });
      setPendingChanges(changes);
    },
    [onSeedChange]
  );

  const resetToAutomatic = useCallback(() => {
    setMode('automatic');
    setPendingChanges(new Map());
    setProcessedTeams(safeInitialTeams);
    isInitializedRef.current = false; // Allow resync with initialTeams

    // Clear all manual seeds
    safeInitialTeams.forEach((team) => {
      if (onSeedChange) {
        onSeedChange(team.id, null);
      }
    });
  }, [safeInitialTeams, onSeedChange]);

  const commitChanges = useCallback(() => {
    setPendingChanges(new Map());
  }, []);

  const cancelChanges = useCallback(() => {
    setPendingChanges(new Map());
    setProcessedTeams(safeInitialTeams);
    isInitializedRef.current = false; // Allow resync with initialTeams
  }, [safeInitialTeams]);

  const switchMode = useCallback(
    (newMode: 'automatic' | 'manual') => {
      setMode(newMode);
      if (newMode === 'automatic') {
        resetToAutomatic();
      }
    },
    [resetToAutomatic]
  );

  return {
    state: {
      mode,
      pendingChanges,
      isDirty,
      draggedTeam,
    },
    actions: {
      setMode: switchMode,
      updateTeamSeed,
      reorderTeams,
      resetToAutomatic,
      commitChanges,
      cancelChanges,
      setDraggedTeam,
    },
    processedTeams,
    hasConflicts,
  };
};
