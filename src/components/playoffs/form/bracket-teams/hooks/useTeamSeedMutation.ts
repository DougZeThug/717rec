import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import {
  bulkUpdateTeamSeeds,
  resetDivisionSeeds as resetDivisionSeedsService,
} from '@/services/teams/TeamSeedService';
import type { BulkTeamSeedUpdateResult } from '@/types/seeding';
import { errorLog } from '@/utils/logger';

import { formatUserError } from '../utils/mutationErrorHandling';

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

  // Bulk seed updates
  const bulkUpdateSeeds = useMutation<BulkTeamSeedUpdateResult[], Error, BulkSeedUpdateParams>({
    mutationFn: async ({ updates, divisionId: _divisionId }) => {
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
      errorLog('Failed to bulk update seeds:', error);
      toast({
        title: 'Error',
        description: formatUserError(error, 'Bulk seed update'),
        variant: 'destructive',
      });
    },
  });

  // Reset all seeds in a division to automatic
  const resetDivisionSeeds = useMutation<
    Awaited<ReturnType<typeof resetDivisionSeedsService>>,
    Error,
    string
  >({
    mutationFn: async (divisionId) => {
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
      errorLog('Failed to reset seeds:', error);
      toast({
        title: 'Error',
        description: formatUserError(error, 'Seed reset'),
        variant: 'destructive',
      });
    },
  });

  return {
    bulkUpdateSeeds,
    resetDivisionSeeds,
    isUpdating: bulkUpdateSeeds.isPending || resetDivisionSeeds.isPending,
  };
};
