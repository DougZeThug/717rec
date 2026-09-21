import { useCallback, useEffect, useMemo } from 'react';

import { Match, Ranking, Team } from '@/types';
import { getTierFromDivision } from '@/utils/autoSchedule/blossom/tierUtils';
import { debugLog, errorLog } from '@/utils/logger';
import { getDisplayedPowerScore } from '@/utils/powerScore/formatPowerScore';
import { updateRankChanges } from '@/utils/rankingUtils';
import { calculateStreak } from '@/utils/rankingUtils/calculateStreak';

import { usePreviousRankings } from './rankings/usePreviousRankings';
import { useRankingsData } from './rankings/useRankingsData';
import { useTeams } from './useTeams';

// One shared empty result, so a league with no teams hands out the same array
// every render instead of a fresh one. Matches EMPTY_TEAMS in teams/useTeamsQuery.
const EMPTY_RANKINGS: Ranking[] = [];

export const useTeamRankings = (teams?: Team[] | undefined, matches?: Match[] | undefined) => {
  const { previousRankings, lastUpdated } = usePreviousRankings();
  const { latestMatches, matchesLoading, matchesError, refetchMatches } = useRankingsData();
  const { teams: latestTeams, isLoading: teamsLoading, error: teamsError, fetchTeams } = useTeams();

  // Surface the first fetch error from either data source so consumers can show
  // a retryable error state instead of an empty/"no data" screen.
  const error = teamsError ?? matchesError ?? null;

  const refetch = useCallback(() => {
    fetchTeams();
    refetchMatches?.();
  }, [fetchTeams, refetchMatches]);

  /**
   * Worked out during render, not in an effect.
   *
   * Deriving this into state meant every mount had a commit where the teams had
   * arrived but the rankings had not, which is what let /stats draw its no-teams
   * panel over a full league (B-56). It also fed the hook's own output back into
   * its effect dependencies, needing a `rankings.length` dependency and a guard
   * to stop an infinite loop. A memo cannot depend on its own result, so both
   * problems are gone rather than worked around.
   *
   * Pure read: the ranking_snapshots baseline is written server-side by the
   * capture-power-snapshots cron, never as a side effect of rendering.
   */
  const { rankings, failure } = useMemo((): { rankings: Ranking[]; failure: unknown } => {
    debugLog(
      'Previous rankings loaded for trend calculation:',
      previousRankings,
      'Last updated:',
      lastUpdated
    );

    const teamsToUse = teams || latestTeams;
    const matchesToUse = matches || latestMatches;

    // Wait for teams data to be loaded.
    // Only gate on teamsLoading when no teams prop was provided by the caller,
    // so consumers that pass their own teams don't block on the global query.
    if (!teamsToUse || teamsToUse.length === 0 || (!teams && teamsLoading)) {
      debugLog('Teams not loaded yet or empty:', {
        teamsCount: teamsToUse?.length,
        teamsLoading,
      });
      return { rankings: EMPTY_RANKINGS, failure: null };
    }

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
          powerScore: team.power_score ?? null,
          streak,
          divisionName: team.divisionName || 'Unassigned',
          previousRank,
          rankChange: undefined, // Will be calculated after sorting
          headToHead: {}, // Will be populated if needed
          closeMatchLosses: team.close_match_losses || 0,
        };
      });

      // Create lookup map for O(1) power score access (avoid O(n²) find() in sort)
      const powerScoreMap = new Map(teamsToUse.map((t) => [t.id, t.power_score]));

      // Sort by power score with NULL handling - teams with NULL scores go to the end
      const sortedRankings = calculatedRankings.sort((a, b) => {
        const aOriginalPowerScore = powerScoreMap.get(a.teamId);
        const bOriginalPowerScore = powerScoreMap.get(b.teamId);
        const aDisplayedPowerScore = getDisplayedPowerScore(aOriginalPowerScore);
        const bDisplayedPowerScore = getDisplayedPowerScore(bOriginalPowerScore);

        // Handle NULL values - put them at the end
        if (aDisplayedPowerScore === null && bDisplayedPowerScore === null) {
          // Both NULL: division tier first, then win %, then name
          const tierA = getTierFromDivision(a.divisionName);
          const tierB = getTierFromDivision(b.divisionName);
          if (tierA !== tierB) return tierA - tierB;
          if (b.winPercentage !== a.winPercentage) {
            return b.winPercentage - a.winPercentage;
          }
          return (a.teamName || '').localeCompare(b.teamName || '');
        }
        if (aDisplayedPowerScore === null) return 1; // a goes to end
        if (bDisplayedPowerScore === null) return -1; // b goes to end

        // Both have visible power scores, sort by the same 1-decimal value shown in the UI.
        // If the displayed scores tie, division tier becomes the primary tiebreaker.
        if (bDisplayedPowerScore !== aDisplayedPowerScore) {
          return bDisplayedPowerScore - aDisplayedPowerScore;
        }
        // Tiebreakers (in order): higher division, then win %, then name.
        // Division MUST beat win % so a higher-division team ranks above a
        // lower-division team even when the latter has a better record.
        const tierA = getTierFromDivision(a.divisionName);
        const tierB = getTierFromDivision(b.divisionName);
        if (tierA !== tierB) return tierA - tierB;
        if (b.winPercentage !== a.winPercentage) {
          return b.winPercentage - a.winPercentage;
        }
        return (a.teamName || '').localeCompare(b.teamName || '');
      });

      // Update rank changes based on previous rankings
      return { rankings: updateRankChanges(sortedRankings), failure: null };
    } catch (error) {
      // Handed to the effect below rather than logged here: errorLog reaches
      // Sentry in production, and React may discard and re-run a memo factory,
      // so reporting from inside one could send the same failure twice.
      return { rankings: EMPTY_RANKINGS, failure: error };
    }
  }, [teams, latestTeams, matches, latestMatches, previousRankings, lastUpdated, teamsLoading]);

  useEffect(() => {
    if (failure) errorLog('Error calculating rankings:', failure);
  }, [failure]);

  return {
    rankings,
    // No local flag. With the rankings worked out during render there is no
    // moment where the data has arrived but the result has not, so the two
    // queries are the whole truth.
    isLoading: teamsLoading || matchesLoading,
    error,
    refetch,
  };
};
