
import { useState } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";
import { BracketMatchesByType } from "@/services/brackets/types";
import { PlayoffBracket, PlayoffViewModel, Team, PlayoffGame, BracketState, PlayoffMatch } from "@/types/playoffs";
import { BRACKET_STATES } from '@/constants/brackets';

// Very small replacement for legacy BracketService.computeBracketState
const computeBracketState = (state: string) =>
  state === 'underway' ? 'in_progress'
  : state === 'complete' ? 'finished'
  : 'pending';

// Local helper to fetch bracket by ID
const fetchBracketById = async (bracketId: string) => {
  const { data, error } = await supabase
    .from('brackets')
    .select('*')
    .eq('id', bracketId)
    .single();
    
  if (error) throw error;
  return data;
};

// Local helper to group bracket matches by type
const groupBracketMatchesByType = (bracket: any): BracketMatchesByType => {
  // Simple implementation - can be enhanced based on actual bracket structure
  return {
    winners: [],
    losers: [],
    finals: []
  };
};

// Normalization function to convert Supabase rows to PlayoffBracket objects
const mapRowToBracket = (row: any): PlayoffBracket => ({
  ...row,
  /* default when Supabase row has no matches column */
  matches: Array.isArray(row.matches) ? row.matches : [],
  /* normalise state string to BracketState union */
  state: row.state === 'underway' 
    ? 'in_progress' as BracketState
    : row.state === 'complete' 
    ? 'finished' as BracketState
    : 'pending' as BracketState,
});

/**
 * Unified hook for playoff bracket data and management
 */
