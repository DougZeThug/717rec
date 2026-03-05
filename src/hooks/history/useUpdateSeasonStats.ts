import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { toast } from '@/hooks/useToast';
import { batchUpdateSeasonStats, type TeamUpdate } from '@/services/TeamStatsService';
import { dbLog, errorLog } from '@/utils/logger';

// Re-export the type for existing consumers
export type { TeamUpdate };

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

      await batchUpdateSeasonStats(updates);

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
