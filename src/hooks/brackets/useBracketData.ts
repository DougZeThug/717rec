
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
      console.log('Starting bracket data fetch for:', bracketId);
      
      if (!bracketId) {
        console.log('No bracketId provided');
        return null;
      }

      try {
        // Step 1: Get bracket info
        console.log('Fetching bracket info...');
        const { data: bracket, error: bracketError } = await supabase
          .from('brackets')
          .select('*')
          .eq('id', bracketId)
          .single();

        if (bracketError) {
          console.error('Bracket query error:', bracketError);
          throw bracketError;
        }

        if (!bracket) {
          console.log('No bracket found with ID:', bracketId);
          return null;
        }

        console.log('Bracket found:', {
          id: bracket.id,
          title: bracket.title,
          division_id: bracket.division_id,
          state: bracket.state
        });

        // Step 2: Get ALL playoff matches for this bracket
        console.log('Fetching playoff matches...');
        const { data: rawMatches, error: matchesError } = await supabase
          .from('playoff_matches')
          .select('*')
          .eq('bracket_id', bracketId)
          .order('round', { ascending: true })
          .order('position', { ascending: true });

        if (matchesError) {
          console.error('Matches query error:', matchesError);
          throw matchesError;
        }

        console.log('Raw matches from DB:', {
          totalMatches: rawMatches?.length || 0,
          isArray: Array.isArray(rawMatches)
        });
        
        if (!rawMatches || rawMatches.length === 0) {
          console.warn('No matches found in database for bracket:', bracketId);
        }

        // Step 3: Get teams for the division
        console.log('Fetching division teams...');
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, logo_url, image_url')
          .eq('division_id', bracket.division_id);

        if (teamsError) {
          console.error('Teams query error:', teamsError);
          throw teamsError;
        }

        console.log('Teams found:', {
          teamsCount: teams?.length || 0
        });

        // Step 4: Create team lookup map
        const teamLookup = new Map();
        (teams || []).forEach(team => {
          teamLookup.set(team.id, team);
        });

        // Step 5: Transform matches with team data
        const transformedMatches = (rawMatches || []).map((match) => {
          const team1 = match.team1_id ? teamLookup.get(match.team1_id) : null;
          const team2 = match.team2_id ? teamLookup.get(match.team2_id) : null;
          
          return {
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
        });

        console.log('Transformed matches:', {
          originalMatchesCount: rawMatches?.length || 0,
          transformedMatchesCount: transformedMatches.length,
          transformedMatchesIsArray: Array.isArray(transformedMatches)
        });

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

        console.log('Final result:', {
          bracketId: result.id,
          bracketName: result.name,
          matchesInResult: result.matches?.length || 0,
          matchesIsArray: Array.isArray(result.matches),
          teamsCount: result.teams.length
        });

        // Verify the result object has matches before returning
        if (!result.matches || !Array.isArray(result.matches)) {
          console.error('CRITICAL ERROR - matches property is not an array!', {
            matchesProperty: result.matches,
            typeOfMatches: typeof result.matches
          });
        }

        return result;

      } catch (error) {
        console.error('CRITICAL ERROR in useBracketData:', error);
        throw error;
      }
    },
    enabled: !!bracketId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      console.log(`Query retry attempt ${failureCount} for bracket ${bracketId}:`, error);
      return failureCount < 2; // Retry up to 2 times
    },
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false
  });
};
