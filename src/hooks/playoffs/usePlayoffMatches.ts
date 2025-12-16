
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlayoffMatch } from "@/utils/playoffs/playoffTypes";

export const usePlayoffMatches = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['playoff-matches', bracketId],
    queryFn: async (): Promise<PlayoffMatch[]> => {
      console.log('🔄 usePlayoffMatches: Fetching matches for bracketId:', bracketId);
      
      if (!bracketId) {
        console.log('🔄 usePlayoffMatches: No bracketId provided, returning empty array');
        return [];
      }
      
      // Use the new foreign key constraints for proper team data fetching
      const { data, error } = await supabase
        .from('playoff_matches')
        .select(`
          *,
          team1:teams!fk_playoff_matches_team1(id, name, logo_url, image_url),
          team2:teams!fk_playoff_matches_team2(id, name, logo_url, image_url),
          playoff_games(*)
        `)
        .eq('bracket_id', bracketId)
        .order('round')
        .order('position');
        
      if (error) {
        console.error('🔄 usePlayoffMatches: Database error:', error);
        throw error;
      }
      
      console.log('🔄 usePlayoffMatches: Found', data?.length || 0, 'matches');
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Transform with proper team data
      const transformedMatches = data.map(match => {
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
          // Include team data
          team1: match.team1 ? {
            id: match.team1.id,
            name: match.team1.name,
            logo_url: match.team1.logo_url || match.team1.image_url
          } : undefined,
          team2: match.team2 ? {
            id: match.team2.id,
            name: match.team2.name,
            logo_url: match.team2.logo_url || match.team2.image_url
          } : undefined,
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
      
      console.log('🔄 usePlayoffMatches: Returning', transformedMatches.length, 'matches with team data');
      return transformedMatches;
    },
    enabled: !!bracketId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
};
