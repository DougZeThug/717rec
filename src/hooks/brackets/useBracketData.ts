

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bracketLog, errorLog, debugLog } from "@/utils/logger";

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
  stageId?: number;  // Stage ID for realtime subscriptions
}

export const useBracketData = (bracketId: string | null) => {
  bracketLog('useBracketData hook called', { bracketId });
  
  return useQuery({
    queryKey: ['bracket-data', bracketId],
    queryFn: async (): Promise<SimpleBracketData | null> => {
      bracketLog('Starting fetch for bracket:', bracketId);
      
      if (!bracketId) {
        debugLog('No bracketId provided, returning null');
        return null;
      }

      try {
        // Step 1: Get bracket info with state field
        bracketLog('Step 1 - Fetching bracket info for ID:', bracketId);
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
          errorLog('Bracket query error:', bracketError);
          throw bracketError;
        }

        if (!bracket) {
          bracketLog('No bracket found with ID:', bracketId);
          return null;
        }

        bracketLog('Step 1 Complete - Bracket found:', {
          id: bracket.id,
          title: bracket.title,
          uses_brackets_manager: bracket.uses_brackets_manager
        });

        // Step 2: Check if this is a brackets-manager bracket
        if (bracket.uses_brackets_manager) {
          bracketLog('Step 2 - Fetching from SQL tables (brackets-manager)');
          
          // Step 3: Fetch stage, matches, participants from SQL tables
          bracketLog('Step 3 - Fetching stage data');
          const { data: stages, error: stageError } = await supabase
            .from('stage')
            .select('*')
            .eq('tournament_id', bracketId);

          if (stageError) {
            errorLog('Stage query error:', stageError);
            throw stageError;
          }

          if (!stages || stages.length === 0) {
            bracketLog('No stage found for bracket:', bracketId);
            return null;
          }

          const stage = stages[0];
          bracketLog('Stage found:', { stageId: stage.id, type: stage.type });

          // Step 3.5: Fetch groups to map group_id to group.number for match types
          bracketLog('Step 3.5 - Fetching groups');
          const { data: groups, error: groupError } = await supabase
            .from('group')
            .select('*')
            .eq('stage_id', stage.id);

          if (groupError) {
            errorLog('Group query error:', groupError);
            throw groupError;
          }

          // Build group_id to group.number mapping
          const groupIdToNumberMap = new Map<number, number>();
          groups?.forEach(group => {
            groupIdToNumberMap.set(group.id, group.number);
          });
          bracketLog('Groups mapped:', groupIdToNumberMap.size);

          // Step 4: Fetch matches from SQL and transform opponent fields back to objects
          bracketLog('Step 4 - Fetching matches');
          const { data: matches, error: matchError } = await supabase
            .from('match')
            .select('*')
            .eq('stage_id', stage.id);

          if (matchError) {
            errorLog('Match query error:', matchError);
            throw matchError;
          }

          bracketLog('Raw matches fetched:', matches?.length || 0);

          // Step 5: Fetch participants
          bracketLog('Step 5 - Fetching participants');
          const { data: participants, error: participantsError } = await supabase
            .from('participant')
            .select('*')
            .eq('tournament_id', bracketId);

          if (participantsError) {
            errorLog('Participants query error:', participantsError);
            throw participantsError;
          }

          bracketLog('Participants fetched:', participants?.length || 0);

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
            errorLog('Teams query error:', teamsError);
            throw teamsError;
          }

          const teamLookup = new Map();
          teamDetails?.forEach(team => {
            teamLookup.set(team.name, team);
          });

          bracketLog('Teams fetched:', teamDetails?.length || 0);

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

          bracketLog('Matches transformed:', transformedMatches.length);

          // Step 9: Transform participants
          const transformedParticipants = participants?.map(p => {
            const team = teamLookup.get(p.name);
            return {
              position: p.position,
              team_id: team?.id || '',
              name: p.name,
              image_url: team?.image_url
            };
          }) || [];

          if (!bracket.divisions) {
            debugLog('Bracket has no division data:', bracketId);
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
            participants: transformedParticipants,
            stageId: stage.id  // Include stageId for realtime subscriptions
          };

          bracketLog('Final result built from SQL tables:', {
            bracketId: result.id,
            matchesCount: result.matches.length,
            teamsCount: result.teams.length,
            stageId: stage.id
          });

          return result;
        }

        // Fallback: Non-brackets-manager bracket
        debugLog('Not a brackets-manager bracket');
        return null;


      } catch (error) {
        errorLog('CRITICAL ERROR in useBracketData:', {
          bracketId,
          error: error.message
        });
        throw error;
      }
    },
    enabled: true, // Always enabled - null check handled in queryFn
    staleTime: 1000 * 30, // 30 seconds - reduced for faster updates
    retry: (failureCount, error) => {
      debugLog(`Query retry attempt ${failureCount} for bracket ${bracketId}:`, {
        error: error?.message,
        willRetry: failureCount < 2
      });
      return failureCount < 2; // Retry up to 2 times
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });
};
