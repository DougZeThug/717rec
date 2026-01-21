import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';
import { NotFoundError, BusinessLogicError } from '@/types/errors';

/**
 * Service for managing teams in the hidden division
 * This provides an alternative to the opt-out system by moving teams to a special "Hidden" division
 */

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
export const hideTeam = async (teamId: string): Promise<string | null> => {
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
    throw new NotFoundError('Team', teamId);
  }

  // Get hidden division ID
  const hiddenDivisionId = await getHiddenDivisionId();
  if (!hiddenDivisionId) {
    throw new NotFoundError('Hidden division');
  }

  // Check if team is already hidden
  if (team.division_id === hiddenDivisionId) {
    throw new BusinessLogicError('Team is already hidden');
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

  return team.division_id;
};

/**
 * Unhide a team by moving it back to a specified division
 * @param teamId - The ID of the team to unhide
 * @param targetDivisionId - The division to move the team to
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When team or target division is not found
 */
export const unhideTeam = async (teamId: string, targetDivisionId: string): Promise<void> => {
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
    throw new NotFoundError('Team', teamId);
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
    throw new NotFoundError('Division', targetDivisionId);
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
