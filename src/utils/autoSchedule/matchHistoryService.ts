import { supabase } from "@/integrations/supabase/client";
import { scheduleLog, dbLog, errorLog } from "@/utils/logger";

/**
 * Check if two teams have played against each other before
 * 
 * @param team1Id ID of the first team
 * @param team2Id ID of the second team
 * @returns Promise that resolves to true if teams have played before, false otherwise
 */
export async function haveTeamsPlayedBefore(team1Id: string, team2Id: string): Promise<boolean> {
  try {
    dbLog(`Checking match history between teams: ${team1Id} and ${team2Id}`);
    
    // Fixed SQL query: Check if these two teams have played each other
    // Either team1_id=A AND team2_id=B OR team1_id=B AND team2_id=A
    const { count, error } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .or(`and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`)
      .eq('iscompleted', true);
    
    if (error) {
      errorLog('Error checking match history:', error);
      return false;
    }
    
    const hasPlayed = count !== null && count > 0;
    dbLog(`Teams ${team1Id} vs ${team2Id}: ${hasPlayed ? 'HAVE' : 'HAVE NOT'} played before (${count} matches)`);
    
    return hasPlayed;
  } catch (error) {
    errorLog('Unexpected error checking if teams played before:', error);
    return false;
  }
}

/**
 * Fetch all season history pairs for a list of teams
 * Returns array of team ID pairs that have played each other this season
 */
export async function fetchSeasonHistoryForTeams(teamIds: string[]): Promise<Array<[string, string]>> {
  try {
    if (teamIds.length === 0) return [];
    
    scheduleLog(`Fetching season history for ${teamIds.length} teams`);
    
    // Get active season
    const { data: seasonData, error: seasonError } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (seasonError || !seasonData) {
      errorLog('Error fetching active season:', seasonError);
      return [];
    }
    
    // Fetch all completed matches where both teams are in our list
    const { data: matches, error } = await supabase
      .from('matches')
      .select('team1_id, team2_id')
      .eq('iscompleted', true)
      .eq('season_id', seasonData.id)
      .in('team1_id', teamIds)
      .in('team2_id', teamIds);
    
    if (error) {
      errorLog('Error fetching season history:', error);
      return [];
    }
    
    const pairs: Array<[string, string]> = [];
    
    if (matches) {
      for (const match of matches) {
        if (match.team1_id && match.team2_id) {
          pairs.push([match.team1_id, match.team2_id]);
        }
      }
    }
    
    scheduleLog(`Found ${pairs.length} historical match pairs for current season`);
    return pairs;
  } catch (error) {
    errorLog('Unexpected error fetching season history:', error);
    return [];
  }
}
