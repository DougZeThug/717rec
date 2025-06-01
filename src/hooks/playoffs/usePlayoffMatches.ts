
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlayoffMatch } from "@/types/playoffs";

export const usePlayoffMatches = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['playoff-matches', bracketId],
    queryFn: async (): Promise<PlayoffMatch[]> => {
      console.log('🔄 usePlayoffMatches: Fetching matches for bracketId:', bracketId);
      
      if (!bracketId) {
        console.log('🔄 usePlayoffMatches: No bracketId provided, returning empty array');
        return [];
      }
      
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
        
      if (error) {
        console.error('🔄 usePlayoffMatches: Database error:', error);
        throw error;
      }
      
      console.log('🔄 usePlayoffMatches: Found', data?.length || 0, 'matches');
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Simple transformation without complex logic
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
      
      console.log('🔄 usePlayoffMatches: Returning', transformedMatches.length, 'matches');
      return transformedMatches;
    },
    enabled: !!bracketId,
    staleTime: 1000 * 60 * 5, // 5 minutes - no more frequent polling
    retry: 1, // Single retry only
    refetchOnMount: false, // Manual refresh only
    refetchOnWindowFocus: false // No automatic refresh
  });
};
