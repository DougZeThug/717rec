import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types';
import { NotFoundError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { teamLog } from '@/utils/logger';

/**
 * Update a team's win/loss record (used by match completion flow).
 * @throws {Error} When no rows are updated or database operation fails
 */
export const updateTeamWinLossRecord = async (
  teamId: string,
  updates: { wins: number; losses: number; game_wins: number; game_losses: number }
) => {
  const { error, data } = await supabase
    .from('teams')
    .update({
      wins: updates.wins,
      losses: updates.losses,
      game_wins: updates.game_wins,
      game_losses: updates.game_losses,
    })
    .eq('id', teamId)
    .select();

  if (error) handleDatabaseError(error, 'Failed to update team win/loss record');
  if (!data?.length) {
    throw new Error(`No rows updated for team ${teamId} — check RLS policies or if record exists`);
  }

  return true;
};

/**
 * Update only a team's name and image_url (used by team members with edit access).
 * @throws {Error} When database operation fails
 */
export const updateTeamNameAndImage = async (
  teamId: string,
  name: string,
  imageUrl: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('teams')
    .update({
      name: name,
      image_url: imageUrl,
    })
    .eq('id', teamId);

  if (error) throw error;
};

/**
 * Update an existing team
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When team or division is not found
 */
export const updateTeamApi = async (teamId: string, teamData: Omit<Team, 'id' | 'created_at'>) => {
  teamLog('Updating team:', teamId);

  // Validate the team exists before attempting an update
  const { data: teamExists, error: checkError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .single();

  if (checkError) {
    handleDatabaseError(checkError, 'Failed to check if team exists');
  }

  if (!teamExists) {
    throw new NotFoundError('Team', teamId);
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

    if (divCheckError) {
      handleDatabaseError(divCheckError, 'Failed to check if division exists');
    }

    if (!divisionExists) {
      throw new NotFoundError('Division', teamData.division_id);
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
    handleDatabaseError(error, 'Failed to update team');
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
    handleDatabaseError(seasonError, 'Failed to fetch active season');
  }

  if (activeSeason) {
    // Update only the current season's record to preserve historical data
    const { error: seasonStatsError } = await supabase
      .from('team_season_stats')
      .update({
        division_name: divisionName,
      })
      .eq('team_id', teamId)
      .eq('season_id', activeSeason.id);

    if (seasonStatsError) {
      handleDatabaseError(seasonStatsError, 'Failed to update team season stats division name');
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
