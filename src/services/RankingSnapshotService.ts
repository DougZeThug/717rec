import { supabase } from '@/integrations/supabase/client';
import { Ranking } from '@/types';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

/**
 * Service for managing ranking snapshots in the database
 * Replaces localStorage-based ranking persistence
 */

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
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch current season');
  }

  return ensureFound(data?.id, 'Active season');
}

/**
 * Save current rankings to the database
 * Creates or updates ranking snapshots for each team in a specific season
 * @param rankings - The rankings to save
 * @param seasonId - Optional season ID. If not provided, uses the current active season.
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
export async function saveRankingsToDatabase(rankings: Ranking[], seasonId?: string): Promise<boolean> {
  if (rankings.length === 0) {
    return true;
  }

  try {
    // Use provided seasonId, or fall back to the current active season
    const resolvedSeasonId = seasonId ?? await getCurrentSeasonId();

    // Prepare ranking snapshots for upsert
    const snapshots = rankings.map((ranking, index) => ({
      team_id: ranking.teamId,
      season_id: resolvedSeasonId,
      rank_position: index + 1,
    }));

    // Upsert all rankings in one batch
    const { error } = await supabase.from('ranking_snapshots').upsert(snapshots, {
      onConflict: 'team_id,season_id',
      ignoreDuplicates: false,
    });

    if (error) {
      handleDatabaseError(error, 'Failed to save rankings to database');
      return false;
    }

    return true;
  } catch {
    return false;
  }
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
  const resolvedSeasonId = seasonId ?? await getCurrentSeasonId();

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

/**
 * Migrate existing localStorage rankings to database
 * This is a one-time migration helper
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
export async function migrateLocalStorageToDatabase(): Promise<void> {
  const savedRankings = localStorage.getItem('previousRankings');
  if (!savedRankings) {
    // Nothing to migrate
    return;
  }

  const rankingsMap: Record<string, number> = JSON.parse(savedRankings);
  const seasonId = await getCurrentSeasonId();

  // Convert map to array of snapshots
  const snapshots = Object.entries(rankingsMap).map(([teamId, rankPosition]) => ({
    team_id: teamId,
    season_id: seasonId,
    rank_position: rankPosition,
  }));

  // Upsert all rankings
  const { error } = await supabase.from('ranking_snapshots').upsert(snapshots, {
    onConflict: 'team_id,season_id',
    ignoreDuplicates: false,
  });

  if (error) {
    handleDatabaseError(error, 'Failed to migrate rankings to database');
  }

  // Clear localStorage after successful migration
  localStorage.removeItem('previousRankings');
  localStorage.removeItem('rankingsLastUpdated');
}
