import { useCallback, useMemo, useState } from 'react';

import { ProcessedTeam, SeedValidationState } from '../types';

interface SeedManagementState {
  mode: 'automatic' | 'manual';
  pendingChanges: Map<string, number>;
  isDirty: boolean;
  draggedTeam: ProcessedTeam | null;
}

interface SeedManagementActions {
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

/** Manages manual vs automatic playoff seeding, tracking pending seed edits and drag state. */
export const useSeedManagement = (
  initialTeams: ProcessedTeam[],
  validation: SeedValidationState,
  onSeedChange?: (teamId: string, seed: number | null) => void
): SeedManagementResult => {
  // Ensure we have valid arrays and objects to prevent React errors
  // eslint-disable-next-line react-hooks/exhaustive-deps -- safeInitialTeams stable within hook scope
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

  // Fingerprint of the incoming teams (ids + seeds). When the server-side
  // seed set changes (e.g. after "Reset to Auto" clears manual overrides,
  // or another admin edits seeds), we must resync — the previous one-shot
  // isInitializedRef latch left stale seeds visible after any reset.
  const initialFingerprint = useMemo(
    () => safeInitialTeams.map((t) => `${t.id}:${t.seed ?? ''}`).join('|'),
    [safeInitialTeams]
  );
  const [lastFingerprint, setLastFingerprint] = useState<string>(initialFingerprint);

  // Adjust state during render (React's recommended pattern for
  // "reset when prop identity changes"): when the incoming seed set
  // changes and the user has no uncommitted edits or in-flight drag,
  // resync processedTeams to reflect the new server-side seeds.
  if (lastFingerprint !== initialFingerprint && pendingChanges.size === 0 && !draggedTeam) {
    setLastFingerprint(initialFingerprint);
    setProcessedTeams(safeInitialTeams);
  }

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
    // Clear fingerprint so the render-time resync copies incoming teams
    // on the next parent update (parent seed data may update async).
    setLastFingerprint('');

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
    setLastFingerprint('');
  }, [safeInitialTeams]);

  const switchMode = useCallback((newMode: 'automatic' | 'manual') => {
    setMode(newMode);
    // Do NOT reset pending changes when toggling modes; the dedicated
    // "Reset to Auto" button is the explicit path for discarding edits.
  }, []);

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
