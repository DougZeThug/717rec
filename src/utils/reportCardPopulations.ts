import type { Ranking } from '@/types';
import type { CareerRanking } from '@/types/career';
import {
  EMPTY_LEAGUE_MATCH_STATS,
  type LeagueTeamMatchStats,
} from '@/utils/teamDetailsUtils/leagueMatchStats';

/**
 * The league-wide numbers each report card grade is ranked against.
 *
 * Only teams that have a rating are in them — see `isGradeable`.
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

/**
 * Whether a team can be graded at all.
 *
 * A team with no power score has **no rating**, not a rating of zero — the
 * standings render "—" for it, never a number. It has either played nothing to
 * measure, or withdrawn to the Hidden division, which the rest of the app skips
 * (`src/utils/teamGrouping.ts`). Its win rate and game rate are 0/0 rather than
 * measured zeroes, and its strength of schedule is a hardcoded 0.5 default
 * (`useTeamRankings.ts`) rather than a schedule it faced.
 *
 * Counting such a team as a zero did two wrong things at once: it gave that team
 * a grade it had not earned, and — because the grades are percentiles — it
 * padded the population with artificial low values, so **every other team's
 * grade came out better than it was**. Raised in review of the B-36 fix.
 */
export const isGradeable = (team: Pick<Ranking, 'powerScore'>): boolean =>
  team.powerScore !== null && team.powerScore !== undefined;

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
    if (!isGradeable(team)) continue;

    const stats = matchStats.get(team.teamId) ?? EMPTY_LEAGUE_MATCH_STATS;

    // Safe to assert: isGradeable above has ruled out null and undefined.
    populations.powerScores.push(team.powerScore as number);
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
