import { useState, useCallback, useMemo } from 'react';
import { ProcessedTeam, SeedValidationState } from '../types';
import { handleDragDropReorder } from '../utils/dragAndDrop';

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
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic');
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());
  const [draggedTeam, setDraggedTeam] = useState<ProcessedTeam | null>(null);
  const [processedTeams, setProcessedTeams] = useState<ProcessedTeam[]>(initialTeams);

  // Update teams when initialTeams changes
  useMemo(() => {
    setProcessedTeams(initialTeams);
  }, [initialTeams]);

  const isDirty = pendingChanges.size > 0;
  const hasConflicts = validation.hasConflicts;

  const updateTeamSeed = useCallback((teamId: string, seed: number | null) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      if (seed === null) {
        next.delete(teamId);
      } else {
        next.set(teamId, seed);
      }
      return next;
    });

    // Update local team state
    setProcessedTeams(prev => prev.map(team => 
      team.id === teamId ? { ...team, seed: seed || team.seed } : team
    ));

    // Call external handler if provided
    if (onSeedChange) {
      onSeedChange(teamId, seed);
    }
  }, [onSeedChange]);

  const reorderTeams = useCallback((reorderedTeams: ProcessedTeam[]) => {
    setProcessedTeams(reorderedTeams);
    
    // Update pending changes for all reordered teams
    const changes = new Map<string, number>();
    reorderedTeams.forEach(team => {
      changes.set(team.id, team.seed);
      if (onSeedChange) {
        onSeedChange(team.id, team.seed);
      }
    });
    setPendingChanges(changes);
  }, [onSeedChange]);

  const resetToAutomatic = useCallback(() => {
    setMode('automatic');
    setPendingChanges(new Map());
    setProcessedTeams(initialTeams);
    
    // Clear all manual seeds
    initialTeams.forEach(team => {
      if (onSeedChange) {
        onSeedChange(team.id, null);
      }
    });
  }, [initialTeams, onSeedChange]);

  const commitChanges = useCallback(() => {
    setPendingChanges(new Map());
  }, []);

  const cancelChanges = useCallback(() => {
    setPendingChanges(new Map());
    setProcessedTeams(initialTeams);
  }, [initialTeams]);

  const switchMode = useCallback((newMode: 'automatic' | 'manual') => {
    setMode(newMode);
    if (newMode === 'automatic') {
      resetToAutomatic();
    }
  }, [resetToAutomatic]);

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