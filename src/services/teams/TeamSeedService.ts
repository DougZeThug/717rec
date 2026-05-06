import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import type {
  BulkTeamSeedUpdateResult,
  BulkTeamSeedUpdateRpcResponse,
  TeamSeedUpdateInput,
  TeamSeedUpdateResult,
} from '@/types/seeding';

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
): Promise<TeamSeedUpdateResult> => {
  const { data, error } = await supabase
    .from('teams')
    .update({ seed })
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to update team seed');
  }

  return data as TeamSeedUpdateResult;
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
  updates: TeamSeedUpdateInput[]
): Promise<BulkTeamSeedUpdateResult[]> => {
  const { data, error } = await supabase.rpc('batch_update_team_seeds', {
    p_updates: updates.map(({ teamId, seed }) => ({
      team_id: teamId,
      seed: seed === null ? 'null' : seed.toString(),
    })),
  });

  if (error) {
    handleDatabaseError(error, 'Failed to bulk update team seeds');
  }

  return parseBulkTeamSeedUpdateResults(data);
};


const isBulkTeamSeedUpdateResult = (value: unknown): value is BulkTeamSeedUpdateResult => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;

  return typeof candidate.ok === 'boolean';
};

const parseBulkTeamSeedUpdateResults = (data: unknown): BulkTeamSeedUpdateResult[] => {
  if (!data || typeof data !== 'object' || !('results' in data)) {
    return [];
  }

  const { results } = data as BulkTeamSeedUpdateRpcResponse;

  if (!Array.isArray(results)) {
    return [];
  }

  return results.filter(isBulkTeamSeedUpdateResult);
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
