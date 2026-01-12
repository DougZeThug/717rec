import { supabase } from '@/integrations/supabase/client';
import { dbLog } from '@/utils/logger';

/**
 * Service layer for team seed operations
 * Abstracts Supabase mutations from presentation components
 */

/**
 * Update a single team's seed value
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
    dbLog('Error updating team seed:', error);
    throw error;
  }

  return data;
};

/**
 * Update multiple team seeds in bulk
 */
export const bulkUpdateTeamSeeds = async (
  updates: Array<{ teamId: string; seed: number | null }>
): Promise<any[]> => {
  const results = await Promise.allSettled(
    updates.map(({ teamId, seed }) =>
      supabase.from('teams').update({ seed }).eq('id', teamId).select().single()
    )
  );

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => result.reason);

  if (errors.length > 0) {
    dbLog('Error in bulk update team seeds:', errors);
    throw new Error(`Failed to update ${errors.length} team seeds`);
  }

  return results
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map((result) => result.value.data);
};

/**
 * Reset all seeds in a division to automatic using RPC
 */
export const resetDivisionSeeds = async (divisionId: string): Promise<void> => {
  const { error } = await supabase.rpc('reset_division_seeds', {
    p_division_id: divisionId,
  });

  if (error) {
    dbLog('Error resetting division seeds:', error);
    throw error;
  }
};
