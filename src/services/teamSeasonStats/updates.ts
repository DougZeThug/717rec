import { supabase } from '@/integrations/supabase/client';
import { NotFoundError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { dbLog, errorLog } from '@/utils/logger';

import type { TeamUpdate } from './types';

/**
 * Batch update team_season_stats and team_details_archive for a list of team updates.
 * Processes in batches of 10 in parallel. Throws on any failure.
 */
export const batchUpdateSeasonStats = async (updates: TeamUpdate[]): Promise<void> => {
  if (updates.length === 0) {
    return;
  }

  dbLog(`Updating ${updates.length} team season stats...`);

  const batchSize = 10;
  const batches = [];

  for (let i = 0; i < updates.length; i += batchSize) {
    batches.push(updates.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const updatePromises = batch.map(async (update) => {
      const { data: statsData, error: statsError } = await supabase
        .from('team_season_stats')
        .update({
          division_name: update.division_name,
          playoff_rank: update.playoff_rank,
        })
        .eq('team_id', update.team_id)
        .eq('season_id', update.season_id)
        .select('team_id');

      if (statsError) {
        handleDatabaseError(statsError, `Failed to update team_season_stats for ${update.team_id}`);
      }

      if (!statsData || statsData.length === 0) {
        errorLog('Update verification failed for team_season_stats:', {
          team_id: update.team_id,
          season_id: update.season_id,
          division_name: update.division_name,
        });
        throw new NotFoundError('TeamSeasonStats', update.team_id);
      }

      const { error: archiveError } = await supabase
        .from('team_details_archive')
        .update({
          divisionname: update.division_name,
        })
        .eq('team_id', update.team_id)
        .eq('season_id', update.season_id)
        .select('team_id');

      if (archiveError) {
        handleDatabaseError(
          archiveError,
          `Failed to update team_details_archive for ${update.team_id}`
        );
      }
    });

    await Promise.all(updatePromises);
  }

  dbLog(`Successfully updated ${updates.length} team season stats`);
};

export type { TeamUpdate };
