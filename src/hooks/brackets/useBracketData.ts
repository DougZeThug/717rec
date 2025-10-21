

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SimpleBracketData {
  id: string;
  name: string;
  title: string;
  format: string;
  state: string;
  division: string;
  challonge_tournament_id?: number | null;
  uses_brackets_manager?: boolean;
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
    nextWinMatchId?: string | null;
    nextLoseMatchId?: string | null;
    team1Seed?: number | null;
    team2Seed?: number | null;
  }>;
  teams: Array<{
    id: string;
    name: string;
    logo_url?: string;
  }>;
  participants?: Array<{
    position: number;
    team_id: string;
    name: string;
    logo_url?: string;
    image_url?: string;
  }>;
}

export const useBracketData = (bracketId: string | null) => {
  return useQuery({
    queryKey: ['bracket-data', bracketId],
    queryFn: async (): Promise<SimpleBracketData | null> => {
      console.log('🎯 DEBUG: useBracketData queryFn called:', {
        bracketId,
        bracketIdType: typeof bracketId,
        bracketIdValid: !!bracketId,
        timestamp: new Date().toISOString()
      });
      
      if (!bracketId) {
        console.log('🎯 DEBUG: No bracketId provided, returning null');
        return null;
      }

      try {
        // Step 1: Get bracket info with state field
        console.log('🎯 DEBUG: Step 1 - Fetching bracket info for ID:', bracketId);
      const { data: bracket, error: bracketError } = await supabase
        .from('brackets')
        .select('id, title, format, state, division_id, challonge_tournament_id, uses_brackets_manager')
        .eq('id', bracketId)
        .single();

        if (bracketError) {
          console.error('🎯 DEBUG: Bracket query error:', bracketError);
          throw bracketError;
        }

        if (!bracket) {
          console.log('🎯 DEBUG: No bracket found with ID:', bracketId);
          return null;
        }

        console.log('🎯 DEBUG: Step 1 Complete - Bracket found:', {
          id: bracket.id,
          title: bracket.title,
          division_id: bracket.division_id,
          state: bracket.state,
          format: bracket.format,
          challonge_tournament_id: bracket.challonge_tournament_id
        });

        // Step 2: Get ALL playoff matches with relationship fields
        console.log('🎯 DEBUG: Step 2 - Fetching playoff matches for bracket:', bracketId);
        const { data: rawMatches, error: matchesError } = await supabase
          .from('playoff_matches')
          .select(`
            id,
            round,
            position,
            team1_id,
            team2_id,
            winner_id,
            team1_score,
            team2_score,
            match_type,
            status,
            next_win_match_id,
            next_lose_match_id,
            team1_seed,
            team2_seed
          `)
          .eq('bracket_id', bracketId)
          .order('round', { ascending: true })
          .order('position', { ascending: true });

        if (matchesError) {
          console.error('🎯 DEBUG: Matches query error:', matchesError);
          throw matchesError;
        }

        console.log('🎯 DEBUG: Step 2 Complete - Raw matches from DB:', {
          totalMatches: rawMatches?.length || 0,
          isArray: Array.isArray(rawMatches),
          sampleMatch: rawMatches?.[0] ? {
            id: rawMatches[0].id,
            round: rawMatches[0].round,
            position: rawMatches[0].position,
            matchType: rawMatches[0].match_type,
            hasNextWin: !!rawMatches[0].next_win_match_id,
            hasNextLose: !!rawMatches[0].next_lose_match_id
          } : null
        });
        
        if (!rawMatches || rawMatches.length === 0) {
          console.warn('🎯 DEBUG: No matches found in database for bracket:', bracketId);
        }

        // Step 3: Extract all unique team IDs from matches
        console.log('🎯 DEBUG: Step 3 - Extracting team IDs from matches');
        const teamIdsSet = new Set<string>();

        rawMatches?.forEach(match => {
          if (match.team1_id) teamIdsSet.add(match.team1_id);
          if (match.team2_id) teamIdsSet.add(match.team2_id);
          if (match.winner_id) teamIdsSet.add(match.winner_id);
        });

        const teamIds = Array.from(teamIdsSet);

        console.log('🎯 DEBUG: Step 3 Complete - Team IDs extracted:', {
          uniqueTeamIds: teamIds.length,
          sampleIds: teamIds.slice(0, 3)
        });

        // Step 4: Fetch team details for all teams in matches
        let teamLookup = new Map();

        if (teamIds.length > 0) {
          console.log('🎯 DEBUG: Step 4 - Fetching team details for', teamIds.length, 'teams');
          
          const { data: teamDetails, error: teamsError } = await supabase
            .from('teams')
            .select('id, name, image_url')
            .in('id', teamIds);
          
          if (teamsError) {
            console.error('🎯 DEBUG: Teams query error:', teamsError);
            throw teamsError;
          }

          console.log('🎯 DEBUG: Step 4 Complete - Team details fetched:', {
            teamsCount: teamDetails?.length || 0,
            teams: teamDetails?.map(t => ({ id: t.id, name: t.name }))
          });

          // Create team lookup map
          teamDetails?.forEach(team => {
            teamLookup.set(team.id, team);
          });
        } else {
          console.warn('🎯 DEBUG: No team IDs found in matches');
        }

        // Step 5: Fetch participants (optional, for seeding info only)
        console.log('🎯 DEBUG: Step 5 - Fetching participants for bracket:', bracketId);
        const { data: participants, error: participantsError } = await supabase
          .from('participants')
          .select('position, team_id')
          .eq('bracket_id', bracketId)
          .order('position', { ascending: true });

        if (participantsError) {
          console.error('🎯 DEBUG: Participants query error:', participantsError);
          // Don't throw - participants is optional
        }

        // Transform participants using the teamLookup we already built from matches
        const transformedParticipants = participants?.map(p => {
          const team = teamLookup.get(p.team_id);
          return {
            position: p.position,
            team_id: p.team_id,
            name: team?.name || '',
            image_url: team?.image_url
          };
        }) || [];

        console.log('🎯 DEBUG: Step 5 Complete - Participants processed:', {
          participantsCount: transformedParticipants.length,
          teamsInLookup: teamLookup.size
        });

        // Step 5: Transform matches with team data and relationship fields
        const transformedMatches = (rawMatches || []).map((match) => {
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
            team1Logo: team1?.image_url,
            team2Logo: team2?.image_url,
            winnerId: match.winner_id,
            team1Score: match.team1_score,
            team2Score: match.team2_score,
            matchType: match.match_type || 'winners',
            status: match.status || 'pending',
            nextWinMatchId: match.next_win_match_id,
            nextLoseMatchId: match.next_lose_match_id,
            team1Seed: match.team1_seed,
            team2Seed: match.team2_seed
          };

          return transformed;
        });

        console.log('🎯 DEBUG: Step 5 Complete - Transformed matches:', {
          originalMatchesCount: rawMatches?.length || 0,
          transformedMatchesCount: transformedMatches.length,
          matchesWithNextWin: transformedMatches.filter(m => m.nextWinMatchId).length,
          matchesWithNextLose: transformedMatches.filter(m => m.nextLoseMatchId).length,
          matchTypeBreakdown: {
            winners: transformedMatches.filter(m => m.matchType === 'winners').length,
            losers: transformedMatches.filter(m => m.matchType === 'losers').length,
            finals: transformedMatches.filter(m => m.matchType === 'finals').length
          }
        });

        // Step 6: Build final result with backward compatibility
        const result: SimpleBracketData = {
          id: bracket.id,
          name: bracket.title, // Map title to name for backward compatibility
          title: bracket.title,
          format: bracket.format || 'Double Elimination',
          state: bracket.state || 'pending',
          division: bracket.division_id,
          challonge_tournament_id: bracket.challonge_tournament_id,
          uses_brackets_manager: bracket.uses_brackets_manager,
          matches: transformedMatches,
          teams: Array.from(teamLookup.values()),
          participants: transformedParticipants
        };

        console.log('🎯 DEBUG: Step 6 Complete - Final result built:', {
          bracketId: result.id,
          bracketName: result.name,
          bracketFormat: result.format,
          bracketState: result.state,
          matchesInResult: result.matches?.length || 0,
          matchesIsArray: Array.isArray(result.matches),
          teamsCount: result.teams.length,
          hasValidData: !!(result.id && result.name && Array.isArray(result.matches))
        });

        return result;

      } catch (error) {
        console.error('🚨 DEBUG: CRITICAL ERROR in useBracketData:', {
          bracketId,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    },
    enabled: !!bracketId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      console.log(`🔄 DEBUG: Query retry attempt ${failureCount} for bracket ${bracketId}:`, {
        error: error?.message,
        willRetry: failureCount < 2
      });
      return failureCount < 2; // Retry up to 2 times
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });
};

