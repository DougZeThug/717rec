
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
    team1Logo?: string;
    team2Logo?: string;
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
    queryKey: ['bracket-data', bracketId],
    queryFn: async (): Promise<SimpleBracketData | null> => {
      console.log('🔍 PHASE 1 FIX: Starting bracket data fetch for:', bracketId);
      
      if (!bracketId) {
        console.log('🔍 PHASE 1 FIX: No bracketId provided');
        return null;
      }

      try {
        // Step 1: Get bracket info with simpler query
        console.log('🔍 PHASE 1 FIX: Step 1 - Fetching bracket info...');
        const { data: bracket, error: bracketError } = await supabase
          .from('brackets')
          .select('*')
          .eq('id', bracketId)
          .single();

        if (bracketError) {
          console.error('🔍 PHASE 1 FIX: Bracket query error:', bracketError);
          throw bracketError;
        }

        if (!bracket) {
          console.log('🔍 PHASE 1 FIX: No bracket found with ID:', bracketId);
          return null;
        }

        console.log('🔍 PHASE 1 FIX: Step 1 SUCCESS - Bracket found:', {
          id: bracket.id,
          title: bracket.title,
          division_id: bracket.division_id,
          state: bracket.state
        });

        // Step 2: Get ALL playoff matches for this bracket (simplified query)
        console.log('🔍 PHASE 1 FIX: Step 2 - Fetching playoff matches...');
        const { data: rawMatches, error: matchesError } = await supabase
          .from('playoff_matches')
          .select('*')
          .eq('bracket_id', bracketId)
          .order('round', { ascending: true })
          .order('position', { ascending: true });

        if (matchesError) {
          console.error('🔍 PHASE 1 FIX: Matches query error:', matchesError);
          throw matchesError;
        }

        console.log('🔍 PHASE 1 FIX: Step 2 SUCCESS - Raw matches found:', rawMatches?.length || 0);
        
        if (rawMatches && rawMatches.length > 0) {
          console.log('🔍 PHASE 1 FIX: Sample match data:', {
            firstMatch: rawMatches[0],
            totalMatches: rawMatches.length,
            roundsFound: [...new Set(rawMatches.map(m => m.round))].sort()
          });
        }

        // Step 3: Get teams for the division (simplified query)
        console.log('🔍 PHASE 1 FIX: Step 3 - Fetching division teams...');
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, logo_url, image_url')
          .eq('division_id', bracket.division_id);

        if (teamsError) {
          console.error('🔍 PHASE 1 FIX: Teams query error:', teamsError);
          throw teamsError;
        }

        console.log('🔍 PHASE 1 FIX: Step 3 SUCCESS - Teams found:', teams?.length || 0);

        // Step 4: Create team lookup map
        console.log('🔍 PHASE 1 FIX: Step 4 - Creating team lookup map...');
        const teamLookup = new Map();
        (teams || []).forEach(team => {
          teamLookup.set(team.id, team);
        });
        console.log('🔍 PHASE 1 FIX: Team lookup map created with', teamLookup.size, 'teams');

        // Step 5: Transform matches with team data
        console.log('🔍 PHASE 1 FIX: Step 5 - Transforming matches...');
        const transformedMatches = (rawMatches || []).map((match, index) => {
          const team1 = match.team1_id ? teamLookup.get(match.team1_id) : null;
          const team2 = match.team2_id ? teamLookup.get(match.team2_id) : null;
          
          const transformed = {
            id: match.id,
            round: match.round,
            position: match.position,
            team1Id: match.team1_id,
            team2Id: match.team2_id,
            team1Name: team1?.name,
            team2Name: team2?.name,
            team1Logo: team1?.logo_url || team1?.image_url,
            team2Logo: team2?.logo_url || team2?.image_url,
            winnerId: match.winner_id,
            team1Score: match.team1_score,
            team2Score: match.team2_score,
            matchType: match.match_type || 'winners',
            status: match.status || 'pending'
          };
          
          if (index < 3) { // Log first 3 matches for debugging
            console.log(`🔍 PHASE 1 FIX: Transformed match ${index + 1}:`, {
              id: transformed.id,
              round: transformed.round,
              position: transformed.position,
              team1: transformed.team1Name || 'TBD',
              team2: transformed.team2Name || 'TBD',
              status: transformed.status
            });
          }
          
          return transformed;
        });

        console.log('🔍 PHASE 1 FIX: Step 5 SUCCESS - Transformed', transformedMatches.length, 'matches');

        // Step 6: Build final result
        const result: SimpleBracketData = {
          id: bracket.id,
          name: bracket.title,
          format: bracket.format || 'Double Elimination',
          state: bracket.state || 'pending',
          division: bracket.division_id,
          matches: transformedMatches,
          teams: teams || []
        };

        console.log('🔍 PHASE 1 FIX: FINAL RESULT:', {
          bracketId: result.id,
          bracketName: result.name,
          matchesCount: result.matches.length,
          teamsCount: result.teams.length,
          state: result.state,
          format: result.format
        });

        return result;

      } catch (error) {
        console.error('🔍 PHASE 1 FIX: CRITICAL ERROR in useBracketData:', error);
        console.error('🔍 PHASE 1 FIX: Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          bracketId
        });
        throw error;
      }
    },
    enabled: !!bracketId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      console.log(`🔍 PHASE 1 FIX: Query retry attempt ${failureCount} for bracket ${bracketId}:`, error);
      return failureCount < 2; // Retry up to 2 times
    },
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false
  });
};
