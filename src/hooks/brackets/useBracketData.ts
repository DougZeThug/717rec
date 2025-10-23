

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/utils/logger";

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
  log('🎣 useBracketData hook called', { bracketId });
  
  return useQuery({
    queryKey: ['bracket-data', bracketId],
    queryFn: async (): Promise<SimpleBracketData | null> => {
      log('🎯 useBracketData: Starting fetch for bracket:', bracketId);
      log('🔍 Query state change: FETCHING');
      
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
        .select(`
          id, 
          title, 
          format, 
          state, 
          division_id,
          divisions!inner(display_division, name),
          challonge_tournament_id, 
          uses_brackets_manager, 
          bracket_data
        `)
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

        // Step 2: Check if this is a brackets-manager bracket
        if (bracket.uses_brackets_manager) {
          console.log('🎯 DEBUG: Step 2 - Fetching from SQL tables (brackets-manager)');
          
          // Step 3: Fetch stage, matches, participants from SQL tables
          console.log('🎯 DEBUG: Step 3 - Fetching stage data');
          const { data: stages, error: stageError } = await supabase
            .from('stage')
            .select('*')
            .eq('tournament_id', bracketId);

          if (stageError) {
            console.error('🎯 DEBUG: Stage query error:', stageError);
            throw stageError;
          }

          if (!stages || stages.length === 0) {
            console.log('🎯 DEBUG: No stage found for bracket:', bracketId);
            return null;
          }

          const stage = stages[0];
          console.log('🎯 DEBUG: Stage found:', { stageId: stage.id, type: stage.type });

          // Step 3.5: Fetch groups to map group_id to group.number for match types
          console.log('🎯 DEBUG: Step 3.5 - Fetching groups');
          const { data: groups, error: groupError } = await supabase
            .from('group')
            .select('*')
            .eq('stage_id', stage.id);

          if (groupError) {
            console.error('🎯 DEBUG: Group query error:', groupError);
            throw groupError;
          }

          // Build group_id to group.number mapping
          const groupIdToNumberMap = new Map<number, number>();
          groups?.forEach(group => {
            groupIdToNumberMap.set(group.id, group.number);
          });
          console.log('🎯 DEBUG: Groups mapped:', groupIdToNumberMap.size);

          // Step 4: Fetch matches from SQL and transform opponent fields back to objects
          console.log('🎯 DEBUG: Step 4 - Fetching matches');
          const { data: matches, error: matchError } = await supabase
            .from('match')
            .select('*')
            .eq('stage_id', stage.id);

          if (matchError) {
            console.error('🎯 DEBUG: Match query error:', matchError);
            throw matchError;
          }

          console.log('🎯 DEBUG: Raw matches fetched:', matches?.length || 0);

          // Step 5: Fetch participants
          console.log('🎯 DEBUG: Step 5 - Fetching participants');
          const { data: participants, error: participantsError } = await supabase
            .from('participant')
            .select('*')
            .eq('tournament_id', bracketId);

          if (participantsError) {
            console.error('🎯 DEBUG: Participants query error:', participantsError);
            throw participantsError;
          }

          console.log('🎯 DEBUG: Participants fetched:', participants?.length || 0);

          // Step 6: Build participant to team mapping
          const participantToTeamMap = new Map<number, string>();
          participants?.forEach(p => {
            participantToTeamMap.set(p.id, p.name); // Map participant ID to team name
          });

          // Step 7: Extract team IDs from participant names (match with teams table)
          const teamNames = participants?.map(p => p.name) || [];
          const { data: teamDetails, error: teamsError } = await supabase
            .from('teams')
            .select('id, name, image_url')
            .in('name', teamNames);

          if (teamsError) {
            console.error('🎯 DEBUG: Teams query error:', teamsError);
            throw teamsError;
          }

          const teamLookup = new Map();
          teamDetails?.forEach(team => {
            teamLookup.set(team.name, team);
          });

          console.log('🎯 DEBUG: Teams fetched:', teamDetails?.length || 0);

          // Helper function to map group.number to matchType
          const getMatchType = (groupNumber: number): string => {
            switch(groupNumber) {
              case 1: return 'winners';
              case 2: return 'losers';
              case 3: return 'finals';
              default: return 'winners';
            }
          };

          // Step 8: Transform matches - convert opponent1_id back to opponent1 object
          const transformedMatches = (matches || []).map((match: any) => {
            const team1Name = match.opponent1_id ? participantToTeamMap.get(match.opponent1_id) : null;
            const team2Name = match.opponent2_id ? participantToTeamMap.get(match.opponent2_id) : null;
            const team1 = team1Name ? teamLookup.get(team1Name) : null;
            const team2 = team2Name ? teamLookup.get(team2Name) : null;

            // Determine winner based on results
            let winnerId = null;
            if (match.opponent1_result === 'win' && team1) winnerId = team1.id;
            else if (match.opponent2_result === 'win' && team2) winnerId = team2.id;

            // Map status
            let status = 'pending';
            if (match.status === 4) status = 'completed';
            else if (match.status === 3) status = 'running';
            else if (match.status === 2) status = 'ready';

            // Determine match type from group_id
            const groupNumber = groupIdToNumberMap.get(match.group_id) || 1;
            const matchType = getMatchType(groupNumber);

            return {
              id: `match-${match.id}`,
              round: match.round_id + 1,
              position: match.number,
              team1Id: team1?.id || null,
              team2Id: team2?.id || null,
              team1Name: team1?.name,
              team2Name: team2?.name,
              team1Logo: team1?.image_url,
              team2Logo: team2?.image_url,
              winnerId,
              team1Score: match.opponent1_score ?? null,
              team2Score: match.opponent2_score ?? null,
              matchType,
              status,
              nextWinMatchId: null,
              nextLoseMatchId: null,
              team1Seed: null,
              team2Seed: null
            };
          });

          console.log('🎯 DEBUG: Matches transformed:', transformedMatches.length);

          // Step 9: Transform participants
          const transformedParticipants = participants?.map(p => {
            const team = teamLookup.get(p.name);
            return {
              position: p.id,
              team_id: team?.id || '',
              name: p.name,
              image_url: team?.image_url
            };
          }) || [];

          if (!bracket.divisions) {
            console.warn('🎯 DEBUG: Bracket has no division data:', bracketId);
          }

          const result: SimpleBracketData = {
            id: bracket.id,
            name: bracket.title,
            title: bracket.title,
            format: bracket.format || 'Single Elimination',
            state: bracket.state || 'pending',
            division: bracket.divisions?.display_division || bracket.divisions?.name || 'Unknown',
            uses_brackets_manager: true,
            matches: transformedMatches,
            teams: Array.from(teamLookup.values()),
            participants: transformedParticipants
          };

          console.log('🎯 DEBUG: Final result built from SQL tables:', {
            bracketId: result.id,
            matchesCount: result.matches.length,
            teamsCount: result.teams.length,
            participantsCount: result.participants?.length || 0
          });

          return result;
        }

        // Fallback: Non-brackets-manager bracket
        console.warn('🎯 DEBUG: Not a brackets-manager bracket');
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
    enabled: true, // Always enabled - null check handled in queryFn
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

