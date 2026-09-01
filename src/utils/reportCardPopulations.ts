import type { Ranking } from '@/types';
import type { CareerRanking } from '@/types/career';
import {
  EMPTY_LEAGUE_MATCH_STATS,
  type LeagueTeamMatchStats,
} from '@/utils/teamDetailsUtils/leagueMatchStats';

/**
 * The league-wide numbers each report card grade is ranked against.
 *
 * Both the team's own card (`useTeamReportCard`) and the GPA leaderboard
 * (`useAllTeamReportCards`) grade against these. They used to build them
 * separately, which is how the two came to show different GPAs for the same
 * team — see B-36 in `docs/product-description/bug-triage.md`. Building them
 * in one place means they cannot disagree again.
 */
export interface GradePopulations {
  powerScores: number[];
  winPcts: number[];
  sos: number[];
  gameWinPcts: number[];
  sweepRates: number[];
  /**
   * Only the teams that have played a deciding third game. A team with none has
   * no clutch rate at all, so it is left **out** of the population rather than
   * counted as a zero — which would drag every other team's rank down. This
   * list is therefore usually shorter than the five above it.
   */
  clutchRates: number[];
}

const emptyPopulations = (): GradePopulations => ({
  powerScores: [],
  winPcts: [],
  sos: [],
  gameWinPcts: [],
  sweepRates: [],
  clutchRates: [],
});

/**
 * Season populations, from the standings rows and the league's match statistics.
 *
 * One pass builds all six. Before, each list took a pass of its own over the
 * rankings, and the clutch list took three more on top of that — eight in all,
 * duplicated in both report card hooks.
 */
export const collectSeasonPopulations = (
  rankings: readonly Ranking[],
  matchStats: Map<string, LeagueTeamMatchStats>
): GradePopulations => {
  const populations = emptyPopulations();

  for (const team of rankings) {
    const stats = matchStats.get(team.teamId) ?? EMPTY_LEAGUE_MATCH_STATS;

    // A team with no power score contributes 0 to the percentile maths only;
    // the display layers show "N/A" for it separately.
    populations.powerScores.push(team.powerScore ?? 0);
    populations.winPcts.push(team.winPercentage);
    populations.sos.push(team.sos);
    populations.gameWinPcts.push(team.gameWinPercentage);
    populations.sweepRates.push(stats.sweepRate);

    if (stats.game3Matches > 0) {
      populations.clutchRates.push(stats.clutchWinPct);
    }
  }

  return populations;
};

/**
 * Career populations, straight off the career ranking rows. Career sweep and
 * clutch figures are already counted per team by `useCareerRankings`, so there
 * is no match list to consult here.
 */
export const collectCareerPopulations = (
  careerRankings: readonly CareerRanking[]
): GradePopulations => {
  const populations = emptyPopulations();

  for (const team of careerRankings) {
    populations.powerScores.push(team.careerPowerScore);
    populations.winPcts.push(team.careerWinPercentage);
    populations.sos.push(team.careerSos);
    populations.gameWinPcts.push(team.careerGameWinPercentage);
    populations.sweepRates.push(team.careerSweepRate);

    if (team.careerClutchGame3s > 0) {
      populations.clutchRates.push(team.careerClutchWinPct);
    }
  }

  return populations;
};
