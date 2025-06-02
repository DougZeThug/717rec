
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SimpleBracketData {
  id: string;
  title: string;
  name?: string; // For backward compatibility, maps to title
  format: string;
  state?: string; // From brackets table
  teams?: any[]; // For legacy component compatibility
  matches: Array<{
    id: string;
    team1Name?: string;
    team2Name?: string;
    team1Logo?: string;
    team2Logo?: string;
    team1Score: number | null;
    team2Score: number | null;
    team1Seed?: number;
    team2Seed?: number;
    winnerId: string | null;
    team1Id: string | null;
    team2Id: string | null;
    status: string;
    matchType: string;
    round: number;
    position: number;
    next_win_match_id?: string | null;
    next_lose_match_id?: string | null;
    nextWinMatchId?: string | null;
    nextLoseMatchId?: string | null;
  }>;
}

export const useBracketData = (bracketId: string) => {
  return useQuery({
    queryKey: ['bracket-data', bracketId],
    queryFn: async (): Promise<SimpleBracketData> => {
      console.log('🔍 useBracketData: Fetching bracket data for ID:', bracketId);
      
      // Fetch bracket info including state
      const { data: bracket, error: bracketError } = await supabase
        .from('brackets')
        .select('id, title, format, state')
        .eq('id', bracketId)
        .single();

      if (bracketError) {
        console.error('❌ Error fetching bracket:', bracketError);
        throw bracketError;
      }

      // Fetch playoff matches with all necessary fields
      const { data: matches, error: matchesError } = await supabase
        .from('playoff_matches')
        .select(`
          id,
          round,
          position,
          match_type,
          team1_id,
          team2_id,
          team1_seed,
          team2_seed,
          team1_score,
          team2_score,
          winner_id,
          next_win_match_id,
          next_lose_match_id,
          status,
          teams1:team1_id(name, logo_url),
          teams2:team2_id(name, logo_url)
        `)
        .eq('bracket_id', bracketId)
        .order('round')
        .order('position');

      if (matchesError) {
        console.error('❌ Error fetching matches:', matchesError);
        throw matchesError;
      }

      console.log('🔍 useBracketData: Raw matches from DB:', matches);

      // Transform matches to expected format
      const transformedMatches = matches?.map((match: any) => ({
        id: match.id,
        team1Name: match.teams1?.name || 'TBD',
        team2Name: match.teams2?.name || 'TBD',
        team1Logo: match.teams1?.logo_url,
        team2Logo: match.teams2?.logo_url,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        team1Seed: match.team1_seed,
        team2Seed: match.team2_seed,
        winnerId: match.winner_id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        status: match.status || 'pending',
        matchType: match.match_type,
        round: match.round,
        position: match.position,
        next_win_match_id: match.next_win_match_id,
        next_lose_match_id: match.next_lose_match_id,
        nextWinMatchId: match.next_win_match_id,
        nextLoseMatchId: match.next_lose_match_id
      })) || [];

      console.log('🔍 useBracketData: Transformed matches:', transformedMatches);

      return {
        id: bracket.id,
        title: bracket.title,
        name: bracket.title, // Map title to name for backward compatibility
        format: bracket.format,
        state: bracket.state,
        teams: [], // Empty array for legacy compatibility
        matches: transformedMatches
      };
    },
    enabled: !!bracketId,
  });
};
