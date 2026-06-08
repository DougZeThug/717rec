import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { deleteMatchWithStatsReversal } from '@/services/matches/MatchWriteService';
import { Match, Team } from '@/types';
import { errorLog } from '@/utils/logger';

import { invalidateAllDataQueries } from './utils/queryInvalidation';

interface UseMatchDeleteProps {
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  deleteMatchId: string | null;
  setDeleteMatchId: (id: string | null) => void;
  setIsDeleting: (isDeleting: boolean) => void;
}

export const useMatchDelete = ({
  matches,
  setMatches,
  deleteMatchId,
  setDeleteMatchId,
  setIsDeleting,
}: UseMatchDeleteProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDeleteMatch = async (_teams: Team[]) => {
    if (!deleteMatchId) return false;

    try {
      setIsDeleting(true);
      const matchToDelete = matches.find((match) => match.id === deleteMatchId);

      if (!matchToDelete) {
        throw new Error('Match not found');
      }

      // Atomic delete + stats reversal + season stat refresh in a single transaction.
      await deleteMatchWithStatsReversal(deleteMatchId);

      // Update the matches state
      const updatedMatches = matches.filter((match) => match.id !== deleteMatchId);
      setMatches(updatedMatches);

      setDeleteMatchId(null);

      toast({
        title: 'Match Deleted',
        description: 'Match has been successfully deleted.',
        variant: 'destructive',
      });

      // Invalidate all queries to ensure data consistency
      invalidateAllDataQueries(queryClient);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error deleting match:', error);
      toast({
        title: 'Error',
        description: `Failed to delete match: ${message}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleDeleteMatch,
  };
};
