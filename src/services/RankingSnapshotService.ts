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
 * Get season ID for a specific team through team_season_stats
 * Since divisions don't have season_id, we look up via team_season_stats
 * Falls back to current active season if team has no stats yet
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
async function getSeasonIdForTeam(teamId: string): Promise<string> {
  // First try to get the active season for this team from team_season_stats
  const { data, error } = await supabase
    .from('team_season_stats')
    .select('season_id')
    .eq('team_id', teamId)
    .order('season_id', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // If no stats exist for this team, fall back to current active season
    return getCurrentSeasonId();
  }

  return ensureFound(data?.season_id, 'Season for team', teamId);
}

/**
 * Save current rankings to the database
 * Creates or updates ranking snapshots for each team in their season
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
export async function saveRankingsToDatabase(rankings: Ranking[]): Promise<boolean> {
  // For each ranking, we need to determine the season
  // We'll get the season from the first team's division
  if (rankings.length === 0) {
    return true;
  }

  try {
    // Get season ID from the first team
    const seasonId = await getSeasonIdForTeam(rankings[0].teamId);

    // Prepare ranking snapshots for upsert
    const snapshots = rankings.map((ranking, index) => ({
      team_id: ranking.teamId,
      season_id: seasonId,
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
 * Load previous rankings from the database for the current season
 * Returns a map of team_id to rank_position
 * Returns empty object if no rankings exist (not an error condition)
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
export async function loadRankingsFromDatabase(): Promise<Record<string, number>> {
  // Get current active season
  const seasonId = await getCurrentSeasonId();

  // Fetch all ranking snapshots for this season
  const { data, error } = await supabase
    .from('ranking_snapshots')
    .select('team_id, rank_position')
    .eq('season_id', seasonId);

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
