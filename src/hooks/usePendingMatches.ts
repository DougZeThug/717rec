import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { batchInvalidateQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { useToast } from '@/hooks/useToast';
import { fetchPendingMatches, fetchTeamsMap } from '@/services/matches/MatchReadService';
import { approveMatchResult, confirmMatchTie } from '@/services/matches/MatchWriteService';
import { Match, Team } from '@/types';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';
import { transformDatabaseMatches } from '@/utils/matchTransformers';

export function usePendingMatches() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
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
    queryFn: async () => {
      let data;
      try {
        data = await fetchPendingMatches();
      } catch (error) {
        errorLog('Error fetching pending matches:', error);
        toast({
          title: 'Error',
          description: getUIErrorMessage(error, 'Failed to load pending matches'),
          variant: 'destructive',
        });
        throw error;
      }

      return transformDatabaseMatches(data, { normalizeDate: false });
    },
    staleTime: 0,
  });

  // Fetch teams
  const { data: teams = {} } = useQuery<Record<string, Team>>({
    queryKey: ['teams', 'map'],
    queryFn: async () => {
      let data;
      try {
        data = await fetchTeamsMap();
      } catch (error) {
        errorLog('Error fetching teams:', error);
        toast({
          title: 'Error',
          description: getUIErrorMessage(error, 'Failed to load teams'),
          variant: 'destructive',
        });
        throw error;
      }

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

  // Mutation for approving match results — atomic & idempotent via RPC
  const approveMutation = useMutation({
    mutationFn: async ({ match, winnerTeamIndex }: { match: Match; winnerTeamIndex: 1 | 2 }) => {
      const winnerId = winnerTeamIndex === 1 ? match.team1Id : match.team2Id;
      const loserId = winnerTeamIndex === 1 ? match.team2Id : match.team1Id;
      const winnerGameWins =
        winnerTeamIndex === 1 ? match.team1_game_wins || 0 : match.team2_game_wins || 0;
      const loserGameWins =
        winnerTeamIndex === 1 ? match.team2_game_wins || 0 : match.team1_game_wins || 0;

      await approveMatchResult(match.id, winnerId, loserId, winnerGameWins, loserGameWins);
    },
    onSuccess: () => {
      toast({
        title: 'Result Approved',
        description: 'Match result has been successfully approved.',
      });
      batchInvalidateQueries(queryClient, ['matches', 'teams']);
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
    onSuccess: () => {
      toast({
        title: 'Tie Confirmed',
        description: 'The match is recorded as a tie and has left the list.',
      });
      batchInvalidateQueries(queryClient, ['matches', 'teams']);
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

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return {
    matches,
    teams,
    isLoading,
    error: queryError?.message ?? null,
    openItems,
    toggleItem,
    handleApproveResult,
    handleMarkAsTie,
    refetch,
  };
}
