import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types';
import { errorLog, teamLog } from '@/utils/logger';

/**
 * Update an existing team
 */
export const updateTeamApi = async (teamId: string, teamData: Omit<Team, 'id' | 'created_at'>) => {
  teamLog('Updating team:', teamId);

  // Validate the team exists before attempting an update
  const { data: teamExists, error: checkError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .single();

  if (checkError || !teamExists) {
    errorLog('Team not found:', teamId);
    throw new Error(`Team with ID ${teamId} not found.`);
  }

  let divisionName = null;

  // If division_id is provided, validate it exists in the divisions table
  // (Skip validation if division_id is null - meaning no division assigned)
  if (teamData.division_id != null) {
    const { data: divisionExists, error: divCheckError } = await supabase
      .from('divisions')
      .select('id, name')
      .eq('id', teamData.division_id)
      .single();

    if (divCheckError || !divisionExists) {
      errorLog('Division not found:', teamData.division_id);
      throw new Error(`Division with ID ${teamData.division_id} not found.`);
    }

    divisionName = divisionExists.name;
  }

  // Update the team
  const { data, error } = await supabase
    .from('teams')
    .update({
      name: teamData.name,
      logo_url: teamData.logoUrl,
      image_url: teamData.imageUrl || null,
      players: teamData.players, // Players is now a string[]
      division_id: teamData.division_id, // This will be null when no division is selected
    })
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    errorLog('Error updating team:', error);
    throw error;
  }

  teamLog('Team updated successfully:', data.id);

  // Update team_season_stats division_name for this team (current season only)
  // First, get the active season to avoid overwriting historical records
  const { data: activeSeason, error: seasonError } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (seasonError) {
    errorLog('Error fetching active season:', seasonError);
  } else if (activeSeason) {
    // Update only the current season's record to preserve historical data
    const { error: seasonStatsError } = await supabase
      .from('team_season_stats')
      .update({
        division_name: divisionName,
      })
      .eq('team_id', teamId)
      .eq('season_id', activeSeason.id);

    if (seasonStatsError) {
      errorLog('Error updating team_season_stats division_name:', seasonStatsError);
    }
  }

  // The database response doesn't include wins/losses fields, so we need to use
  // the values passed in teamData or default to 0
  return {
    id: data.id,
    name: data.name,
    logoUrl: data.image_url || data.logo_url,
    imageUrl: data.image_url || data.logo_url,
    players: data.players || [],
    // Use the values from teamData since they're not in the database schema
    wins: teamData.wins || 0,
    losses: teamData.losses || 0,
    game_wins: teamData.game_wins || 0,
    game_losses: teamData.game_losses || 0,
    created_at: data.created_at,
    division_id: data.division_id,
  };
};
