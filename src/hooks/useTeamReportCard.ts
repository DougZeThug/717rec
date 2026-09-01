import { useMemo } from 'react';

import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import { useCareerRankings } from '@/hooks/useCareerRankings';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import { calculatePercentile } from '@/utils/percentileUtils';
import {
  collectCareerPopulations,
  collectSeasonPopulations,
  isGradeable,
} from '@/utils/reportCardPopulations';
import { calculateGPA, calculateGrade, GradeCategory, TeamGrades } from '@/utils/reportCardUtils';
import {
  calculateLeagueMatchStats,
  EMPTY_LEAGUE_MATCH_STATS,
} from '@/utils/teamDetailsUtils/leagueMatchStats';

export type ReportCardMode = 'season' | 'career';

/**
 * Build one graded category from a value ranked against the league.
 *
 * `null` means the category cannot be measured for this team; the card shows a
 * dash rather than a letter. See B-36 in
 * `docs/product-description/bug-triage.md`.
 */
const gradeAgainst = (
  label: string,
  description: string,
  value: number | null,
  population: number[]
): GradeCategory => {
  if (value === null || population.length === 0) {
    return { label, grade: null, percentile: null, description };
  }
  const { percentile } = calculatePercentile(value, population, true);
  return { label, grade: calculateGrade(percentile), percentile, description };
};

/** The six categories and the weight each carries in the GPA. */
const GRADE_WEIGHTS = {
  overall: 3,
  consistency: 2,
  games: 1.5,
  offense: 1,
  clutch: 1,
  schedule: 1,
} as const;

const buildGrades = (categories: Omit<TeamGrades, 'gpa'>): TeamGrades => ({
  ...categories,
  gpa: calculateGPA([
    { grade: categories.overall.grade, weight: GRADE_WEIGHTS.overall },
    { grade: categories.consistency.grade, weight: GRADE_WEIGHTS.consistency },
    { grade: categories.games.grade, weight: GRADE_WEIGHTS.games },
    { grade: categories.offense.grade, weight: GRADE_WEIGHTS.offense },
    { grade: categories.clutch.grade, weight: GRADE_WEIGHTS.clutch },
    { grade: categories.schedule.grade, weight: GRADE_WEIGHTS.schedule },
  ]),
});

export function useTeamReportCard(teamId: string | undefined, mode: ReportCardMode = 'season') {
  const {
    rankings,
    isLoading: isLoadingRankings,
    error: rankingsError,
    refetch: refetchRankings,
  } = useTeamRankings();
  // The league-wide match list. Same React Query key as the one useTeamRankings
  // already runs, so this is deduped — no extra request. It is what makes a real
  // sweep rate and clutch record available for every team, not just this one.
  const { latestMatches, matchesLoading, matchesError } = useRankingsData();
  const {
    data: careerRankingsData,
    isLoading: isLoadingCareer,
    error: careerError,
    refetch: refetchCareer,
  } = useCareerRankings({ includeHidden: true });

  // A failed fetch is not "no data". Without this the match list arrives as
  // undefined, every team's sweep rate reads 0 and no team has a clutch rate, so
  // the card shows Offense F and Clutch "–" for everyone as though it had
  // loaded. Career mode needs the same treatment: its own fetch can fail too.
  // Raised in review of the B-36 fix.
  const error =
    mode === 'season'
      ? (matchesError ?? rankingsError ?? null)
      : ((careerError as Error | null) ?? null);

  const grades = useMemo((): TeamGrades | null => {
    if (!teamId) return null;
    if (error) return null;

    if (mode === 'career') {
      const careerRankings = careerRankingsData || [];
      if (careerRankings.length === 0) return null;

      const teamCareer = careerRankings.find((r) => r.teamId === teamId);
      if (!teamCareer) return null;

      const populations = collectCareerPopulations(careerRankings);

      return buildGrades({
        overall: gradeAgainst(
          'Overall',
          'Career power score ranking',
          teamCareer.careerPowerScore,
          populations.powerScores
        ),
        offense: gradeAgainst(
          'Offense',
          'Career sweep rate',
          teamCareer.careerSweepRate,
          populations.sweepRates
        ),
        clutch: gradeAgainst(
          'Clutch',
          'Career game 3 win rate',
          teamCareer.careerClutchGame3s > 0 ? teamCareer.careerClutchWinPct : null,
          populations.clutchRates
        ),
        schedule: gradeAgainst(
          'Schedule',
          'Career strength of schedule',
          teamCareer.careerSos,
          populations.sos
        ),
        consistency: gradeAgainst(
          'Consistency',
          'Career win rate',
          teamCareer.careerWinPercentage,
          populations.winPcts
        ),
        games: gradeAgainst(
          'Games',
          'Career game win rate',
          teamCareer.careerGameWinPercentage,
          populations.gameWinPcts
        ),
      });
    }

    // Season mode
    if (!rankings || rankings.length === 0) return null;

    const teamRanking = rankings.find((r) => r.teamId === teamId);
    if (!teamRanking) return null;
    // No rating, nothing to grade. The card shows its "play some matches first"
    // panel rather than six grades built from zeroes the team never earned.
    if (!isGradeable(teamRanking)) return null;

    // Real sweep rates and clutch records for the whole league, from the match
    // list above. The sweep rate of every team but this one used to be guessed
    // from its game win percentage, so a team was graded against estimates.
    const matchStats = calculateLeagueMatchStats(latestMatches);
    const teamStats = matchStats.get(teamId) ?? EMPTY_LEAGUE_MATCH_STATS;

    const populations = collectSeasonPopulations(rankings, matchStats);

    return buildGrades({
      overall: gradeAgainst(
        'Overall',
        'Combined power score ranking',
        teamRanking.powerScore as number,
        populations.powerScores
      ),
      offense: gradeAgainst(
        'Offense',
        'Dominance in matches (sweep rate)',
        teamStats.sweepRate,
        populations.sweepRates
      ),
      clutch: gradeAgainst(
        'Clutch',
        'Performance in close matches (game 3)',
        teamStats.game3Matches > 0 ? teamStats.clutchWinPct : null,
        populations.clutchRates
      ),
      schedule: gradeAgainst(
        'Schedule',
        'Strength of opponents faced',
        teamRanking.sos,
        populations.sos
      ),
      consistency: gradeAgainst(
        'Consistency',
        'Win rate reliability',
        teamRanking.winPercentage,
        populations.winPcts
      ),
      games: gradeAgainst(
        'Games',
        'Individual game win rate',
        teamRanking.gameWinPercentage,
        populations.gameWinPcts
      ),
    });
  }, [teamId, rankings, latestMatches, careerRankingsData, mode, error]);

  return {
    grades,
    isLoading: mode === 'season' ? isLoadingRankings || matchesLoading : isLoadingCareer,
    error,
    // Void-returning on purpose: the caller is an onClick, and it should not
    // have to discard a promise it has no use for.
    //
    // Retry has to clear whichever fetch failed. Refetching only the match list
    // left a rankings failure stuck in the error state until a page reload.
    retry: () => {
      if (mode === 'career') {
        void refetchCareer();
        return;
      }
      // Covers the team list and, through the same query key, the match list —
      // useTeamRankings' own refetch does both, so calling refetchMatches here
      // as well would only start a second fetch of the same query.
      refetchRankings();
    },
  };
}
