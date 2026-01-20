import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { dbLog, errorLog, warnLog } from '@/utils/logger';

interface TeamUpdate {
  team_id: string;
  season_id: string;
  division_name: string;
  playoff_rank: number | null;
}

// Normalize division names - map "Intermediate 1" and "Intermediate 2" to "Intermediate"
const normalizeDivisionName = (divisionName: string): string => {
  if (divisionName.toLowerCase().startsWith('intermediate')) {
    return 'Intermediate';
  }
  return divisionName;
};

interface UseUpdateSeasonStatsReturn {
  updateStats: (updates: TeamUpdate[]) => Promise<boolean>;
  isUpdating: boolean;
  error: Error | null;
}

export const useUpdateSeasonStats = (): UseUpdateSeasonStatsReturn => {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateStats = async (updates: TeamUpdate[]): Promise<boolean> => {
    if (updates.length === 0) {
      return true;
    }

    setIsUpdating(true);
    setError(null);

    try {
      dbLog(`Updating ${updates.length} team season stats...`);

      // Process updates in batches to avoid overwhelming the database
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < updates.length; i += batchSize) {
        batches.push(updates.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        // Use Promise.all for parallel updates within each batch
        const updatePromises = batch.map(async (update) => {
          const normalizedDivision = normalizeDivisionName(update.division_name);

          // Update team_season_stats with verification
          const { data: statsData, error: statsError } = await supabase
            .from('team_season_stats')
            .update({
              division_name: normalizedDivision,
              playoff_rank: update.playoff_rank,
            })
            .eq('team_id', update.team_id)
            .eq('season_id', update.season_id)
            .select('team_id');

          if (statsError) {
            throw new Error(
              `Failed to update team_season_stats for ${update.team_id}: ${statsError.message}`
            );
          }

          if (!statsData || statsData.length === 0) {
            errorLog(`Update verification failed for team_season_stats:`, {
              team_id: update.team_id,
              season_id: update.season_id,
              division_name: normalizedDivision,
            });
            throw new Error(
              `No rows updated for team ${update.team_id} in team_season_stats - check RLS policies or if record exists`
            );
          }

          // Also update team_details_archive to keep historical data in sync
          const { data: archiveData, error: archiveError } = await supabase
            .from('team_details_archive')
            .update({
              divisionname: normalizedDivision,
            })
            .eq('team_id', update.team_id)
            .eq('season_id', update.season_id)
            .select('team_id');

          if (archiveError) {
            errorLog(`Failed to update team_details_archive:`, {
              team_id: update.team_id,
              season_id: update.season_id,
              error: archiveError.message,
            });
            throw new Error(
              `Failed to update team_details_archive for ${update.team_id}: ${archiveError.message}`
            );
          }

          if (!archiveData || archiveData.length === 0) {
            warnLog(`No archive record found for team ${update.team_id} in season ${update.season_id}`);
            // Don't fail - archive entry might not exist for this team/season
          }

          return true;
        });

        await Promise.all(updatePromises);
      }

      // Invalidate all affected season data caches to ensure fresh data
      const seasonIds = [...new Set(updates.map((u) => u.season_id))];
      await Promise.all(
        seasonIds.map((seasonId) =>
          queryClient.invalidateQueries({ queryKey: ['season-data', seasonId] })
        )
      );

      dbLog(`Successfully updated ${updates.length} team season stats`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      errorLog('Failed to update team season stats:', err);
      setError(err instanceof Error ? err : new Error(errorMessage));

      toast({
        title: 'Update Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateStats,
    isUpdating,
    error,
  };
};
