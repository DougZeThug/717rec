import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { fetchPendingMatches, fetchTeamsMap } from '@/services/matches/MatchReadService';
import { approveMatchResult, confirmMatchTie } from '@/services/matches/MatchWriteService';
import { Match, Team } from '@/types';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';
import { transformDatabaseMatches } from '@/utils/matchTransformers';

export function usePendingMatches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending matches (completed but no winner = ties)
  const {
    data: matches = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery<Match[]>({
    queryKey: ['matches', 'pending'],
    // Raised once by the QueryCache onError in App.tsx. In this catch it ran
    // again on every react-query retry, so one failed load raised two.
    meta: { errorToast: 'Failed to load pending matches' },
    queryFn: async () => {
      const data = await fetchPendingMatches();

      return transformDatabaseMatches(data, { normalizeDate: false });
    },
    staleTime: 0,
  });

  // Fetch teams
  const { data: teams = {} } = useQuery<Record<string, Team>>({
    queryKey: ['teams', 'map'],
    meta: { errorToast: 'Failed to load teams' },
    queryFn: async () => {
      const data = await fetchTeamsMap();

      const teamsMap: Record<string, Team> = {};
      data?.forEach((team) => {
        if (!team.team_id) return;
        teamsMap[team.team_id] = {
          id: team.team_id,
          name: team.name || '',
          logoUrl: team.image_url || team.logo_url,
          imageUrl: team.image_url || team.logo_url,
          players: Array.isArray(team.players) ? team.players : [],
          wins: team.wins || 0,
          losses: team.losses || 0,
          game_wins: team.game_wins || 0,
          game_losses: team.game_losses || 0,
          created_at: team.created_at || '',
          division: team.division_id || null,
          divisionName: team.divisionname || null,
          sos: team.sos || 0.5,
          power_score: team.power_score || 0,
          win_percentage: team.win_percentage || 0,
          game_win_percentage: team.game_win_percentage || 0,
        };
      });

      return teamsMap;
    },
    staleTime: 0,
  });

  // Every match with a result write in flight, so the list can lock exactly
  // those matches' actions. A single id is not enough: with one, a second write
  // on another match takes the slot and unlocks the first while it is still
  // running, which is how an admin could still ask for a winner and a tie on the
  // same match. react-query's own `variables` has the same flaw — it reports
  // only the latest call — so the set is kept here instead.
  const [resolvingMatchIds, setResolvingMatchIds] = useState<ReadonlySet<string>>(new Set());

  const beginResolving = (matchId: string) =>
    setResolvingMatchIds((prev) => new Set(prev).add(matchId));

  const endResolving = (matchId: string) =>
    setResolvingMatchIds((prev) => {
      const next = new Set(prev);
      next.delete(matchId);
      return next;
    });

  // Mutation for approving match results — atomic & idempotent via RPC
  const approveMutation = useMutation({
    mutationFn: ({ match, winnerTeamIndex }: { match: Match; winnerTeamIndex: 1 | 2 }) => {
      const winnerId = winnerTeamIndex === 1 ? match.team1Id : match.team2Id;
      const loserId = winnerTeamIndex === 1 ? match.team2Id : match.team1Id;
      const winnerGameWins =
        winnerTeamIndex === 1 ? match.team1_game_wins || 0 : match.team2_game_wins || 0;
      const loserGameWins =
        winnerTeamIndex === 1 ? match.team2_game_wins || 0 : match.team1_game_wins || 0;

      // False means the RPC's guard matched no row: another admin already
      // named a winner, or the match is gone. Nothing was written.
      return approveMatchResult(match.id, winnerId, loserId, winnerGameWins, loserGameWins);
    },
    onMutate: ({ match }) => beginResolving(match.id),
    onSettled: (_data, _error, { match }) => endResolving(match.id),
    onSuccess: async (applied) => {
      if (applied) {
        toast({
          title: 'Result Approved',
          description: 'Match result has been successfully approved.',
        });
      } else {
        toast({
          title: 'Already Resolved',
          description:
            'Another admin already recorded a result for this match, or it was removed. Nothing was changed.',
        });
      }
      // Refresh either way, so a match someone else resolved leaves the list.
      await invalidateMatchRelatedQueries(queryClient);
    },
    onError: (error) => {
      errorLog('Error approving result:', error);
      toast({
        title: 'Error',
        description: getUIErrorMessage(error, 'Failed to approve result'),
        variant: 'destructive',
      });
    },
  });

  // Mutation for confirming a tie. These matches already have no winner, so
  // there is no result to write — confirming stamps the match so it leaves
  // this queue.
  const tieMutation = useMutation({
    mutationFn: async (matchId: string) => {
      await confirmMatchTie(matchId);
    },
    onMutate: (matchId) => beginResolving(matchId),
    // Refresh on success and on failure. Losing the race to an admin who named
    // a winner is an expected failure, and that match must leave the list too.
    onSettled: async (_data, _error, matchId) => {
      endResolving(matchId);
      await invalidateMatchRelatedQueries(queryClient);
    },
    onSuccess: () => {
      toast({
        title: 'Tie Confirmed',
        description: 'The match is recorded as a tie and has left the list.',
      });
    },
    onError: (error) => {
      errorLog('Error confirming tie:', error);
      toast({
        title: 'Error',
        description: getUIErrorMessage(error, 'Failed to confirm the tie'),
        variant: 'destructive',
      });
    },
  });

  const handleApproveResult = async (match: Match, winnerTeamIndex: 1 | 2) => {
    await approveMutation.mutateAsync({ match, winnerTeamIndex });
  };

  const handleMarkAsTie = async (matchId: string) => {
    await tieMutation.mutateAsync(matchId);
  };

  return {
    matches,
    teams,
    isLoading,
    error: queryError?.message ?? null,
    handleApproveResult,
    handleMarkAsTie,
    resolvingMatchIds,
    refetch,
  };
}
