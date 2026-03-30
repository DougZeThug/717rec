import { useQueryClient } from '@tanstack/react-query';

import { useTeamRecords } from '@/hooks/useTeamRecords';
import { useToast } from '@/hooks/useToast';
import { updateMatch } from '@/services/matches/MatchWriteService';
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

      // Check if game wins changed
      const gameWinsChanged =
        editingMatch.team1_game_wins !== matchData.team1_game_wins ||
        editingMatch.team2_game_wins !== matchData.team2_game_wins;

      const updatePayload: {
        team1_id: string;
        team2_id: string;
        date: string | undefined;
        location: string;
        iscompleted: boolean | undefined;
        team1_score: number | undefined;
        team2_score: number | undefined;
        winner_id: string | undefined;
        loser_id: string | undefined;
        team1_game_wins?: number;
        team2_game_wins?: number;
      } = {
        team1_id: matchData.team1Id,
        team2_id: matchData.team2Id,
        date: matchData.date,
        location: matchData.location || '',
        iscompleted: matchData.iscompleted,
        team1_score: matchData.team1Score,
        team2_score: matchData.team2Score,
        winner_id: matchData.winnerId,
        loser_id: matchData.loserId,
      };

      if (matchData.team1_game_wins !== undefined) {
        updatePayload.team1_game_wins = matchData.team1_game_wins;
      }

      if (matchData.team2_game_wins !== undefined) {
        updatePayload.team2_game_wins = matchData.team2_game_wins;
      }

      // Update the match
      const data = await updateMatch(editingMatch.id, updatePayload);

      // Transform the returned match to our app's format
      const updatedMatch: Match = {
        ...editingMatch,
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
        position: data.position,
        bracket_id: data.bracket_id,
        match_type: data.match_type,
        next_match_id: data.next_match_id,
        next_loser_match_id: data.next_loser_match_id,
        best_of: data.best_of,
        created_at: data.created_at,
        // status field not on matches table
      };

      // Update the matches state
      const updatedMatches = matches.map((match) =>
        match.id === updatedMatch.id ? { ...match, ...updatedMatch } : match
      );
      setMatches(updatedMatches);

      setEditingMatch(undefined);

      const loserChanged = editingMatch.loserId !== matchData.loserId;

      // Case 1: Match was completed and is now marked incomplete — reverse old stats
      if (wasCompleted && !isNowCompleted && editingMatch.winnerId && editingMatch.loserId) {
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

      // Case 2: Match is (still or newly) completed and stats need updating
      if (isNowCompleted && (!wasCompleted || winnerChanged || loserChanged || gameWinsChanged)) {
        if (updatedMatch.winnerId && updatedMatch.loserId) {
          // If it was already completed and something changed, reverse old stats first
          if (wasCompleted && editingMatch.winnerId && editingMatch.loserId) {
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

          const statsSuccess = await updateTeamRecords(
            updatedMatch.winnerId,
            updatedMatch.loserId,
            teams,
            winnerGameWins,
            loserGameWins
          );

          if (!statsSuccess) {
            toast({
              title: 'Partial Failure',
              description: 'Match was updated but team records failed to save. Please retry or contact an admin.',
              variant: 'destructive',
            });
            return false;
          }
        }
      }

      toast({
        title: 'Match Updated',
        description: 'Match details have been successfully updated.',
      });

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
