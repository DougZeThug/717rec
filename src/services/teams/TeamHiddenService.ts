import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError, NotFoundError } from '@/types/errors';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';

/**
 * Service for managing teams in the hidden division
 * This provides an alternative to the opt-out system by moving teams to a special "Hidden" division
 */

export interface HideTeamResult {
  success: boolean;
  message: string;
  originalDivisionId?: string;
}

export interface UnhideTeamResult {
  success: boolean;
  message: string;
}

/**
 * Get the hidden division ID
 * Returns null if no hidden division exists (not an error condition)
 * @throws {DatabaseError} When database operations fail
 */
export const getHiddenDivisionId = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('divisions')
    .select('id')
    .eq('name', 'Hidden')
    .single();

  if (error) {
    // PGRST116 means no rows found, which is not an error for this case
    if (error.code === 'PGRST116') {
      return null;
    }
    handleDatabaseError(error, 'Failed to fetch hidden division');
  }

  return data?.id || null;
};

/**
 * Hide a team by moving it to the hidden division
 * @param teamId - The ID of the team to hide
 * @returns The original division ID before hiding
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When team or hidden division is not found
 * @throws {BusinessLogicError} When team is already hidden
 */
export const hideTeam = async (teamId: string): Promise<HideTeamResult> => {
  try {
    // Get the team's current division
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('division_id, name')
      .eq('id', teamId)
      .single();

    if (teamError) {
      handleDatabaseError(teamError, 'Failed to fetch team');
    }

    if (!team) {
      return { success: false, message: 'Team not found' };
    }

    // Get hidden division ID
    const hiddenDivisionId = await getHiddenDivisionId();
    if (!hiddenDivisionId) {
      return { success: false, message: 'Hidden division not found' };
    }

    // Check if team is already hidden
    if (team.division_id === hiddenDivisionId) {
      return { success: false, message: 'Team is already hidden' };
    }

    // Move team to hidden division
    const { error: updateError } = await supabase
      .from('teams')
      .update({
        division_id: hiddenDivisionId,
      })
      .eq('id', teamId);

    if (updateError) {
      handleDatabaseError(updateError, 'Failed to hide team');
    }

    return {
      success: true,
      message: `Team "${team.name}" has been hidden`,
      originalDivisionId: team.division_id,
    };
  } catch (error) {
    if (error instanceof BusinessLogicError || error instanceof NotFoundError) {
      return { success: false, message: error.message };
    }
    throw error;
  }
};

/**
 * Unhide a team by moving it back to a specified division
 * @param teamId - The ID of the team to unhide
 * @param targetDivisionId - The division to move the team to
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When team or target division is not found
 */
export const unhideTeam = async (
  teamId: string,
  targetDivisionId: string
): Promise<UnhideTeamResult> => {
  try {
    // Get the team's current info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('division_id, name')
      .eq('id', teamId)
      .single();

    if (teamError) {
      handleDatabaseError(teamError, 'Failed to fetch team');
    }

    if (!team) {
      return { success: false, message: 'Team not found' };
    }

    // Verify the target division exists
    const { data: division, error: divisionError } = await supabase
      .from('divisions')
      .select('id, name')
      .eq('id', targetDivisionId)
      .single();

    if (divisionError) {
      handleDatabaseError(divisionError, 'Failed to fetch target division');
    }

    if (!division) {
      return { success: false, message: 'Target division not found' };
    }

    // Move team to target division
    const { error: updateError } = await supabase
      .from('teams')
      .update({
        division_id: targetDivisionId,
      })
      .eq('id', teamId);

    if (updateError) {
      handleDatabaseError(updateError, 'Failed to unhide team');
    }

    return {
      success: true,
      message: `Team "${team.name}" has been restored to ${division.name}`,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { success: false, message: error.message };
    }
    throw error;
  }
};

/**
 * Get all teams currently in the hidden division
 * Returns empty array if no hidden division exists (not an error condition)
 * @throws {DatabaseError} When database operations fail
 */
export const getHiddenTeams = async () => {
  const hiddenDivisionId = await getHiddenDivisionId();
  if (!hiddenDivisionId) {
    return [];
  }

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('division_id', hiddenDivisionId)
    .order('name');

  if (error) {
    handleDatabaseError(error, 'Failed to fetch hidden teams');
  }

  return data || [];
};

/**
 * Check if a team is currently hidden
 * Returns false if no hidden division exists or team not found (not error conditions)
 * @throws {DatabaseError} When database operations fail
 */
export const isTeamHidden = async (teamId: string): Promise<boolean> => {
  const hiddenDivisionId = await getHiddenDivisionId();
  if (!hiddenDivisionId) return false;

  const { data, error } = await supabase
    .from('teams')
    .select('division_id')
    .eq('id', teamId)
    .single();

  if (error) {
    // PGRST116 means no rows found, which means team doesn't exist - return false
    if (error.code === 'PGRST116') {
      return false;
    }
    handleDatabaseError(error, 'Failed to check if team is hidden');
  }

  if (!data) return false;

  return data.division_id === hiddenDivisionId;
};
