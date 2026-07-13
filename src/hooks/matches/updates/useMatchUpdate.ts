import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  markMatchAsTie,
  resubmitMatchResult,
  updateMatch,
} from '@/services/matches/MatchWriteService';
import { Match, Team } from '@/types';
import { errorLog } from '@/utils/logger';

import { invalidateAllDataQueries } from './utils/queryInvalidation';

// Game wins a given team earned in a match (0 if unknown).
const gameWinsFor = (match: Match, teamId: string | undefined): number =>
  teamId === match.team1Id ? match.team1_game_wins || 0 : match.team2_game_wins || 0;

// Build the app-format Match from the DB update response.
const toUpdatedMatch = (
  editingMatch: Match,
  data: Awaited<ReturnType<typeof updateMatch>>
): Match => ({
  ...editingMatch,
  id: data.id,
  team1Id: data.team1_id ?? editingMatch.team1Id,
  team2Id: data.team2_id ?? editingMatch.team2Id,
  date: data.date ?? undefined,
  location: data.location ?? undefined,
  iscompleted: data.iscompleted ?? undefined,
  team1Score: data.team1_score ?? undefined,
  team2Score: data.team2_score ?? undefined,
  winnerId: data.winner_id ?? undefined,
  loserId: data.loser_id ?? undefined,
  team1_game_wins: data.team1_game_wins ?? undefined,
  team2_game_wins: data.team2_game_wins ?? undefined,
  round_number: data.round_number,
  position: data.position ?? undefined,
  bracket_id: data.bracket_id ?? undefined,
  match_type: data.match_type ?? undefined,
  next_match_id: data.next_match_id ?? undefined,
  next_loser_match_id: data.next_loser_match_id ?? undefined,
  best_of: data.best_of ?? undefined,
  created_at: data.created_at ?? undefined,
  // status field not on matches table
});

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
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);

  // Reconcile team season stats after a match edit. Returns false only on an
  // unrecovered partial failure (match saved but team records did not), which
  // signals the caller to abort the success path.
  const applyStatChanges = async (
    prevMatch: Match,
    nextMatch: Match,
    _teams: Team[],
    flags: {
      wasCompleted: boolean | undefined;
      isNowCompleted: boolean | undefined;
      winnerChanged: boolean;
      loserChanged: boolean;
      gameWinsChanged: boolean;
    }
  ): Promise<boolean> => {
    // Case 1: Match was completed and is now marked incomplete — clear the
    // result through the atomic tie/reversal RPC rather than the generic updater.
    if (flags.wasCompleted && !flags.isNowCompleted) {
      if (prevMatch.winnerId && prevMatch.loserId) {
        await markMatchAsTie(prevMatch.id);
      }
      return true;
    }

    // Case 2: Match is (still or newly) completed and stats need updating
    const needsUpdate =
      !flags.wasCompleted || flags.winnerChanged || flags.loserChanged || flags.gameWinsChanged;
    if (!(flags.isNowCompleted && needsUpdate && nextMatch.winnerId && nextMatch.loserId)) {
      return true;
    }

    // Atomic: reverse prior + write new + apply counters in one transaction.
    await resubmitMatchResult(
      nextMatch.id,
      nextMatch.winnerId,
      nextMatch.loserId,
      gameWinsFor(nextMatch, nextMatch.winnerId),
      gameWinsFor(nextMatch, nextMatch.loserId)
    );
    return true;
  };

  const handleUpdateMatch = async (matchData: Omit<Match, 'id'>, teams: Team[]) => {
    if (!editingMatch || isUpdatingRef.current) return false;

    isUpdatingRef.current = true;
    setIsUpdating(true);
    try {
      // Check if the winner/loser has changed
      const winnerChanged = editingMatch.winnerId !== matchData.winnerId;
      const wasCompleted = editingMatch.iscompleted;
      const isNowCompleted = matchData.iscompleted;

      // Check if game wins changed
      const gameWinsChanged =
        editingMatch.team1_game_wins !== matchData.team1_game_wins ||
        editingMatch.team2_game_wins !== matchData.team2_game_wins;

      // For result-carrying edits (completed with winner/loser) the atomic
      // resubmit_match_result RPC writes match fields AND team counters in one
      // transaction, so we skip the plain match UPDATE and only touch
      // non-result fields (date/location/teams) up front.
      const isResultEdit = !!matchData.iscompleted && !!matchData.winnerId && !!matchData.loserId;

      const updatePayload = {
        team1_id: matchData.team1Id,
        team2_id: matchData.team2Id,
        date: matchData.date,
        location: matchData.location || '',
      };

      // Update only the match's non-result fields. Result fields are changed
      // exclusively by the atomic RPCs below.
      const data = await updateMatch(editingMatch.id, updatePayload);

      // Transform the returned match to our app's format
      const updatedMatch = toUpdatedMatch(editingMatch, data);
      // If this is a result edit, restore the intended in-memory match state
      // so applyStatChanges can pass the correct winner/loser/scores.
      if (isResultEdit) {
        updatedMatch.iscompleted = true;
        updatedMatch.winnerId = matchData.winnerId;
        updatedMatch.loserId = matchData.loserId;
        updatedMatch.team1Score = matchData.team1Score;
        updatedMatch.team2Score = matchData.team2Score;
        updatedMatch.team1_game_wins = matchData.team1_game_wins;
        updatedMatch.team2_game_wins = matchData.team2_game_wins;
      }
      if (!isNowCompleted) {
        updatedMatch.iscompleted = false;
        updatedMatch.winnerId = undefined;
        updatedMatch.loserId = undefined;
        updatedMatch.team1Score = undefined;
        updatedMatch.team2Score = undefined;
        updatedMatch.team1_game_wins = undefined;
        updatedMatch.team2_game_wins = undefined;
      }

      // Update the matches state
      const updatedMatches = matches.map((match) =>
        match.id === updatedMatch.id ? { ...match, ...updatedMatch } : match
      );
      setMatches(updatedMatches);

      setEditingMatch(undefined);

      const loserChanged = editingMatch.loserId !== matchData.loserId;

      const statsOk = await applyStatChanges(editingMatch, updatedMatch, teams, {
        wasCompleted,
        isNowCompleted,
        winnerChanged,
        loserChanged,
        gameWinsChanged,
      });
      if (!statsOk) return false;

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
    } finally {
      isUpdatingRef.current = false;
      setIsUpdating(false);
    }
  };

  return {
    handleUpdateMatch,
    isUpdating,
  };
};