export function usePlayoffViewModel(bracketId: string | null): PlayoffViewModel {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch teams data from v_team_details view
  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_team_details')
        .select(`
          team_id,
          name,
          logo_url,
          image_url,
          division_id,
          divisionname,
          wins,
          losses,
          game_wins,
          game_losses,
          players
        `)
        .order('name');

      if (error) throw error;

      return (data ?? []).map(row => ({
        id: row.team_id,
        name: row.name ?? 'Unnamed Team',

        // camel-case fields used by TeamDivisionTable
        logoUrl: row.logo_url ?? null,
        imageUrl: row.image_url ?? null,
        division_id: row.division_id ?? null,
        division: row.division_id ?? null,          // legacy fallback
        divisionName: row.divisionname ?? null,

        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        game_wins: row.game_wins ?? 0,
        game_losses: row.game_losses ?? 0,

        players: Array.isArray(row.players) ? row.players : [],
        
        // Additional fields to satisfy Team type
        created_at: new Date().toISOString(),
        seed: null,
        power_score: 0,
        sos: 0.5,
        win_percentage: 0,
        game_win_percentage: 0,
        close_match_losses: 0
      })) as Team[];
    }
  });
  
  // Fetch playoff matches with team data
  const playoffMatchesQuery = useQuery({
    queryKey: ['playoff-matches', bracketId],
    queryFn: async () => {
      if (!bracketId) return [];
      
      const { data, error } = await supabase
        .from('playoff_matches')
        .select(`
          *,
          team1:teams!playoff_matches_team1_id_fkey(id, name, logo_url, image_url),
          team2:teams!playoff_matches_team2_id_fkey(id, name, logo_url, image_url),
          playoff_games(*)
        `)
        .eq('bracket_id', bracketId)
        .order('round')
        .order('position');
        
      if (error) throw error;
      
      // Transform to PlayoffMatch format
      return (data || []).map(match => {
        // Calculate game wins from playoff_games if available
        const games = match.playoff_games || [];
        const team1GameWins = games.filter(game => game.winner_id === match.team1_id).length;
        const team2GameWins = games.filter(game => game.winner_id === match.team2_id).length;
        
        return {
          id: match.id,
          bracket_id: match.bracket_id,
          round: match.round,
          position: match.position,
          team1Id: match.team1_id,
          team2Id: match.team2_id,
          winnerId: match.winner_id,
          loserId: match.loser_id,
          team1Score: match.team1_score,
          team2Score: match.team2_score,
          team1GameWins: team1GameWins || 0,
          team2GameWins: team2GameWins || 0,
          matchType: match.match_type,
          bestOf: match.best_of || 3,
          team1Seed: match.team1_seed,
          team2Seed: match.team2_seed,
          nextWinMatchId: match.next_win_match_id,
          nextLoseMatchId: match.next_lose_match_id,
          status: match.status || 'pending',
          games: games.map(game => ({
            id: game.id,
            matchId: game.match_id,
            gameNumber: game.game_number,
            team1Score: game.team1_score,
            team2Score: game.team2_score,
            winnerId: game.winner_id,
            winner: game.winner_id
          }))
        };
      }) as PlayoffMatch[];
    },
    enabled: !!bracketId
  });
  
  // Fetch bracket data
  const bracketQuery = useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async () => {
      if (!bracketId) return null;
      
      const row = await fetchBracketById(bracketId);
      const bracket = mapRowToBracket(row);
      
      // Use playoff matches if available, otherwise fall back to regular matches
      if (bracket && playoffMatchesQuery.data) {
        bracket.matches = playoffMatchesQuery.data;
      }
      
      // Calculate and update the bracket state if needed
      if (bracket) {
        const calculatedState = computeBracketState(bracket.state);
        if (bracket.state !== calculatedState) {
          // Update the bracket state in the database
          await supabase
            .from('brackets')
            .update({ state: calculatedState })
            .eq('id', bracketId);
          
          // Update the local state
          bracket.state = calculatedState as BracketState;
        }
      }
      
      return bracket;
    },
    enabled: !!bracketId && !playoffMatchesQuery.isLoading
  });
  
  // Process bracket data to separate winners, losers and finals matches
  const bracketMatchesByType: BracketMatchesByType | null = bracketQuery.data
    ? groupBracketMatchesByType(bracketQuery.data)
    : null;
  
  // Handle bracket deletion
  const handleDeleteBracket = async (
    bracketId: string, 
    bracketName: string
  ) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await supabase
        .from('brackets')
        .delete()
        .eq('id', bracketId);
      
      toast({
        title: "Bracket Deleted",
        description: `"${bracketName}" has been successfully deleted.`,
      });
      
      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ['brackets'] });
      await queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });
      await invalidateMatchRelatedQueries(queryClient);
      
    } catch (error) {
      console.error("Error deleting bracket:", error);
      toast({
        title: "Error",
        description: "Failed to delete bracket. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle updating match results
  const handleUpdateMatchResult = async (
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
          status: 'completed'
        })
        .eq('id', matchId);
      
      if (matchError) throw matchError;
      
      // Update games if provided
      if (games && games.length > 0) {
        for (const game of games) {
          if (game.id) {
            await supabase
              .from('playoff_games')
              .upsert({
                id: game.id,
                match_id: matchId,
                game_number: game.gameNumber || 1,
                team1_score: game.team1Score,
                team2_score: game.team2Score,
                winner_id: game.winnerId
              });
          }
        }
      }
      
      // Refetch data after updating match
      playoffMatchesQuery.refetch();
      bracketQuery.refetch();
      
      toast({
        title: "Match Updated",
        description: "Match score has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating match:", error);
      toast({
        title: "Error",
        description: "Failed to update match. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return {
    // Bracket data
    bracket: bracketQuery.data,
    isLoading: bracketQuery.isLoading || playoffMatchesQuery.isLoading,
    error: bracketQuery.error as Error | null,
    bracketMatchesByType,
    
    // Teams data
    teams: teamsQuery.data || [],
    teamsLoading: teamsQuery.isLoading,
    
    // Actions
    refetch: () => Promise.all([bracketQuery.refetch(), playoffMatchesQuery.refetch()]),
    deleteBracket: handleDeleteBracket,
    updateMatchResult: handleUpdateMatchResult
  };
}

// Re-export the BracketMatchesByType type for convenience
export type { BracketMatchesByType } from "@/services/brackets/types";
