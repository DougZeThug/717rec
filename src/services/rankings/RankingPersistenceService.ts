import { supabase } from '@/integrations/supabase/client';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';

/**
 * Get the current active season ID
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
async function getCurrentSeasonId(): Promise<string> {
  const { data, error } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch current season');
  }

  return ensureFound(data?.id, 'Active season');
}

/**
 * Load previous rankings from the database for a specific season
 * Returns a map of team_id to rank_position
 * Returns empty object if no rankings exist (not an error condition)
 * @param seasonId - Optional season ID. If not provided, uses the current active season.
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
export async function loadRankingsFromDatabase(seasonId?: string): Promise<Record<string, number>> {
  // Use provided seasonId, or fall back to the current active season
  const resolvedSeasonId = seasonId ?? (await getCurrentSeasonId());

  // Fetch all ranking snapshots for this season
  const { data, error } = await supabase
    .from('ranking_snapshots')
    .select('team_id, rank_position')
    .eq('season_id', resolvedSeasonId);

  if (error) {
    handleDatabaseError(error, 'Failed to load rankings from database');
  }

  // Convert to map format
  const rankingsMap: Record<string, number> = {};
  data?.forEach((snapshot) => {
    rankingsMap[snapshot.team_id] = snapshot.rank_position;
  });

  return rankingsMap;
}
