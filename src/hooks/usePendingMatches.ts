import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Match, Team } from '@/types';

export function usePendingMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingMatches();
    fetchTeams();
  }, []);

  const fetchPendingMatches = async () => {
    try {
      // Get matches that are completed but have a tie (winnerId is null)
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('iscompleted', true)
        .is('winner_id', null)
        .order('date');

      if (error) throw error;

      // Transform database fields to match our frontend types
      const transformedMatches: Match[] = (data || []).map(match => ({
        id: match.id,
        team1Id: match.team1_id || '',
        team2Id: match.team2_id || '',
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date || match.created_at || new Date().toISOString(),
        location: match.location || '',
        iscompleted: match.iscompleted || false,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        best_of: match.best_of,
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins,
        match_type: match.match_type,
        season_id: match.season_id,
        metadata: match.metadata
      }));
      
      setMatches(transformedMatches);
    } catch (error) {
      console.error('Error fetching pending matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending matches. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('v_team_details')
        .select('*');

      if (error) throw error;
      
      const teamsMap: Record<string, Team> = {};
      data?.forEach(team => {
        // Transform database team to match our Team interface
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
      
      setTeams(teamsMap);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleApproveResult = async (match: Match, winnerTeamIndex: 1 | 2) => {
    try {
      const winnerId = winnerTeamIndex === 1 ? match.team1Id : match.team2Id;
      const loserId = winnerTeamIndex === 1 ? match.team2Id : match.team1Id;

      const { error } = await supabase
        .from('matches')
        .update({
          winner_id: winnerId,
          loser_id: loserId
        })
        .eq('id', match.id);

      if (error) throw error;
      
      // Update team win/loss records
      await supabase
        .from('teams')
        .update({
          wins: teams[winnerId].wins + 1
        })
        .eq('id', winnerId);
        
      await supabase
        .from('teams')
        .update({
          losses: teams[loserId].losses + 1
        })
        .eq('id', loserId);

      toast({
        title: 'Result Approved',
        description: 'Match result has been successfully approved.',
      });
      
      // Refresh the matches list
      fetchPendingMatches();
    } catch (error) {
      console.error('Error approving result:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve result. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsTie = async (matchId: string) => {
    try {
      // For ties, we keep both winnerId and loserId as null
      const { error } = await supabase
        .from('matches')
        .update({
          winner_id: null,
          loser_id: null
        })
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: 'Match Marked as Tie',
        description: 'Match has been successfully marked as a tie.',
      });
      
      // Refresh the matches list - this match will still show in the list as it's a tie
      fetchPendingMatches();
    } catch (error) {
      console.error('Error marking as tie:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark match as tie. Please try again.',
        variant: 'destructive',
      });
    }
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
    openItems,
    toggleItem,
    handleApproveResult,
    handleMarkAsTie
  };
}
