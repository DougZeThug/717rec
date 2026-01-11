import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { formatUserError, withRetry } from '../utils/mutationErrorHandling';

export interface TeamSeedUpdate {
  teamId: string;
  seed: number | null;
}

export interface BulkSeedUpdateParams {
  updates: TeamSeedUpdate[];
  divisionId: string;
}

/**
 * Hook for updating team seeds in the database
 */
export const useTeamSeedMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Single team seed update with retry logic
  const updateSingleTeamSeed = useMutation({
    mutationFn: async ({ teamId, seed }: { teamId: string; seed: number | null }) => {
      return withRetry(async () => {
        const { data, error } = await supabase
          .from('teams')
          .update({ seed })
          .eq('id', teamId)
          .select()
          .single();

        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoff-teams'] });
      queryClient.invalidateQueries({ queryKey: ['seed-validation'] });
    },
    onError: (error) => {
      console.error('Failed to update team seed:', error);
      toast({
        title: 'Error',
        description: formatUserError(error, 'Seed update'),
        variant: 'destructive',
      });
    },
  });

  // Bulk seed updates
  const bulkUpdateSeeds = useMutation({
    mutationFn: async ({ updates, divisionId }: BulkSeedUpdateParams) => {
      const results = await Promise.allSettled(
        updates.map(({ teamId, seed }) =>
          supabase.from('teams').update({ seed }).eq('id', teamId).select().single()
        )
      );

      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason);

      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} team seeds`);
      }

      return results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map((result) => result.value.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoff-teams'] });
      queryClient.invalidateQueries({ queryKey: ['seed-validation'] });
      toast({
        title: 'Success',
        description: 'Team seeds updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to bulk update seeds:', error);
      toast({
        title: 'Error',
        description: formatUserError(error, 'Bulk seed update'),
        variant: 'destructive',
      });
    },
  });

  // Reset all seeds in a division to automatic
  const resetDivisionSeeds = useMutation({
    mutationFn: async (divisionId: string) => {
      const { error } = await supabase.rpc('reset_division_seeds', {
        p_division_id: divisionId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoff-teams'] });
      queryClient.invalidateQueries({ queryKey: ['seed-validation'] });
      toast({
        title: 'Success',
        description: 'All seeds reset to automatic.',
      });
    },
    onError: (error) => {
      console.error('Failed to reset seeds:', error);
      toast({
        title: 'Error',
        description: formatUserError(error, 'Seed reset'),
        variant: 'destructive',
      });
    },
  });

  return {
    updateSingleTeamSeed,
    bulkUpdateSeeds,
    resetDivisionSeeds,
    isUpdating:
      updateSingleTeamSeed.isPending || bulkUpdateSeeds.isPending || resetDivisionSeeds.isPending,
  };
};
