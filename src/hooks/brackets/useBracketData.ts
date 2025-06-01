
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SimpleBracketData {
  id: string;
  name: string;
  format: string;
  state: string;
  division: string;
  matches: Array<{
    id: string;
    round: number;
    position: number;
    team1Id: string | null;
    team2Id: string | null;
    team1Name?: string;
    team2Name?: string;
    winnerId: string | null;
    team1Score: number | null;
    team2Score: number | null;
    matchType: string;
    status: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    logo_url?: string;
  }>;
}

export const useBracketData = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['simple-bracket', bracketId],
    queryFn: async (): Promise<SimpleBracketData | null> => {
      console.log('🎯 useBracketData: Fetching bracket data for:', bracketId);
      
      if (!bracketId) {
        console.log('🎯 useBracketData: No bracketId provided');
        return null;
      }

      // Get bracket info
      const { data: bracket, error: bracketError } = await supabase
        .from('brackets')
        .select('*')
        .eq('id', bracketId)
        .single();

      if (bracketError) {
        console.error('🎯 useBracketData: Bracket error:', bracketError);
        throw bracketError;
      }

      if (!bracket) {
        console.log('🎯 useBracketData: No bracket found');
        return null;
      }

      // Get matches for this bracket
      const { data: matches, error: matchesError } = await supabase
        .from('playoff_matches')
        .select(`
          *,
          team1:teams!playoff_matches_team1_id_fkey(id, name, logo_url),
          team2:teams!playoff_matches_team2_id_fkey(id, name, logo_url)
        `)
        .eq('bracket_id', bracketId)
        .order('round')
        .order('position');

      if (matchesError) {
        console.error('🎯 useBracketData: Matches error:', matchesError);
        throw matchesError;
      }

      // Get all teams for this bracket's division
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, logo_url')
        .eq('division_id', bracket.division_id);

      if (teamsError) {
        console.error('🎯 useBracketData: Teams error:', teamsError);
        throw teamsError;
      }

      console.log('🎯 useBracketData: Successfully fetched data:', {
        bracket: bracket.title,
        matchesCount: matches?.length || 0,
        teamsCount: teams?.length || 0
      });

      return {
        id: bracket.id,
        name: bracket.title,
        format: bracket.format || 'Double Elimination',
        state: bracket.state || 'pending',
        division: bracket.division_id,
        matches: (matches || []).map(match => ({
          id: match.id,
          round: match.round,
          position: match.position,
          team1Id: match.team1_id,
          team2Id: match.team2_id,
          team1Name: match.team1?.name,
          team2Name: match.team2?.name,
          winnerId: match.winner_id,
          team1Score: match.team1_score,
          team2Score: match.team2_score,
          matchType: match.match_type || 'winners',
          status: match.status || 'pending'
        })),
        teams: teams || []
      };
    },
    enabled: !!bracketId,
    staleTime: 1000 * 30, // 30 seconds
    retry: 1
  });
};
