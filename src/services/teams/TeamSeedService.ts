import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { DatabaseError } from '@/types/errors';

/**
 * Service layer for team seed operations
 * Abstracts Supabase mutations from presentation components
 */

/**
 * Update a single team's seed value
 * @throws {DatabaseError} When database operations fail
 */
export const updateTeamSeed = async (
  teamId: string,
  seed: number | null
): Promise<any> => {
  const { data, error } = await supabase
    .from('teams')
    .update({ seed })
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to update team seed');
  }

  return data;
};

/**
 * Update multiple team seeds in bulk
 * @throws {DatabaseError} When database operations fail
 */
export const bulkUpdateTeamSeeds = async (
  updates: Array<{ teamId: string; seed: number | null }>
): Promise<any[]> => {
  const results = await Promise.allSettled(
    updates.map(({ teamId, seed }) =>
      supabase.from('teams').update({ seed }).eq('id', teamId).select().single()
    )
  );

  // Check for both rejected promises AND Supabase errors in fulfilled promises
  const errors: any[] = [];
  const successData: any[] = [];

  results.forEach((result) => {
    if (result.status === 'rejected') {
      errors.push(result.reason);
    } else if (result.value.error) {
      errors.push(result.value.error);
    } else {
      successData.push(result.value.data);
    }
  });

  if (errors.length > 0) {
    throw new DatabaseError(`Failed to update ${errors.length} team seeds`, errors);
  }

  return successData;
};

/**
 * Reset all seeds in a division to automatic using RPC
 * @throws {DatabaseError} When database operations fail
 */
export const resetDivisionSeeds = async (divisionId: string): Promise<void> => {
  const { error } = await supabase.rpc('reset_division_seeds', {
    p_division_id: divisionId,
  });

  if (error) {
    handleDatabaseError(error, 'Failed to reset division seeds');
  }
};
