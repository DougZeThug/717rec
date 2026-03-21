import { useQuery } from '@tanstack/react-query';

import { CareerRanking } from '@/types/career';
import { warnLog } from '@/utils/logger';

import { computeAllTeamsTotals } from './career/computeAllTeamsTotals';
import { useTeamsQuery } from './teams';

export function useCareerRankings() {
  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useTeamsQuery();

  return useQuery({
    queryKey: ['careerRankings', teams?.map((t) => t.id)],
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
}
