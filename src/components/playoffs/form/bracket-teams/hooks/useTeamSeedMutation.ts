import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/use-toast';
import {
  bulkUpdateTeamSeeds,
  resetDivisionSeeds as resetDivisionSeedsService,
  updateTeamSeed,
} from '@/services/teams/TeamSeedService';

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
        return await updateTeamSeed(teamId, seed);
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
      return await bulkUpdateTeamSeeds(updates);
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
      return await resetDivisionSeedsService(divisionId);
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
