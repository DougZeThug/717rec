import { supabase } from '@/integrations/supabase/client';
import { Ranking } from '@/types';
import { errorLog } from '@/utils/logger';

/**
 * Service for managing ranking snapshots in the database
 * Replaces localStorage-based ranking persistence
 */

/**
 * Get the current active season ID
 */
async function getCurrentSeasonId(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();

    if (error) {
      errorLog('Error fetching current season:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    errorLog('Error in getCurrentSeasonId:', error);
    return null;
  }
}

/**
 * Get season ID for a specific team through its division
 */
async function getSeasonIdForTeam(teamId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(
        `
        division_id,
        divisions!inner(season_id)
      `
      )
      .eq('id', teamId)
      .single();

    if (error) {
      errorLog('Error fetching season for team:', error);
      return null;
    }

    return (data?.divisions as any)?.season_id || null;
  } catch (error) {
    errorLog('Error in getSeasonIdForTeam:', error);
    return null;
  }
}

/**
 * Save current rankings to the database
 * Creates or updates ranking snapshots for each team in their season
 */
export async function saveRankingsToDatabase(rankings: Ranking[]): Promise<boolean> {
  try {
    // For each ranking, we need to determine the season
    // We'll get the season from the first team's division
    if (rankings.length === 0) {
      return true;
    }

    // Get season ID from the first team
    const seasonId = await getSeasonIdForTeam(rankings[0].teamId);

    if (!seasonId) {
      errorLog('Could not determine season ID for rankings');
      // Fall back to getting current active season
      const currentSeasonId = await getCurrentSeasonId();
      if (!currentSeasonId) {
        errorLog('No active season found, cannot save rankings');
        return false;
      }
    }

    const finalSeasonId = seasonId || (await getCurrentSeasonId());
    if (!finalSeasonId) {
      errorLog('Could not determine season ID');
      return false;
    }

    // Prepare ranking snapshots for upsert
    const snapshots = rankings.map((ranking, index) => ({
      team_id: ranking.teamId,
      season_id: finalSeasonId,
      rank_position: index + 1,
    }));

    // Upsert all rankings in one batch
    const { error } = await supabase.from('ranking_snapshots').upsert(snapshots, {
      onConflict: 'team_id,season_id',
      ignoreDuplicates: false,
    });

    if (error) {
      errorLog('Error saving rankings to database:', error);
      return false;
    }

    return true;
  } catch (error) {
    errorLog('Error in saveRankingsToDatabase:', error);
    return false;
  }
}

/**
 * Load previous rankings from the database for the current season
 * Returns a map of team_id to rank_position
 */
export async function loadRankingsFromDatabase(): Promise<Record<string, number>> {
  try {
    // Get current active season
    const seasonId = await getCurrentSeasonId();

    if (!seasonId) {
      errorLog('No active season found, cannot load rankings');
      return {};
    }

    // Fetch all ranking snapshots for this season
    const { data, error } = await supabase
      .from('ranking_snapshots')
      .select('team_id, rank_position')
      .eq('season_id', seasonId);

    if (error) {
      errorLog('Error loading rankings from database:', error);
      return {};
    }

    // Convert to map format
    const rankingsMap: Record<string, number> = {};
    data?.forEach((snapshot) => {
      rankingsMap[snapshot.team_id] = snapshot.rank_position;
    });

    return rankingsMap;
  } catch (error) {
    errorLog('Error in loadRankingsFromDatabase:', error);
    return {};
  }
}

/**
 * Migrate existing localStorage rankings to database
 * This is a one-time migration helper
 */
export async function migrateLocalStorageToDatabase(): Promise<boolean> {
  try {
    const savedRankings = localStorage.getItem('previousRankings');
    if (!savedRankings) {
      // Nothing to migrate
      return true;
    }

    const rankingsMap: Record<string, number> = JSON.parse(savedRankings);
    const seasonId = await getCurrentSeasonId();

    if (!seasonId) {
      errorLog('No active season found for migration');
      return false;
    }

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
      errorLog('Error migrating rankings to database:', error);
      return false;
    }

    // Clear localStorage after successful migration
    localStorage.removeItem('previousRankings');
    localStorage.removeItem('rankingsLastUpdated');

    return true;
  } catch (error) {
    errorLog('Error in migrateLocalStorageToDatabase:', error);
    return false;
  }
}
