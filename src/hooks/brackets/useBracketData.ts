

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
        .select('id, title, format, state, division_id, challonge_tournament_id, uses_brackets_manager, bracket_data')
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
          uses_brackets_manager: bracket.uses_brackets_manager,
          has_bracket_data: !!bracket.bracket_data
        });

        // Step 2: Check if this is a brackets-manager bracket with JSONB data
        if (bracket.uses_brackets_manager && bracket.bracket_data) {
          console.log('🎯 DEBUG: Step 2 - Using brackets-manager JSONB data');
          const jsonbData = bracket.bracket_data as any;
          
          // Step 3: Get participants to map participant IDs to team IDs
          console.log('🎯 DEBUG: Step 3 - Fetching participants for ID mapping');
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('id, team_id, position')
            .eq('bracket_id', bracketId);

          if (participantsError) {
            console.error('🎯 DEBUG: Participants query error:', participantsError);
            throw participantsError;
          }

          // Create mapping from brackets-manager participant ID to team ID
          const participantToTeamMap = new Map<number, string>();
          participants?.forEach(p => {
            participantToTeamMap.set(p.position, p.team_id);
          });

          console.log('🎯 DEBUG: Participant to team mapping:', {
            participantCount: participants?.length || 0,
            mappingSize: participantToTeamMap.size
          });

          // Step 4: Extract team IDs from participants
          const teamIds = Array.from(new Set(participants?.map(p => p.team_id).filter(Boolean) || []));

          console.log('🎯 DEBUG: Step 4 - Team IDs from participants:', {
            uniqueTeamIds: teamIds.length,
            sampleIds: teamIds.slice(0, 3)
          });

          // Step 5: Fetch team details
          let teamLookup = new Map();
          if (teamIds.length > 0) {
            console.log('🎯 DEBUG: Step 5 - Fetching team details');
            const { data: teamDetails, error: teamsError } = await supabase
              .from('teams')
              .select('id, name, image_url')
              .in('id', teamIds);
            
            if (teamsError) {
              console.error('🎯 DEBUG: Teams query error:', teamsError);
              throw teamsError;
            }

            teamDetails?.forEach(team => {
              teamLookup.set(team.id, team);
            });

            console.log('🎯 DEBUG: Step 5 Complete - Team details fetched:', {
              teamsCount: teamDetails?.length || 0
            });
          }

          // Step 6: Transform JSONB matches to SimpleBracketData format
          console.log('🎯 DEBUG: Step 6 - Transforming JSONB matches');
          const matches = jsonbData.match || [];
          const transformedMatches = matches.map((match: any) => {
            const team1Id = match.opponent1?.id !== null ? participantToTeamMap.get(match.opponent1?.id) : null;
            const team2Id = match.opponent2?.id !== null ? participantToTeamMap.get(match.opponent2?.id) : null;
            const team1 = team1Id ? teamLookup.get(team1Id) : null;
            const team2 = team2Id ? teamLookup.get(team2Id) : null;
            
            // Determine winner based on opponent results
            let winnerId = null;
            if (match.opponent1?.result === 'win') winnerId = team1Id;
            else if (match.opponent2?.result === 'win') winnerId = team2Id;

            // Map brackets-manager status to our status
            // 0=locked, 1=waiting, 2=ready, 3=running, 4=completed
            let status = 'pending';
            if (match.status === 4) status = 'completed';
            else if (match.status === 3) status = 'running';
            else if (match.status === 2) status = 'ready';

            return {
              id: `match-${match.id}`,
              round: match.round_id + 1,
              position: match.number,
              team1Id: team1Id || null,
              team2Id: team2Id || null,
              team1Name: team1?.name,
              team2Name: team2?.name,
              team1Logo: team1?.image_url,
              team2Logo: team2?.image_url,
              winnerId,
              team1Score: match.opponent1?.score ?? null,
              team2Score: match.opponent2?.score ?? null,
              matchType: 'winners', // brackets-manager handles this differently
              status,
              nextWinMatchId: null, // Not directly available in brackets-manager format
              nextLoseMatchId: null,
              team1Seed: match.opponent1?.position ?? null,
              team2Seed: match.opponent2?.position ?? null
            };
          });

          console.log('🎯 DEBUG: Step 6 Complete - Transformed JSONB matches:', {
            originalMatchCount: matches.length,
            transformedMatchCount: transformedMatches.length
          });

          // Step 7: Transform participants
          const transformedParticipants = participants?.map(p => {
            const team = teamLookup.get(p.team_id);
            return {
              position: p.position,
              team_id: p.team_id,
              name: team?.name || '',
              image_url: team?.image_url
            };
          }) || [];

          const result: SimpleBracketData = {
            id: bracket.id,
            name: bracket.title,
            title: bracket.title,
            format: bracket.format || 'Single Elimination',
            state: bracket.state || 'pending',
            division: bracket.division_id,
            uses_brackets_manager: true,
            matches: transformedMatches,
            teams: Array.from(teamLookup.values()),
            participants: transformedParticipants
          };

          console.log('🎯 DEBUG: Step 7 Complete - Final result built:', {
            bracketId: result.id,
            matchesCount: result.matches.length,
            teamsCount: result.teams.length,
            participantsCount: result.participants?.length || 0
          });

          return result;
        }

        // Fallback: Legacy playoff_matches table (should not be used)
        console.warn('🎯 DEBUG: No bracket_data found, bracket may be incomplete');
        return null;


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

