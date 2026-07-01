import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { useTeamRecords } from '@/hooks/useTeamRecords';
import { useToast } from '@/hooks/useToast';
import { updateMatch, upsertTeamSeasonStats } from '@/services/matches/MatchWriteService';
import { Match, Team } from '@/types';
import { errorLog } from '@/utils/logger';

import { invalidateAllDataQueries } from './utils/queryInvalidation';
import { reverseTeamStats } from './utils/statReversalUtils';

// Game wins a given team earned in a match (0 if unknown).
const gameWinsFor = (match: Match, teamId: string | undefined): number =>
  teamId === match.team1Id ? match.team1_game_wins || 0 : match.team2_game_wins || 0;

// Reverse previously-applied team stats for a completed match.
// No-op when the match has no recorded winner/loser.
const reverseStatsForMatch = async (match: Match): Promise<void> => {
  if (!match.winnerId || !match.loserId) return;
  await reverseTeamStats(
    match.winnerId,
    match.loserId,
    gameWinsFor(match, match.winnerId),
    gameWinsFor(match, match.loserId)
  );
};

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
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);

  // Reconcile team season stats after a match edit. Returns false only on an
  // unrecovered partial failure (match saved but team records did not), which
  // signals the caller to abort the success path.
  const applyStatChanges = async (
    prevMatch: Match,
    nextMatch: Match,
    teams: Team[],
    flags: {
      wasCompleted: boolean | undefined;
      isNowCompleted: boolean | undefined;
      winnerChanged: boolean;
      loserChanged: boolean;
      gameWinsChanged: boolean;
    }
  ): Promise<boolean> => {
    // Case 1: Match was completed and is now marked incomplete — reverse old stats
    if (flags.wasCompleted && !flags.isNowCompleted) {
      if (prevMatch.winnerId && prevMatch.loserId) {
        await reverseStatsForMatch(prevMatch);
        await upsertTeamSeasonStats();
      }
      return true;
    }

    // Case 2: Match is (still or newly) completed and stats need updating
    const needsUpdate =
      !flags.wasCompleted || flags.winnerChanged || flags.loserChanged || flags.gameWinsChanged;
    if (!(flags.isNowCompleted && needsUpdate && nextMatch.winnerId && nextMatch.loserId)) {
      return true;
    }

    // If it was already completed and something changed, reverse old stats first
    if (flags.wasCompleted) {
      await reverseStatsForMatch(prevMatch);
    }

    const statsSuccess = await updateTeamRecords(
      nextMatch.winnerId,
      nextMatch.loserId,
      teams,
      gameWinsFor(nextMatch, nextMatch.winnerId),
      gameWinsFor(nextMatch, nextMatch.loserId)
    );

    if (statsSuccess) return true;

    // Attempt automatic reconciliation via upsert_team_season_stats
    try {
      await upsertTeamSeasonStats();
      invalidateAllDataQueries(queryClient);
      toast({
        title: 'Partial Failure (Auto-Recovered)',
        description:
          'Match was updated but team records failed to save. Season stats were reconciled automatically.',
        variant: 'destructive',
      });
    } catch (reconcileError) {
      errorLog('Failed to reconcile team season stats after partial failure:', reconcileError);
      toast({
        title: 'Partial Failure',
        description:
          'Match was updated but team records failed to save. Please contact an admin to reconcile stats.',
        variant: 'destructive',
      });
    }
    return false;
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

      const updatePayload: {
        team1_id: string;
        team2_id: string;
        date: string | undefined;
        location: string;
        iscompleted: boolean | undefined;
        team1_score: number | null;
        team2_score: number | null;
        winner_id: string | null;
        loser_id: string | null;
        team1_game_wins?: number;
        team2_game_wins?: number;
      } = {
        team1_id: matchData.team1Id,
        team2_id: matchData.team2Id,
        date: matchData.date,
        location: matchData.location || '',
        iscompleted: matchData.iscompleted,
        // For incomplete matches, explicitly send NULL so Supabase clears any
        // stale scores / winner / loser from a prior completed state. `undefined`
        // would be stripped from the JSON payload and leave the DB unchanged.
        team1_score: matchData.iscompleted ? (matchData.team1Score ?? null) : null,
        team2_score: matchData.iscompleted ? (matchData.team2Score ?? null) : null,
        winner_id: matchData.iscompleted ? (matchData.winnerId ?? null) : null,
        loser_id: matchData.iscompleted ? (matchData.loserId ?? null) : null,
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
      const updatedMatch = toUpdatedMatch(editingMatch, data);

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
