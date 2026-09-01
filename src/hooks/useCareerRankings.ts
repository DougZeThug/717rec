import { useQuery } from '@tanstack/react-query';

import { CareerRanking } from '@/types/career';
import { warnLog } from '@/utils/logger';

import { computeAllTeamsTotals } from './career/computeAllTeamsTotals';
import { useTeamsQuery } from './teams';

interface CareerRankingsOptions {
  includeHidden?: boolean;
}

export function useCareerRankings(options?: CareerRankingsOptions) {
  const includeHidden = options?.includeHidden ?? false;
  const {
    data: teams,
    isLoading: isLoadingTeams,
    error: teamsError,
    refetch: refetchTeams,
  } = useTeamsQuery({ includeHidden });

  const query = useQuery({
    queryKey: ['careerRankings', teams?.map((t) => t.id), includeHidden],
    queryFn: async (): Promise<CareerRanking[]> => {
      if (!teams) return [];

      // Batch fetch: ~9 queries total instead of ~10 per team
      const allTotals = await computeAllTeamsTotals(teams);

      const rankings: CareerRanking[] = [];

      for (const team of teams) {
        const totals = allTotals.get(team.id);

        if (!totals) {
          warnLog(`No career totals found for team: ${team.name}`);
          continue;
        }

        const totalCareerMatches = totals.career_match_wins + totals.career_match_losses;
        const careerWinPercentage =
          totalCareerMatches > 0 ? totals.career_match_wins / totalCareerMatches : 0;

        const totalCareerGames = totals.career_game_wins + totals.career_game_losses;
        const careerGameWinPercentage =
          totalCareerGames > 0 ? totals.career_game_wins / totalCareerGames : 0;

        const totalPlayoffMatches = totals.career_playoff_wins + totals.career_playoff_losses;
        const careerPlayoffWinPercentage =
          totalPlayoffMatches > 0 ? totals.career_playoff_wins / totalPlayoffMatches : 0;

        rankings.push({
          teamId: team.id,
          teamName: team.name,
          logoUrl: team.logoUrl,
          imageUrl: team.imageUrl,

          // Career match stats
          careerMatchWins: totals.career_match_wins,
          careerMatchLosses: totals.career_match_losses,
          careerWinPercentage,

          // Career game stats
          careerGameWins: totals.career_game_wins,
          careerGameLosses: totals.career_game_losses,
          careerGameWinPercentage,

          // Career playoff stats
          careerPlayoffWins: totals.career_playoff_wins,
          careerPlayoffLosses: totals.career_playoff_losses,
          careerPlayoffWinPercentage,

          // Achievements
          championships: totals.championships,
          runnerUps: totals.runner_ups,

          // Career sweep/clutch stats
          careerSweepRate: totals.career_sweep_rate,
          careerClutchWinPct: totals.career_clutch_win_pct,
          careerClutchGame3s: totals.career_clutch_game3s,

          // Career power score and meta stats
          careerPowerScore: totals.career_power_score,
          careerSos: totals.career_sos,
          playoffFinishes: totals.playoff_finishes?.length || 0,
        });
      }

      // Sort by career power score (descending)
      return rankings.sort((a, b) => b.careerPowerScore - a.careerPowerScore);
    },
    enabled: !!teams && !isLoadingTeams && !teamsError,
    staleTime: 1000 * 60 * 10, // 10 minutes - career data is extremely static
  });

  // The rankings query is disabled until the team list arrives, so it can never
  // report the team fetch's own failure: `error` stayed null and `data` stayed
  // undefined, which every consumer read as an empty league. Fold the
  // prerequisite's error, loading flag and refetch in here once, rather than
  // leaving each consumer to remember it. Raised in review of the B-36 fix.
  const mergedError = query.error ?? teamsError ?? null;

  /**
   * A narrow shape, deliberately, rather than the query object with fields
   * patched on top of it.
   *
   * This hook has a prerequisite: the rankings query stays disabled until the
   * team list arrives, so it can never report a team fetch's failure itself.
   * Merging that error in is necessary — without it a failed request read as an
   * empty league — but patching one field of a UseQueryResult left the rest
   * disagreeing with it: `isError` stayed false while `error` was set, and a
   * custom `refetch` handed back a stale result that reported no failure.
   *
   * Returning only what callers use ends that. All four consumers take `data`,
   * `isLoading`, `error` and `refetch`; anything else is now a type error
   * rather than a field that quietly contradicts the others.
   */
  return {
    data: query.data,
    isLoading: isLoadingTeams || query.isLoading,
    error: mergedError,
    isError: mergedError !== null,
    /**
     * A retry action, not a fetch: it resolves with nothing. The outcome is
     * read from `error` on the next render, which is the one channel that
     * reports both this query's failure and its prerequisite's. Rejecting
     * instead would be worse — callers fire this from an onClick and do not
     * await it, so a rejection would surface as an unhandled promise.
     */
    refetch: async (): Promise<void> => {
      const teamsResult = await refetchTeams();
      // Still no team list: the rankings query remains disabled, so refetching
      // it would do nothing. It re-enables and runs itself once teams are back.
      if (teamsResult.error) return;
      await query.refetch();
    },
  };
}
