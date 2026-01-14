import { useState } from 'react';

import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { dbLog, errorLog } from '@/utils/logger';

interface TeamUpdate {
  team_id: string;
  season_id: string;
  division_name: string;
  playoff_rank: number | null;
}

interface UseUpdateSeasonStatsReturn {
  updateStats: (updates: TeamUpdate[]) => Promise<boolean>;
  isUpdating: boolean;
  error: Error | null;
}

export const useUpdateSeasonStats = (): UseUpdateSeasonStatsReturn => {
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
          const { error: updateError } = await supabase
            .from('team_season_stats')
            .update({
              division_name: update.division_name,
              playoff_rank: update.playoff_rank,
            })
            .eq('team_id', update.team_id)
            .eq('season_id', update.season_id);

          if (updateError) {
            throw new Error(
              `Failed to update team ${update.team_id}: ${updateError.message}`
            );
          }

          return true;
        });

        await Promise.all(updatePromises);
      }

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
