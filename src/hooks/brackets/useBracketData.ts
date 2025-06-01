
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
      console.log('🔍 PHASE 4 DIAGNOSIS: Starting bracket data fetch for:', bracketId);
      
      if (!bracketId) {
        console.log('🔍 PHASE 4 DIAGNOSIS: No bracketId provided');
        return null;
      }

      try {
        // Step 1: Get bracket info with simpler query
        console.log('🔍 PHASE 4 DIAGNOSIS: Step 1 - Fetching bracket info...');
        const { data: bracket, error: bracketError } = await supabase
          .from('brackets')
          .select('*')
          .eq('id', bracketId)
          .single();

        if (bracketError) {
          console.error('🔍 PHASE 4 DIAGNOSIS: Bracket query error:', bracketError);
          throw bracketError;
        }

        if (!bracket) {
          console.log('🔍 PHASE 4 DIAGNOSIS: No bracket found with ID:', bracketId);
          return null;
        }

        console.log('🔍 PHASE 4 DIAGNOSIS: Step 1 SUCCESS - Bracket found:', {
          id: bracket.id,
          title: bracket.title,
          division_id: bracket.division_id,
          state: bracket.state
        });

        // Step 2: Get ALL playoff matches for this bracket (simplified query)
        console.log('🔍 PHASE 4 DIAGNOSIS: Step 2 - Fetching playoff matches...');
        const { data: rawMatches, error: matchesError } = await supabase
          .from('playoff_matches')
          .select('*')
          .eq('bracket_id', bracketId)
          .order('round', { ascending: true })
          .order('position', { ascending: true });

        if (matchesError) {
          console.error('🔍 PHASE 4 DIAGNOSIS: Matches query error:', matchesError);
          throw matchesError;
        }

        console.log('🔍 PHASE 4 DIAGNOSIS: Step 2 RAW MATCHES FROM DB:', {
          totalMatches: rawMatches?.length || 0,
          rawMatchesArray: rawMatches,
          isArray: Array.isArray(rawMatches),
          firstMatch: rawMatches?.[0],
          lastMatch: rawMatches?.[rawMatches?.length - 1]
        });
        
        if (rawMatches && rawMatches.length > 0) {
          console.log('🔍 PHASE 4 DIAGNOSIS: DETAILED MATCH ANALYSIS:', {
            totalMatches: rawMatches.length,
            roundsFound: [...new Set(rawMatches.map(m => m.round))].sort(),
            matchTypes: [...new Set(rawMatches.map(m => m.match_type))],
            positionsFound: [...new Set(rawMatches.map(m => m.position))].sort(),
            sampleMatches: rawMatches.slice(0, 3).map(m => ({
              id: m.id,
              round: m.round,
              position: m.position,
              match_type: m.match_type,
              team1_id: m.team1_id,
              team2_id: m.team2_id,
              status: m.status
            }))
          });
        } else {
          console.error('🔍 PHASE 4 DIAGNOSIS: CRITICAL - NO MATCHES FOUND IN DATABASE!', {
            bracketId,
            queryResult: rawMatches,
            queryError: matchesError
          });
        }

        // Step 3: Get teams for the division (simplified query)
        console.log('🔍 PHASE 4 DIAGNOSIS: Step 3 - Fetching division teams...');
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, logo_url, image_url')
          .eq('division_id', bracket.division_id);

        if (teamsError) {
          console.error('🔍 PHASE 4 DIAGNOSIS: Teams query error:', teamsError);
          throw teamsError;
        }

        console.log('🔍 PHASE 4 DIAGNOSIS: Step 3 SUCCESS - Teams found:', {
          teamsCount: teams?.length || 0,
          teams: teams?.map(t => ({ id: t.id, name: t.name }))
        });

        // Step 4: Create team lookup map
        console.log('🔍 PHASE 4 DIAGNOSIS: Step 4 - Creating team lookup map...');
        const teamLookup = new Map();
        (teams || []).forEach(team => {
          teamLookup.set(team.id, team);
        });
        console.log('🔍 PHASE 4 DIAGNOSIS: Team lookup map created with', teamLookup.size, 'teams');

        // Step 5: Transform matches with team data - CRITICAL SECTION
        console.log('🔍 PHASE 4 DIAGNOSIS: Step 5 - STARTING MATCH TRANSFORMATION...');
        console.log('🔍 PHASE 4 DIAGNOSIS: Pre-transformation check:', {
          rawMatchesExists: !!rawMatches,
          rawMatchesLength: rawMatches?.length,
          rawMatchesIsArray: Array.isArray(rawMatches)
        });

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
          
          if (index < 5) { // Log first 5 matches for debugging
            console.log(`🔍 PHASE 4 DIAGNOSIS: Transformed match ${index + 1}:`, {
              originalMatch: match,
              transformedMatch: transformed
            });
          }
          
          return transformed;
        });

        console.log('🔍 PHASE 4 DIAGNOSIS: POST-TRANSFORMATION ANALYSIS:', {
          originalMatchesCount: rawMatches?.length || 0,
          transformedMatchesCount: transformedMatches.length,
          transformedMatchesIsArray: Array.isArray(transformedMatches),
          transformedMatchesExists: !!transformedMatches,
          firstTransformedMatch: transformedMatches[0],
          allTransformedMatches: transformedMatches
        });

        // Step 6: Build final result - CRITICAL SECTION
        const result: SimpleBracketData = {
          id: bracket.id,
          name: bracket.title,
          format: bracket.format || 'Double Elimination',
          state: bracket.state || 'pending',
          division: bracket.division_id,
          matches: transformedMatches,
          teams: teams || []
        };

        console.log('🔍 PHASE 4 DIAGNOSIS: FINAL RESULT BEFORE RETURN:', {
          bracketId: result.id,
          bracketName: result.name,
          matchesInResult: result.matches?.length || 0,
          matchesArray: result.matches,
          matchesIsArray: Array.isArray(result.matches),
          teamsCount: result.teams.length,
          state: result.state,
          format: result.format,
          completeResult: result
        });

        // CRITICAL: Verify the result object has matches before returning
        if (!result.matches || !Array.isArray(result.matches)) {
          console.error('🔍 PHASE 4 DIAGNOSIS: CRITICAL ERROR - matches property is not an array!', {
            matchesProperty: result.matches,
            typeOfMatches: typeof result.matches,
            resultObject: result
          });
        }

        return result;

      } catch (error) {
        console.error('🔍 PHASE 4 DIAGNOSIS: CRITICAL ERROR in useBracketData:', error);
        console.error('🔍 PHASE 4 DIAGNOSIS: Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          bracketId,
          stack: error.stack
        });
        throw error;
      }
    },
    enabled: !!bracketId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      console.log(`🔍 PHASE 4 DIAGNOSIS: Query retry attempt ${failureCount} for bracket ${bracketId}:`, error);
      return failureCount < 2; // Retry up to 2 times
    },
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false
  });
};
