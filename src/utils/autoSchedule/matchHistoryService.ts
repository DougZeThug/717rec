
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if two teams have played against each other before
 * 
 * @param team1Id ID of the first team
 * @param team2Id ID of the second team
 * @returns Promise that resolves to true if teams have played before, false otherwise
 */
export async function haveTeamsPlayedBefore(team1Id: string, team2Id: string): Promise<boolean> {
  try {
    console.log(`Checking match history between teams: ${team1Id} and ${team2Id}`);
    
    // Fixed SQL query: Check if these two teams have played each other
    // Either team1_id=A AND team2_id=B OR team1_id=B AND team2_id=A
    const { count, error } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .or(`and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`)
      .eq('iscompleted', true);
    
    if (error) {
      console.error('Error checking match history:', error);
      return false;
    }
    
    const hasPlayed = count !== null && count > 0;
    console.log(`Teams ${team1Id} vs ${team2Id}: ${hasPlayed ? 'HAVE' : 'HAVE NOT'} played before (${count} matches)`);
    
    return hasPlayed;
  } catch (error) {
    console.error('Unexpected error checking if teams played before:', error);
    return false;
  }
}
