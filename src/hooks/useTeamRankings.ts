import { useEffect, useState } from 'react';

import { Match, Ranking, Team } from '@/types';
import { debugLog, errorLog } from '@/utils/logger';
import { saveRankingsToStorage, updateRankChanges } from '@/utils/rankingUtils';
import { calculateStreak } from '@/utils/rankingUtils/calculateStreak';

import { usePreviousRankings } from './rankings/usePreviousRankings';
import { useRankingsData } from './rankings/useRankingsData';
import { useTeams } from './useTeams';

export const useTeamRankings = (teams?: Team[] | undefined, matches?: Match[] | undefined) => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { previousRankings, lastUpdated } = usePreviousRankings();
  const { latestMatches, matchesLoading } = useRankingsData();
  const { teams: latestTeams, isLoading: teamsLoading } = useTeams();

  useEffect(() => {
    debugLog(
      'Previous rankings loaded for trend calculation:',
      previousRankings,
      'Last updated:',
      lastUpdated
    );

    const updateRankings = async () => {
      const teamsToUse = teams || latestTeams;
      const matchesToUse = matches || latestMatches;

      // Wait for teams data to be loaded
      if (!teamsToUse || teamsToUse.length === 0 || teamsLoading) {
        debugLog('Teams not loaded yet or empty:', {
          teamsCount: teamsToUse?.length,
          teamsLoading,
        });
        setRankings([]);
        return;
      }

      setIsLoading(true);

      try {
        debugLog(`Processing ${teamsToUse.length} teams with power scores (NULL for 0-0 teams)`);

        // Create rankings directly from team data, handling NULL power scores
        const calculatedRankings = teamsToUse.map((team): Ranking => {
          // Calculate streak from matches
          const streak = calculateStreak(team.id, matchesToUse);
          const previousRank = previousRankings?.[team.id];

          // Use the power_score from v_team_details (NULL for teams with no matches)
          return {
            teamId: team.id,
            teamName: team.name,
            imageUrl: team.imageUrl,
            logoUrl: team.logoUrl,
            wins: team.wins || 0,
            losses: team.losses || 0,
            gamesWon: team.game_wins || 0,
            gamesLost: team.game_losses || 0,
            winPercentage: team.win_percentage || 0,
            gameWinPercentage: team.game_win_percentage || 0,
            sos: team.sos || 0.5,
            powerScore: team.power_score || 0, // Convert NULL to 0 for sorting, but keep original for display
            streak,
            divisionName: team.divisionName || 'Unassigned',
            previousRank,
            rankChange: 0, // Will be calculated after sorting
            headToHead: {}, // Will be populated if needed
            closeMatchLosses: team.close_match_losses || 0,
          };
        });

        // Sort by power score with NULL handling - teams with NULL scores go to the end
        const sortedRankings = calculatedRankings.sort((a, b) => {
          const aOriginalPowerScore = teamsToUse.find((t) => t.id === a.teamId)?.power_score;
          const bOriginalPowerScore = teamsToUse.find((t) => t.id === b.teamId)?.power_score;

          // Handle NULL values - put them at the end
          if (aOriginalPowerScore === null && bOriginalPowerScore === null) {
            // Both are NULL, sort by win percentage as secondary
            if (b.winPercentage !== a.winPercentage) {
              return b.winPercentage - a.winPercentage;
            }
            // Tertiary sort by name
            return (a.teamName || '').localeCompare(b.teamName || '');
          }
          if (aOriginalPowerScore === null) return 1; // a goes to end
          if (bOriginalPowerScore === null) return -1; // b goes to end

          // Both have power scores, sort normally (descending)
          if (bOriginalPowerScore !== aOriginalPowerScore) {
            return bOriginalPowerScore - aOriginalPowerScore;
          }
          // Secondary sort by win percentage
          if (b.winPercentage !== a.winPercentage) {
            return b.winPercentage - a.winPercentage;
          }
          // Tertiary sort by name
          return (a.teamName || '').localeCompare(b.teamName || '');
        });

        // Update rank changes based on previous rankings
        const finalRankings = updateRankChanges(sortedRankings);

        // Save current rankings for future rank change calculations
        saveRankingsToStorage(finalRankings);

        setRankings(finalRankings);
      } catch (error) {
        errorLog('Error calculating rankings:', error);
        setRankings([]);
      } finally {
        setIsLoading(false);
      }
    };

    updateRankings();
  }, [teams, latestTeams, latestMatches, matches, previousRankings, lastUpdated, teamsLoading]);

  return {
    rankings,
    isLoading: isLoading || teamsLoading || matchesLoading,
  };
};
