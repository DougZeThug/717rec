
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlayoffMatch } from "@/types/playoffs";

export const usePlayoffMatches = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['playoff-matches', bracketId],
    queryFn: async (): Promise<PlayoffMatch[]> => {
      console.log('🔄 usePlayoffMatches: Starting query for bracketId:', bracketId);
      console.log('🔄 usePlayoffMatches: Query executing at timestamp:', new Date().toISOString());
      
      if (!bracketId) {
        console.log('🔄 usePlayoffMatches: No bracketId provided, returning empty array');
        return [];
      }
      
      console.log('🔄 usePlayoffMatches: Fetching matches from playoff_matches table...');
      
      // Try the full query with JOINs directly - no basic query first
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
        console.error('🔄 usePlayoffMatches: Database error with JOINs:', error);
        
        // Fallback to basic query without JOINs
        console.log('🔄 usePlayoffMatches: Falling back to basic query without JOINs...');
        const { data: basicData, error: basicError } = await supabase
          .from('playoff_matches')
          .select('*')
          .eq('bracket_id', bracketId)
          .order('round')
          .order('position');
          
        if (basicError) {
          console.error('🔄 usePlayoffMatches: Basic query error:', basicError);
          throw basicError;
        }
        
        console.log('🔄 usePlayoffMatches: Basic query result:', basicData?.length || 0, 'matches');
        
        if (!basicData || basicData.length === 0) {
          console.log('🔄 usePlayoffMatches: No matches found in basic query for bracketId:', bracketId);
          return [];
        }
        
        // Transform basic data to PlayoffMatch format
        const transformedMatches = basicData.map(match => ({
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
          team1GameWins: 0,
          team2GameWins: 0,
          matchType: match.match_type,
          bestOf: match.best_of || 3,
          team1Seed: match.team1_seed,
          team2Seed: match.team2_seed,
          nextWinMatchId: match.next_win_match_id,
          nextLoseMatchId: match.next_lose_match_id,
          status: match.status || 'pending',
          games: []
        })) as PlayoffMatch[];
        
        console.log('🔄 usePlayoffMatches: Fallback transformation complete:', transformedMatches.length, 'matches');
        return transformedMatches;
      }
      
      console.log('🔄 usePlayoffMatches: Full query successful - Raw database result:', data);
      console.log('🔄 usePlayoffMatches: Found', data?.length || 0, 'matches');
      
      if (!data || data.length === 0) {
        console.log('🔄 usePlayoffMatches: No matches found in full query for bracketId:', bracketId);
        return [];
      }
      
      // Transform to PlayoffMatch format
      const transformedMatches = data.map(match => {
        console.log('🔄 usePlayoffMatches: Transforming match:', match.id);
        
        // Calculate game wins from playoff_games if available
        const games = match.playoff_games || [];
        const team1GameWins = games.filter(game => game.winner_id === match.team1_id).length;
        const team2GameWins = games.filter(game => game.winner_id === match.team2_id).length;
        
        const transformedMatch = {
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
        
        console.log('🔄 usePlayoffMatches: Transformed match:', transformedMatch);
        return transformedMatch;
      }) as PlayoffMatch[];
      
      console.log('🔄 usePlayoffMatches: Final transformed matches:', transformedMatches);
      console.log('🔄 usePlayoffMatches: Returning', transformedMatches.length, 'matches');
      
      return transformedMatches;
    },
    enabled: !!bracketId,
    staleTime: 1000 * 30, // 30 seconds to avoid constant refetching
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      console.log('🔄 usePlayoffMatches: Query failed, retry attempt:', failureCount, 'Error:', error);
      return failureCount < 5; // Retry up to 5 times with exponential backoff
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
