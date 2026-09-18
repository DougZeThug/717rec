import type {
  RecapGradeCategory,
  RecapGradeCategoryKey,
  RecapTeamGrade,
} from '@/types/recapEdition';
import type { GradeableSeasonTeam } from '@/utils/reportCardPopulations';
import { collectSeasonPopulations, isGradeable } from '@/utils/reportCardPopulations';
import {
  calculateGPA,
  GRADE_WEIGHTS,
  gradeCategoryAgainst,
  type LetterGrade,
} from '@/utils/reportCardUtils';
import type { LeagueTeamMatchStats } from '@/utils/teamDetailsUtils/leagueMatchStats';
import { EMPTY_LEAGUE_MATCH_STATS } from '@/utils/teamDetailsUtils/leagueMatchStats';

import type { SnapshotStandingsInput } from './standingsOrder';
import { compareStandings, gameWinPercentage, winPercentage } from './standingsOrder';

/**
 * Grades and ranks every team in the league for one week.
 *
 * Pure on purpose: no database access, so every rule that decides what a
 * published ranking SAYS can be tested directly and cannot drift between the
 * admin preview and the public page.
 *
 * It runs the report card's own machinery — `collectSeasonPopulations`,
 * `gradeCategoryAgainst`, `calculateGPA`, `GRADE_WEIGHTS` — over a week's
 * snapshot rather than today's standings. Same letters, same weights, same six
 * categories as the team page. The one thing that differs is the population:
 * the team page ranks against the league as it is now, this ranks against the
 * league as it was that week, so the two can legitimately disagree by a notch.
 */

export interface GradeTeamsForWeekInput {
  /** Every team's snapshot row for the week being graded. */
  teams: SnapshotStandingsInput[];
  /** Sweep and clutch figures per team, from matches up to the END of that week. */
  matchStats: Map<string, LeagueTeamMatchStats>;
  /**
   * The previous week's snapshot rows, used only to work out how far each team
   * moved. null when there is no comparable week, which shows as no arrow at
   * all rather than a made-up one.
   */
  previousTeams: SnapshotStandingsInput[] | null;
  /** Week-over-week power score movement per team. */
  deltaByTeam: Map<string, number>;
}

/** The label and description each category carries into the rendered card. */
const CATEGORY_LABELS: Record<RecapGradeCategoryKey, string> = {
  overall: 'Overall',
  consistency: 'Consistency',
  games: 'Games',
  offense: 'Offense',
  clutch: 'Clutch',
  schedule: 'Schedule',
};

/** Position of every team in a set of rows, under the standings order. */
const rankByTeam = (rows: SnapshotStandingsInput[]): Map<string, number> => {
  const ranks = new Map<string, number>();
  [...rows].sort(compareStandings).forEach((row, index) => {
    ranks.set(row.teamId, index + 1);
  });
  return ranks;
};

/** The five fields the population builder reads, off a snapshot row. */
const toGradeableTeam = (row: SnapshotStandingsInput): GradeableSeasonTeam => ({
  teamId: row.teamId,
  powerScore: row.powerScore,
  winPercentage: winPercentage(row),
  gameWinPercentage: gameWinPercentage(row),
  sos: row.sos,
});

export const gradeTeamsForWeek = ({
  teams,
  matchStats,
  previousTeams,
  deltaByTeam,
}: GradeTeamsForWeekInput): RecapTeamGrade[] => {
  const populations = collectSeasonPopulations(teams.map(toGradeableTeam), matchStats);
  const previousRanks = previousTeams ? rankByTeam(previousTeams) : null;

  return [...teams].sort(compareStandings).map((row, index) => {
    const stats = matchStats.get(row.teamId) ?? EMPTY_LEAGUE_MATCH_STATS;

    // A team with no rating is ranked and listed, but not graded. Dropping it
    // from a post called "power rankings" would be worse than saying it has no
    // rating yet — and `isGradeable` has already kept it out of the
    // populations, so it is not dragging anyone else's percentile down either.
    const gradeable = isGradeable(row);

    const category = (
      key: RecapGradeCategoryKey,
      value: number | null,
      population: number[]
    ): RecapGradeCategory => {
      const graded = gradeCategoryAgainst(
        CATEGORY_LABELS[key],
        '',
        gradeable ? value : null,
        population
      );
      return {
        key,
        label: CATEGORY_LABELS[key],
        grade: graded.grade,
        percentile: graded.percentile,
      };
    };

    const categories: RecapGradeCategory[] = [
      category('overall', row.powerScore, populations.powerScores),
      category('consistency', winPercentage(row), populations.winPcts),
      category('games', gameWinPercentage(row), populations.gameWinPcts),
      category('offense', stats.sweepRate, populations.sweepRates),
      // No deciding third game means there is no clutch rate to report, so the
      // category is left unmeasured rather than scored as a zero.
      category(
        'clutch',
        stats.game3Matches > 0 ? stats.clutchWinPct : null,
        populations.clutchRates
      ),
      category('schedule', row.sos, populations.sos),
    ];

    const byKey = new Map(categories.map((c) => [c.key, c.grade] as const));
    const weightOf = (key: RecapGradeCategoryKey): number => GRADE_WEIGHTS[key];

    return {
      rank: index + 1,
      // Only a team present in BOTH weeks has a movement to report. A team
      // that did not appear last week has not climbed from anywhere.
      previousRank: previousRanks?.get(row.teamId) ?? null,
      teamId: row.teamId,
      teamName: row.teamName,
      // null, never undefined: JSONB drops undefined and the renderer would
      // then see a missing key instead of "this team has no logo".
      logoUrl: row.logoUrl ?? null,
      division: row.divisionName ?? '',
      grade: (byKey.get('overall') ?? null) as LetterGrade | null,
      gpa: calculateGPA(categories.map((c) => ({ grade: c.grade, weight: weightOf(c.key) }))),
      categories,
      wins: row.wins ?? 0,
      losses: row.losses ?? 0,
      powerScore: row.powerScore ?? null,
      delta: deltaByTeam.get(row.teamId) ?? null,
    };
  });
};
