import { useMemo } from 'react';

import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import { useCareerRankings } from '@/hooks/useCareerRankings';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import { calculatePercentile } from '@/utils/percentileUtils';
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
  const { rankings, isLoading: isLoadingRankings } = useTeamRankings();
  // The league-wide match list. Same React Query key as the one useTeamRankings
  // already runs, so this is deduped — no extra request. It is what makes a real
  // sweep rate and clutch record available for every team, not just this one.
  const { latestMatches, matchesLoading } = useRankingsData();
  const { data: careerRankingsData, isLoading: isLoadingCareer } = useCareerRankings({
    includeHidden: true,
  });

  const grades = useMemo((): TeamGrades | null => {
    if (!teamId) return null;

    if (mode === 'career') {
      const careerRankings = careerRankingsData || [];
      if (careerRankings.length === 0) return null;

      const teamCareer = careerRankings.find((r) => r.teamId === teamId);
      if (!teamCareer) return null;

      // Only teams that have actually played a deciding third game belong in the
      // clutch population. A team with none has no rate to rank.
      const allClutchRates = careerRankings
        .filter((r) => r.careerClutchGame3s > 0)
        .map((r) => r.careerClutchWinPct);

      return buildGrades({
        overall: gradeAgainst(
          'Overall',
          'Career power score ranking',
          teamCareer.careerPowerScore,
          careerRankings.map((r) => r.careerPowerScore)
        ),
        offense: gradeAgainst(
          'Offense',
          'Career sweep rate',
          teamCareer.careerSweepRate,
          careerRankings.map((r) => r.careerSweepRate)
        ),
        clutch: gradeAgainst(
          'Clutch',
          'Career game 3 win rate',
          teamCareer.careerClutchGame3s > 0 ? teamCareer.careerClutchWinPct : null,
          allClutchRates
        ),
        schedule: gradeAgainst(
          'Schedule',
          'Career strength of schedule',
          teamCareer.careerSos,
          careerRankings.map((r) => r.careerSos)
        ),
        consistency: gradeAgainst(
          'Consistency',
          'Career win rate',
          teamCareer.careerWinPercentage,
          careerRankings.map((r) => r.careerWinPercentage)
        ),
        games: gradeAgainst(
          'Games',
          'Career game win rate',
          teamCareer.careerGameWinPercentage,
          careerRankings.map((r) => r.careerGameWinPercentage)
        ),
      });
    }

    // Season mode
    if (!rankings || rankings.length === 0) return null;

    const teamRanking = rankings.find((r) => r.teamId === teamId);
    if (!teamRanking) return null;

    // Real sweep rates and clutch records for the whole league, from the match
    // list above. The sweep rate of every team but this one used to be guessed
    // from its game win percentage, so a team was graded against estimates.
    const matchStats = calculateLeagueMatchStats(latestMatches);
    const teamStats = matchStats.get(teamId) ?? EMPTY_LEAGUE_MATCH_STATS;

    const allSweepRates = rankings.map(
      (r) => (matchStats.get(r.teamId) ?? EMPTY_LEAGUE_MATCH_STATS).sweepRate
    );
    const allClutchRates = rankings
      .map((r) => matchStats.get(r.teamId) ?? EMPTY_LEAGUE_MATCH_STATS)
      .filter((s) => s.game3Matches > 0)
      .map((s) => s.clutchWinPct);

    return buildGrades({
      overall: gradeAgainst(
        'Overall',
        'Combined power score ranking',
        teamRanking.powerScore ?? 0,
        rankings.map((r) => r.powerScore ?? 0)
      ),
      offense: gradeAgainst(
        'Offense',
        'Dominance in matches (sweep rate)',
        teamStats.sweepRate,
        allSweepRates
      ),
      clutch: gradeAgainst(
        'Clutch',
        'Performance in close matches (game 3)',
        teamStats.game3Matches > 0 ? teamStats.clutchWinPct : null,
        allClutchRates
      ),
      schedule: gradeAgainst(
        'Schedule',
        'Strength of opponents faced',
        teamRanking.sos,
        rankings.map((r) => r.sos)
      ),
      consistency: gradeAgainst(
        'Consistency',
        'Win rate reliability',
        teamRanking.winPercentage,
        rankings.map((r) => r.winPercentage)
      ),
      games: gradeAgainst(
        'Games',
        'Individual game win rate',
        teamRanking.gameWinPercentage,
        rankings.map((r) => r.gameWinPercentage)
      ),
    });
  }, [teamId, rankings, latestMatches, careerRankingsData, mode]);

  return {
    grades,
    isLoading: mode === 'season' ? isLoadingRankings || matchesLoading : isLoadingCareer,
  };
}
