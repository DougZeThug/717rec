import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

/**
 * Query the database to check if two teams have played each other before.
 */
export async function fetchTeamsPlayedHistory(
  team1Id: string,
  team2Id: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .or(
        `and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`
      )
      .limit(1);

    if (error) {
      errorLog('Error checking if teams have played:', error);
      throw error;
    }

    return data && data.length > 0;
  } catch (error) {
    errorLog('Error in fetchTeamsPlayedHistory:', error);
    return false;
  }
}
