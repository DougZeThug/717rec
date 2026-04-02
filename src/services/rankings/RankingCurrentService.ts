import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * Fetch power scores and names for all teams from v_team_details.
 * @throws {DatabaseError} When database operations fail
 */
export async function fetchTeamPowerScores(): Promise<{
  powerScores: Record<string, number>;
  teamNames: Record<string, string>;
}> {
  const { data, error } = await supabase
    .from('v_team_details')
    .select('team_id, name, power_score');

  if (error) handleDatabaseError(error, 'Failed to fetch team power scores');

  // Create mappings for power scores and team names
  const scoreMap: Record<string, number> = {};
  const nameMap: Record<string, string> = {};

  data?.forEach((team) => {
    scoreMap[team.team_id] = team.power_score;
    nameMap[team.team_id] = team.name;
  });

  return { powerScores: scoreMap, teamNames: nameMap };
}
