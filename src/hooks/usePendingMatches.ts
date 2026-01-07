import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Match, Team } from '@/types';
import { transformDatabaseMatches } from '@/utils/matchTransformers';
import { applyMatchResult } from '@/hooks/team-stats/utils/teamRecordUtils';

export function usePendingMatches() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending matches (completed but no winner = ties)
  const { data: matches = [], isLoading, error: queryError, refetch } = useQuery<Match[]>({
    queryKey: ['matches', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('iscompleted', true)
        .is('winner_id', null)
        .order('date');

      if (error) {
        console.error('Error fetching pending matches:', error);
        toast({
          title: 'Error',
          description: 'Failed to load pending matches. Please try again.',
          variant: 'destructive',
        });
        throw error;
      }

      return transformDatabaseMatches(data || [], { normalizeDate: false });
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch teams
  const { data: teams = {} } = useQuery<Record<string, Team>>({
    queryKey: ['teams', 'map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_team_details')
        .select('*');

      if (error) {
        console.error('Error fetching teams:', error);
        toast({
          title: 'Error',
          description: 'Failed to load teams. Please try again.',
          variant: 'destructive',
        });
        throw error;
      }
      
      const teamsMap: Record<string, Team> = {};
      data?.forEach(team => {
        teamsMap[team.team_id] = {
          id: team.team_id,
          name: team.name,
          logoUrl: team.logo_url,
          imageUrl: team.image_url,
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
          game_win_percentage: team.game_win_percentage || 0
        };
      });
      
      return teamsMap;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for approving match results
  const approveMutation = useMutation({
    mutationFn: async ({ match, winnerTeamIndex }: { match: Match; winnerTeamIndex: 1 | 2 }) => {
      const winnerId = winnerTeamIndex === 1 ? match.team1Id : match.team2Id;
      const loserId = winnerTeamIndex === 1 ? match.team2Id : match.team1Id;
      const winnerGameWins = winnerTeamIndex === 1 ? (match.team1_game_wins || 0) : (match.team2_game_wins || 0);
      const loserGameWins = winnerTeamIndex === 1 ? (match.team2_game_wins || 0) : (match.team1_game_wins || 0);

      // Update match with winner/loser
      const { error } = await supabase
        .from('matches')
        .update({
          winner_id: winnerId,
          loser_id: loserId
        })
        .eq('id', match.id);

      if (error) throw error;
      
      // Use atomic RPC to update team stats (prevents race conditions)
      await applyMatchResult(winnerId, loserId, winnerGameWins, loserGameWins);
    },
    onSuccess: () => {
      toast({
        title: 'Result Approved',
        description: 'Match result has been successfully approved.',
      });
      // Invalidate all match-related queries
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error) => {
      console.error('Error approving result:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve result. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for marking as tie
  const tieMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from('matches')
        .update({
          winner_id: null,
          loser_id: null
        })
        .eq('id', matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Match Marked as Tie',
        description: 'Match has been successfully marked as a tie.',
      });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (error) => {
      console.error('Error marking as tie:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark match as tie. Please try again.',
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
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
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
    refetch
  };
}
