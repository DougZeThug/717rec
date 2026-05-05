import { supabase } from '@/integrations/supabase/client';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';

/**
 * Service layer for team seed operations
 * Abstracts Supabase mutations from presentation components
 */

export interface SeedUpdateResult {
  id: string;
  seed: number | null;
}

// Shape of each item inside the `results` array returned by batch_update_team_seeds RPC
export interface BulkSeedResult {
  id: string;
  seed: number | null;
}

/**
 * Update a single team's seed value
 * @throws {DatabaseError} When database operations fail
 */
export const updateTeamSeed = async (
  teamId: string,
  seed: number | null
): Promise<SeedUpdateResult> => {
  const { data, error } = await supabase
    .from('teams')
    .update({ seed })
    .eq('id', teamId)
    .select('id, seed')
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to update team seed');
  }

  return ensureFound(data, 'Team', teamId);
};

/**
 * Update multiple team seeds in bulk using a single atomic RPC call.
 * Uses batch_update_team_seeds so all updates run in one DB transaction,
 * which allows the DEFERRABLE unique constraint on (division_id, seed) to
 * be satisfied at the end of the transaction rather than per-row — preventing
 * unique constraint violations during seed swaps and reorders.
 * @throws {DatabaseError} When database operations fail
 */
export const bulkUpdateTeamSeeds = async (
  updates: Array<{ teamId: string; seed: number | null }>
): Promise<BulkSeedResult[]> => {
  const { data, error } = await supabase.rpc('batch_update_team_seeds', {
    p_updates: updates.map(({ teamId, seed }) => ({
      team_id: teamId,
      seed: seed === null ? 'null' : seed.toString(),
    })),
  });

  if (error) {
    handleDatabaseError(error, 'Failed to bulk update team seeds');
  }

  // batch_update_team_seeds returns Json; the actual shape is { results: BulkSeedResult[] }
  const payload = data as { results?: BulkSeedResult[] } | null;
  return payload?.results ?? [];
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
