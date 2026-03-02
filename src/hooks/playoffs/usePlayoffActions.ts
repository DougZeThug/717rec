import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { getUIErrorMessage, logError } from '@/utils/errorHandler';
import type { PlayoffGame } from '@/utils/playoffs/playoffTypes';

export const usePlayoffActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle bracket deletion
  const deleteBracket = async (bracketId: string, bracketName: string) => {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      await supabase.from('brackets').delete().eq('id', bracketId);

      toast({
        title: 'Bracket Deleted',
        description: `"${bracketName}" has been successfully deleted.`,
      });

      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ['brackets'] });
      await queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });
      await invalidateMatchRelatedQueries(queryClient);
    } catch (error) {
      const errorMessage = getUIErrorMessage(error, 'Failed to delete bracket');
      logError(error, 'deleteBracket', { bracketId, bracketName });

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      throw new Error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle updating match results
  const updateMatchResult = async (
    matchId: string,
    winnerId: string,
    team1Score: number,
    team2Score: number,
    team1GameWins?: number,
    team2GameWins?: number,
    games?: PlayoffGame[]
  ) => {
    try {
      // Update in playoff_matches table
      const { error: matchError } = await supabase
        .from('playoff_matches')
        .update({
          winner_id: winnerId,
          team1_score: team1Score,
          team2_score: team2Score,
          status: 'completed',
        })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Update games if provided
      if (games && games.length > 0) {
        for (const game of games) {
          if (game.id) {
            await supabase.from('playoff_games').upsert({
              id: game.id,
              match_id: matchId,
              game_number: game.gameNumber || 1,
              team1_score: game.team1Score,
              team2_score: game.team2Score,
              winner_id: game.winnerId,
            });
          }
        }
      }

      // Invalidate queries to refetch data
      await queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });
      await queryClient.invalidateQueries({ queryKey: ['bracket'] });

      toast({
        title: 'Match Updated',
        description: 'Match score has been successfully updated.',
      });
    } catch (error) {
      const errorMessage = getUIErrorMessage(error, 'Failed to update match');
      logError(error, 'updateMatchResult', { matchId, winnerId, team1Score, team2Score });

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      throw new Error(errorMessage);
    }
  };

  return {
    deleteBracket,
    updateMatchResult,
    isDeleting,
  };
};
