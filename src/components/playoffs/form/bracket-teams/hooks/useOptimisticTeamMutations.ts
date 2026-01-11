import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { TeamSeedUpdate } from './useTeamSeedMutation';

interface OptimisticUpdate {
  id: string;
  teamId: string;
  previousSeed: number | null;
  newSeed: number | null;
  timestamp: number;
}

interface BatchUpdateResult {
  total_updates: number;
  successful_updates: number;
  failed_updates: number;
  results: Array<{
    team_id: string;
    success: boolean;
    seed?: number | null;
    error?: string;
  }>;
}

interface OptimisticMutationState {
  pendingUpdates: Map<string, OptimisticUpdate>;
  isRollingBack: boolean;
  lastError: Error | null;
}

export const useOptimisticTeamMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [optimisticState, setOptimisticState] = useState<OptimisticMutationState>({
    pendingUpdates: new Map(),
    isRollingBack: false,
    lastError: null,
  });

  const rollbackTimeoutRef = useRef<NodeJS.Timeout>();

  // Helper to create optimistic update
  const createOptimisticUpdate = useCallback(
    (teamId: string, newSeed: number | null): OptimisticUpdate => {
      // Get current seed from cache
      const currentTeams = queryClient.getQueryData(['playoff-teams']) as any[];
      const currentTeam = currentTeams?.find((team) => team.id === teamId);

      return {
        id: `${teamId}-${Date.now()}`,
        teamId,
        previousSeed: currentTeam?.seed || null,
        newSeed,
        timestamp: Date.now(),
      };
    },
    [queryClient]
  );

  // Apply optimistic update to cache
  const applyOptimisticUpdate = useCallback(
    (update: OptimisticUpdate) => {
      queryClient.setQueryData(['playoff-teams'], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((team) =>
          team.id === update.teamId ? { ...team, seed: update.newSeed } : team
        );
      });

      setOptimisticState((prev) => ({
        ...prev,
        pendingUpdates: new Map(prev.pendingUpdates.set(update.teamId, update)),
        lastError: null,
      }));
    },
    [queryClient]
  );

  // Rollback optimistic updates
  const rollbackUpdates = useCallback(
    (teamIds?: string[]) => {
      setOptimisticState((prev) => ({ ...prev, isRollingBack: true }));

      // Get current pending updates for processing
      const currentPendingUpdates = optimisticState.pendingUpdates;

      // Rollback cache changes
      queryClient.setQueryData(['playoff-teams'], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((team) => {
          const update = currentPendingUpdates.get(team.id);
          return update ? { ...team, seed: update.previousSeed } : team;
        });
      });

      // Clear rolled back updates
      setOptimisticState((prev) => {
        const newPendingUpdates = new Map(prev.pendingUpdates);
        if (teamIds) {
          teamIds.forEach((id) => newPendingUpdates.delete(id));
        } else {
          newPendingUpdates.clear();
        }

        return {
          ...prev,
          pendingUpdates: newPendingUpdates,
          isRollingBack: false,
        };
      });

      queryClient.invalidateQueries({ queryKey: ['playoff-teams'] });
      queryClient.invalidateQueries({ queryKey: ['seed-validation'] });
    },
    [queryClient, optimisticState.pendingUpdates]
  );

  // Single team update with optimistic UI
  const optimisticUpdateSingle = useMutation({
    mutationFn: async ({ teamId, seed }: { teamId: string; seed: number | null }) => {
      // Create and apply optimistic update first
      const update = createOptimisticUpdate(teamId, seed);
      applyOptimisticUpdate(update);

      // Set rollback timeout
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }
      rollbackTimeoutRef.current = setTimeout(() => {
        rollbackUpdates([teamId]);
        toast({
          title: 'Update Timeout',
          description: 'Seed update took too long and was rolled back.',
          variant: 'destructive',
        });
      }, 10000); // 10 second timeout

      // Perform actual database update
      const { data, error } = await supabase
        .from('teams')
        .update({ seed })
        .eq('id', teamId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Clear timeout and pending update
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }

      setOptimisticState((prev) => {
        const newPendingUpdates = new Map(prev.pendingUpdates);
        newPendingUpdates.delete(variables.teamId);
        return { ...prev, pendingUpdates: newPendingUpdates };
      });

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['playoff-teams'] });
      queryClient.invalidateQueries({ queryKey: ['seed-validation'] });
    },
    onError: (error, variables) => {
      // Clear timeout and rollback this specific update
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }

      rollbackUpdates([variables.teamId]);

      setOptimisticState((prev) => ({ ...prev, lastError: error as Error }));

      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update team seed',
        variant: 'destructive',
      });
    },
  });

  // Batch update with optimistic UI
  const optimisticBatchUpdate = useMutation({
    mutationFn: async (updates: TeamSeedUpdate[]) => {
      // Create and apply all optimistic updates
      const optimisticUpdates = updates.map(({ teamId, seed }) => {
        const update = createOptimisticUpdate(teamId, seed);
        applyOptimisticUpdate(update);
        return update;
      });

      // Set rollback timeout for batch
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }
      rollbackTimeoutRef.current = setTimeout(() => {
        rollbackUpdates(updates.map((u) => u.teamId));
        toast({
          title: 'Batch Update Timeout',
          description: 'Batch update took too long and was rolled back.',
          variant: 'destructive',
        });
      }, 15000); // 15 second timeout for batch

      // Perform batch database update using the new function
      const batchData = updates.map(({ teamId, seed }) => ({
        team_id: teamId,
        seed: seed === null ? 'null' : seed.toString(),
      }));

      const { data, error } = await supabase.rpc('batch_update_team_seeds', {
        p_updates: batchData,
      });

      if (error) throw error;
      return data as unknown as BatchUpdateResult;
    },
    onSuccess: (result, variables) => {
      // Clear timeout
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }

      // Process results and handle partial failures
      const failedUpdates = result.results.filter((r) => !r.success);
      const successfulTeamIds = result.results.filter((r) => r.success).map((r) => r.team_id);

      // Clear pending updates for successful ones
      setOptimisticState((prev) => {
        const newPendingUpdates = new Map(prev.pendingUpdates);
        successfulTeamIds.forEach((teamId) => newPendingUpdates.delete(teamId));
        return { ...prev, pendingUpdates: newPendingUpdates };
      });

      // Rollback failed updates
      if (failedUpdates.length > 0) {
        const failedTeamIds = failedUpdates.map((u) => u.team_id);
        rollbackUpdates(failedTeamIds);

        toast({
          title: 'Partial Update Success',
          description: `${result.successful_updates} seeds updated successfully. ${result.failed_updates} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Batch Update Success',
          description: `All ${result.successful_updates} team seeds updated successfully.`,
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['playoff-teams'] });
      queryClient.invalidateQueries({ queryKey: ['seed-validation'] });
    },
    onError: (error, variables) => {
      // Clear timeout and rollback all updates
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }

      rollbackUpdates(variables.map((u) => u.teamId));

      setOptimisticState((prev) => ({ ...prev, lastError: error as Error }));

      toast({
        title: 'Batch Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update team seeds',
        variant: 'destructive',
      });
    },
  });

  // Manual rollback function
  const manualRollback = useCallback(
    (teamIds?: string[]) => {
      rollbackUpdates(teamIds);
      toast({
        title: 'Changes Rolled Back',
        description: teamIds
          ? `Rolled back changes for ${teamIds.length} teams`
          : 'All pending changes have been rolled back',
      });
    },
    [rollbackUpdates, toast]
  );

  return {
    // Mutation functions
    updateSingle: optimisticUpdateSingle.mutate,
    updateBatch: optimisticBatchUpdate.mutate,

    // State
    state: optimisticState,
    isLoading: optimisticUpdateSingle.isPending || optimisticBatchUpdate.isPending,

    // Utilities
    rollback: manualRollback,
    clearError: () => setOptimisticState((prev) => ({ ...prev, lastError: null })),
  };
};
