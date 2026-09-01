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
import { calculateGPA, calculateGrade, LetterGrade } from '@/utils/reportCardUtils';
import {
  calculateLeagueMatchStats,
  EMPTY_LEAGUE_MATCH_STATS,
} from '@/utils/teamDetailsUtils/leagueMatchStats';

import { ReportCardMode } from './useTeamReportCard';

/**
 * A grade for a value ranked against the league, or `null` when there is
 * nothing to measure. `calculateGPA` leaves a null out of the average rather
 * than counting it as a fail.
 */
const gradeAgainst = (value: number | null, population: number[]): LetterGrade | null => {
  if (value === null || population.length === 0) return null;
  return calculateGrade(calculatePercentile(value, population, true).percentile);
};

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  gpa: number;
  /** `null` when the team has no measurable overall grade yet. */
  overallGrade: LetterGrade | null;
}

export function useAllTeamReportCards(mode: ReportCardMode) {
  const { rankings, isLoading: isLoadingRankings, error: rankingsError } = useTeamRankings();
  // Deduped against the query useTeamRankings already runs — same key, no extra
  // request. It carries the real sweep and clutch figures for every team.
  const { latestMatches, matchesLoading, matchesError, refetchMatches } = useRankingsData();
  const { data: careerRankingsData, isLoading: isLoadingCareer } = useCareerRankings({
    includeHidden: true,
  });

  // A failed fetch is not an empty league — without this the leaderboard would
  // rank every team on sweep rates of 0. Raised in review of the B-36 fix.
  const seasonError = mode === 'season' ? (matchesError ?? rankingsError ?? null) : null;

  const leaderboard = useMemo((): LeaderboardEntry[] => {
    if (seasonError) return [];
    if (mode === 'career') {
      const careerRankings = careerRankingsData || [];
      if (careerRankings.length === 0) return [];

      const populations = collectCareerPopulations(careerRankings);

      return careerRankings
        .map((team) => {
          const overallGrade = gradeAgainst(team.careerPowerScore, populations.powerScores);
          const consistencyGrade = gradeAgainst(team.careerWinPercentage, populations.winPcts);
          const gamesGrade = gradeAgainst(team.careerGameWinPercentage, populations.gameWinPcts);
          const offenseGrade = gradeAgainst(team.careerSweepRate, populations.sweepRates);
          const clutchGrade = gradeAgainst(
            team.careerClutchGame3s > 0 ? team.careerClutchWinPct : null,
            populations.clutchRates
          );
          const scheduleGrade = gradeAgainst(team.careerSos, populations.sos);

          const gpa = calculateGPA([
            { grade: overallGrade, weight: 3 },
            { grade: consistencyGrade, weight: 2 },
            { grade: gamesGrade, weight: 1.5 },
            { grade: offenseGrade, weight: 1 },
            { grade: clutchGrade, weight: 1 },
            { grade: scheduleGrade, weight: 1 },
          ]);

          return {
            teamId: team.teamId,
            teamName: team.teamName,
            logoUrl: team.logoUrl ?? null,
            gpa,
            overallGrade,
          };
        })
        .sort((a, b) => b.gpa - a.gpa);
    }

    // Season mode
    if (!rankings || rankings.length === 0) return [];

    // Real sweep rates and clutch records, from the league match list. Sweep
    // rates used to be guessed from game win percentage — a monotone transform
    // of it, so the Offense grade was really just a restatement of the Games
    // grade — and every team was handed the same neutral clutch grade, which
    // still moved the GPA and so the order of this leaderboard.
    const matchStats = calculateLeagueMatchStats(latestMatches);
    const populations = collectSeasonPopulations(rankings, matchStats);

    return (
      rankings
        // A team with no rating has no GPA to list. It used to appear with a grade
        // built from a power score of zero it never earned.
        .filter(isGradeable)
        .map((team) => {
          const teamStats = matchStats.get(team.teamId) ?? EMPTY_LEAGUE_MATCH_STATS;
          const overallGrade = gradeAgainst(team.powerScore, populations.powerScores);
          const consistencyGrade = gradeAgainst(team.winPercentage, populations.winPcts);
          const gamesGrade = gradeAgainst(team.gameWinPercentage, populations.gameWinPcts);
          const offenseGrade = gradeAgainst(teamStats.sweepRate, populations.sweepRates);
          const clutchGrade = gradeAgainst(
            teamStats.game3Matches > 0 ? teamStats.clutchWinPct : null,
            populations.clutchRates
          );
          const scheduleGrade = gradeAgainst(team.sos, populations.sos);

          const gpa = calculateGPA([
            { grade: overallGrade, weight: 3 },
            { grade: consistencyGrade, weight: 2 },
            { grade: gamesGrade, weight: 1.5 },
            { grade: offenseGrade, weight: 1 },
            { grade: clutchGrade, weight: 1 },
            { grade: scheduleGrade, weight: 1 },
          ]);

          return {
            teamId: team.teamId,
            teamName: team.teamName,
            logoUrl: team.logoUrl ?? null,
            gpa,
            overallGrade,
          };
        })
        .sort((a, b) => b.gpa - a.gpa)
    );
  }, [rankings, latestMatches, careerRankingsData, mode, seasonError]);

  return {
    leaderboard,
    isLoading: mode === 'season' ? isLoadingRankings || matchesLoading : isLoadingCareer,
    error: seasonError,
    retry: refetchMatches,
  };
}
