import { useEffect, useState } from 'react';

import { useTeamsArray } from '@/hooks/teams';
import { calculateRankings } from '@/services/RankingsCalculationService';
import { Ranking } from '@/types';
import { errorLog, warnLog } from '@/utils/logger';

import { useRankingsData } from './useRankingsData';

export const useRankings = () => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { teams, isLoading: teamsLoading } = useTeamsArray();
  const { latestMatches, matchesLoading } = useRankingsData();

  useEffect(() => {
    const performRankingsCalculation = async () => {
      if (teamsLoading || matchesLoading) {
        setIsLoading(true);
        return;
      }

      try {
        setIsLoading(true);

        // Load previous rankings from database (with localStorage fallback)
        let previousRankings: Record<string, number> = {};
        try {
          const { loadRankingsFromDatabase } =
            await import('@/services/rankings/RankingPersistenceService');
          previousRankings = await loadRankingsFromDatabase();

          // If no database rankings found, try localStorage as fallback
          if (Object.keys(previousRankings).length === 0) {
            try {
              const savedRankings = localStorage.getItem('previousRankings');
              previousRankings = savedRankings ? JSON.parse(savedRankings) : {};
            } catch (e) {
              warnLog('localStorage unavailable for rankings fallback:', e);
            }
          }
        } catch (e) {
          errorLog('Failed to load rankings from database, falling back to localStorage:', e);
          // If database load fails, try localStorage as fallback
          try {
            const savedRankings = localStorage.getItem('previousRankings');
            previousRankings = savedRankings ? JSON.parse(savedRankings) : {};
          } catch (e2) {
            warnLog('localStorage unavailable for rankings fallback:', e2);
          }
        }

        // Delegate calculation to service
        const calculatedRankings = await calculateRankings(teams, latestMatches, previousRankings);

        setRankings(calculatedRankings);
        setError(null);
      } catch (err) {
        errorLog('Error calculating rankings:', err);
        setError(err instanceof Error ? err.message : 'Failed to calculate rankings');
      } finally {
        setIsLoading(false);
      }
    };

    performRankingsCalculation();
  }, [teams, latestMatches, teamsLoading, matchesLoading]);

  return {
    rankings,
    isLoading,
    error,
  };
};
