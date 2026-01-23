import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { Match, Team } from '@/types';
import { errorLog, warnLog } from '@/utils/logger';

import { invalidateAllDataQueries } from './utils/queryInvalidation';
import { reverseTeamStats } from './utils/statReversalUtils';

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

  const handleDeleteMatch = async (teams: Team[]) => {
    if (!deleteMatchId) return false;

    try {
      setIsDeleting(true);
      const matchToDelete = matches.find((match) => match.id === deleteMatchId);

      if (!matchToDelete) {
        throw new Error('Match not found');
      }

      // If match was completed, reverse the team stats BEFORE deleting
      if (matchToDelete.iscompleted && matchToDelete.winnerId && matchToDelete.loserId) {
        const winnerGameWins =
          matchToDelete.winnerId === matchToDelete.team1Id
            ? matchToDelete.team1_game_wins || 0
            : matchToDelete.team2_game_wins || 0;
        const loserGameWins =
          matchToDelete.loserId === matchToDelete.team1Id
            ? matchToDelete.team1_game_wins || 0
            : matchToDelete.team2_game_wins || 0;

        await reverseTeamStats(
          matchToDelete.winnerId,
          matchToDelete.loserId,
          winnerGameWins,
          loserGameWins
        );
      }

      // Delete the match from Supabase
      const { error } = await supabase.from('matches').delete().eq('id', deleteMatchId);

      if (error) throw error;

      // AFTER deletion: Refresh team_season_stats to keep career data in sync
      // This must happen after the match is deleted so the recalculation doesn't include the deleted match
      const { error: seasonStatsError } = await supabase.rpc('upsert_team_season_stats');
      if (seasonStatsError) {
        warnLog('Failed to refresh season stats after deletion:', seasonStatsError);
        // Non-fatal - stats will eventually sync
      }

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
