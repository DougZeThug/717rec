
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
    // Query the matches table to find if these teams have played against each other
    const { count, error } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .or(`team1_id.eq.${team1Id},team2_id.eq.${team1Id}`)
      .or(`team1_id.eq.${team2Id},team2_id.eq.${team2Id}`)
      .eq('iscompleted', true);
    
    if (error) {
      console.error('Error checking match history:', error);
      return false;
    }
    
    return count !== null && count > 0;
  } catch (error) {
    console.error('Error checking if teams played before:', error);
    return false;
  }
}
