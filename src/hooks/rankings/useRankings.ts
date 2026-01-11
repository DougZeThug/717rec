import { useEffect, useState } from 'react';

import { useTeamsArray } from '@/hooks/teams';
import { Ranking } from '@/types';
import { errorLog } from '@/utils/logger';
import { createRankingObject } from '@/utils/rankingUtils/createRankingObject';
import { fetchDivisionWeights } from '@/utils/rankingUtils/divisionWeightsCache';
import { sortAndUpdateRankings } from '@/utils/rankingUtils/sortAndUpdateRankings';

import { useRankingsData } from './useRankingsData';

export const useRankings = () => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { teams, isLoading: teamsLoading } = useTeamsArray();
  const { latestMatches, matchesLoading } = useRankingsData();

  useEffect(() => {
    const calculateRankings = async () => {
      if (teamsLoading || matchesLoading) {
        setIsLoading(true);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch division weights ONCE before processing all teams
        const divisionWeights = await fetchDivisionWeights();

        // Load previous rankings from localStorage (wrapped in try/catch for iOS Safari private browsing)
        let previousRankings: Record<string, number> = {};
        try {
          const savedRankings = localStorage.getItem('previousRankings');
          previousRankings = savedRankings ? JSON.parse(savedRankings) : {};
        } catch {
          // localStorage unavailable (e.g., iOS Safari private browsing)
        }

        // Create ranking objects for all teams (now synchronous)
        const unsortedRankings = teams.map((team) =>
          createRankingObject(team, teams, latestMatches, previousRankings, divisionWeights)
        );

        // Sort and update rank changes
        const sortedRankings = sortAndUpdateRankings(unsortedRankings, previousRankings);

        // Save current rankings as previous for next calculation
        const currentRankings: Record<string, number> = {};
        sortedRankings.forEach((ranking, index) => {
          currentRankings[ranking.teamId] = index + 1;
        });
        localStorage.setItem('previousRankings', JSON.stringify(currentRankings));

        setRankings(sortedRankings);
        setError(null);
      } catch (err) {
        errorLog('Error calculating rankings:', err);
        setError(err instanceof Error ? err.message : 'Failed to calculate rankings');
      } finally {
        setIsLoading(false);
      }
    };

    calculateRankings();
  }, [teams, latestMatches, teamsLoading, matchesLoading]);

  return {
    rankings,
    isLoading,
    error,
  };
};
