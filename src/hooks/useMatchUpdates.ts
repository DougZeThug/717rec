import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Match, Team } from '@/types';
import { errorLog, warnLog } from '@/utils/logger';

import { useTeamRecords } from './useTeamRecords';

export const useMatchUpdates = (matches: Match[], setMatches: (matches: Match[]) => void) => {
  const [editingMatch, setEditingMatch] = useState<Match | undefined>(undefined);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

            const { error: reverseError } = await supabase.rpc('reverse_team_stats', {
              p_winner_id: editingMatch.winnerId,
              p_loser_id: editingMatch.loserId,
              p_winner_game_wins: oldWinnerGameWins,
              p_loser_game_wins: oldLoserGameWins,
            });

            if (reverseError) {
              throw new Error(`Failed to reverse team stats: ${reverseError.message}`);
            }

            // Refresh team_season_stats to keep career data in sync
            const { error: seasonStatsError } = await supabase.rpc('upsert_team_season_stats');
            if (seasonStatsError) {
              warnLog('Failed to refresh season stats after reversal:', seasonStatsError);
            }
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
      invalidateAllDataQueries();

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

        // Call the RPC to reverse team stats
        const { error: reverseError } = await supabase.rpc('reverse_team_stats', {
          p_winner_id: matchToDelete.winnerId,
          p_loser_id: matchToDelete.loserId,
          p_winner_game_wins: winnerGameWins,
          p_loser_game_wins: loserGameWins,
        });

        if (reverseError) {
          throw new Error(`Failed to reverse team stats: ${reverseError.message}`);
        }
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
      invalidateAllDataQueries();

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

  // Helper function to invalidate all related queries
  const invalidateAllDataQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['rankings'] });
    queryClient.invalidateQueries({ queryKey: ['teamStats'] });
    queryClient.invalidateQueries({ queryKey: ['team-totals'] });
    queryClient.invalidateQueries({ queryKey: ['season-data'] }); // History page data

    // Also invalidate single team queries that might be open in team details pages
    queryClient.invalidateQueries({ queryKey: ['team'] });
    queryClient.invalidateQueries({ queryKey: ['team-matches'] });
  };

  return {
    editingMatch,
    deleteMatchId,
    isDeleting,
    setEditingMatch,
    setDeleteMatchId,
    handleUpdateMatch,
    handleDeleteMatch,
    invalidateAllDataQueries,
  };
};
