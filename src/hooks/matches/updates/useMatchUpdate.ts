import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { useTeamRecords } from '@/hooks/useTeamRecords';
import { supabase } from '@/integrations/supabase/client';
import { Match, Team } from '@/types';
import { errorLog } from '@/utils/logger';

import { invalidateAllDataQueries } from './utils/queryInvalidation';
import { reverseTeamStats } from './utils/statReversalUtils';

interface UseMatchUpdateProps {
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  editingMatch: Match | undefined;
  setEditingMatch: (match: Match | undefined) => void;
}

export const useMatchUpdate = ({
  matches,
  setMatches,
  editingMatch,
  setEditingMatch,
}: UseMatchUpdateProps) => {
  const { toast } = useToast();
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();

  const handleUpdateMatch = async (matchData: Omit<Match, 'id'>, teams: Team[]) => {
    if (!editingMatch) return false;

    try {
      // Check if the winner/loser has changed
      const winnerChanged = editingMatch.winnerId !== matchData.winnerId;
      const wasCompleted = editingMatch.iscompleted;
      const isNowCompleted = matchData.iscompleted;

      // Update the match in Supabase
      const { data, error } = await supabase
        .from('matches')
        .update({
          team1_id: matchData.team1Id,
          team2_id: matchData.team2Id,
          date: matchData.date,
          location: matchData.location || '',
          iscompleted: matchData.iscompleted,
          team1_score: matchData.team1Score,
          team2_score: matchData.team2Score,
          winner_id: matchData.winnerId,
          loser_id: matchData.loserId,
          team1_game_wins: matchData.team1_game_wins || 0,
          team2_game_wins: matchData.team2_game_wins || 0,
        })
        .eq('id', editingMatch.id)
        .select()
        .single();

      if (error) throw error;

      // Transform the returned match to our app's format
      const updatedMatch: Match = {
        id: data.id,
        team1Id: data.team1_id,
        team2Id: data.team2_id,
        date: data.date,
        location: data.location,
        iscompleted: data.iscompleted,
        team1Score: data.team1_score,
        team2Score: data.team2_score,
        winnerId: data.winner_id,
        loserId: data.loser_id,
        team1_game_wins: data.team1_game_wins,
        team2_game_wins: data.team2_game_wins,
        round_number: data.round_number,
      };

      // Update the matches state
      const updatedMatches = matches.map((match) =>
        match.id === updatedMatch.id ? updatedMatch : match
      );
      setMatches(updatedMatches);

      setEditingMatch(undefined);

      toast({
        title: 'Match Updated',
        description: `Match details have been successfully updated.`,
      });

      // If match is newly completed or winner changed, update team records
      if ((isNowCompleted && !wasCompleted) || (isNowCompleted && winnerChanged)) {
        if (updatedMatch.winnerId && updatedMatch.loserId) {
          // If winner changed on already-completed match, reverse old stats first
          if (wasCompleted && winnerChanged && editingMatch.winnerId && editingMatch.loserId) {
            const oldWinnerGameWins =
              editingMatch.winnerId === editingMatch.team1Id
                ? editingMatch.team1_game_wins || 0
                : editingMatch.team2_game_wins || 0;
            const oldLoserGameWins =
              editingMatch.loserId === editingMatch.team1Id
                ? editingMatch.team1_game_wins || 0
                : editingMatch.team2_game_wins || 0;

            await reverseTeamStats(
              editingMatch.winnerId,
              editingMatch.loserId,
              oldWinnerGameWins,
              oldLoserGameWins
            );
          }

          // Now apply the new stats
          const winnerGameWins =
            updatedMatch.winnerId === updatedMatch.team1Id
              ? updatedMatch.team1_game_wins || 0
              : updatedMatch.team2_game_wins || 0;
          const loserGameWins =
            updatedMatch.loserId === updatedMatch.team1Id
              ? updatedMatch.team1_game_wins || 0
              : updatedMatch.team2_game_wins || 0;

          await updateTeamRecords(
            updatedMatch.winnerId,
            updatedMatch.loserId,
            teams,
            winnerGameWins,
            loserGameWins
          );
        }
      }

      // Invalidate relevant queries to refresh data across the app
      invalidateAllDataQueries(queryClient);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error updating match:', error);
      toast({
        title: 'Error',
        description: `Failed to update match: ${message}`,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    handleUpdateMatch,
  };
};
