import { useMemo } from 'react';

import { useRankingsData } from '@/hooks/rankings/useRankingsData';
import { useCareerRankings } from '@/hooks/useCareerRankings';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import { calculatePercentile } from '@/utils/percentileUtils';
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
  const { rankings, isLoading: isLoadingRankings } = useTeamRankings();
  // Deduped against the query useTeamRankings already runs — same key, no extra
  // request. It carries the real sweep and clutch figures for every team.
  const { latestMatches, matchesLoading } = useRankingsData();
  const { data: careerRankingsData, isLoading: isLoadingCareer } = useCareerRankings({
    includeHidden: true,
  });

  const leaderboard = useMemo((): LeaderboardEntry[] => {
    if (mode === 'career') {
      const careerRankings = careerRankingsData || [];
      if (careerRankings.length === 0) return [];

      const allPowerScores = careerRankings.map((r) => r.careerPowerScore);
      const allWinPcts = careerRankings.map((r) => r.careerWinPercentage);
      const allSos = careerRankings.map((r) => r.careerSos);
      const allSweepRates = careerRankings.map((r) => r.careerSweepRate);
      const allGameWinPcts = careerRankings.map((r) => r.careerGameWinPercentage);
      // Only teams that have played a deciding third game have a clutch rate to rank.
      const allClutchRates = careerRankings
        .filter((r) => r.careerClutchGame3s > 0)
        .map((r) => r.careerClutchWinPct);

      return careerRankings
        .map((team) => {
          const overallGrade = gradeAgainst(team.careerPowerScore, allPowerScores);
          const consistencyGrade = gradeAgainst(team.careerWinPercentage, allWinPcts);
          const gamesGrade = gradeAgainst(team.careerGameWinPercentage, allGameWinPcts);
          const offenseGrade = gradeAgainst(team.careerSweepRate, allSweepRates);
          const clutchGrade = gradeAgainst(
            team.careerClutchGame3s > 0 ? team.careerClutchWinPct : null,
            allClutchRates
          );
          const scheduleGrade = gradeAgainst(team.careerSos, allSos);

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

    // Teams without a power score contribute 0 to percentile math only (display layers show "N/A" separately).
    const allPowerScores = rankings.map((r) => r.powerScore ?? 0);
    const allWinPcts = rankings.map((r) => r.winPercentage);
    const allSos = rankings.map((r) => r.sos);
    const allGameWinPcts = rankings.map((r) => r.gameWinPercentage);
    // Real sweep rates and clutch records, from the league match list. Sweep
    // rates used to be guessed from game win percentage — a monotone transform
    // of it, so the Offense grade was really just a restatement of the Games
    // grade — and every team was handed the same neutral clutch grade, which
    // still moved the GPA and so the order of this leaderboard.
    const matchStats = calculateLeagueMatchStats(latestMatches);
    const statsFor = (teamId: string) => matchStats.get(teamId) ?? EMPTY_LEAGUE_MATCH_STATS;
    const allSweepRates = rankings.map((r) => statsFor(r.teamId).sweepRate);
    const allClutchRates = rankings
      .map((r) => statsFor(r.teamId))
      .filter((s) => s.game3Matches > 0)
      .map((s) => s.clutchWinPct);

    return rankings
      .map((team) => {
        const teamStats = statsFor(team.teamId);
        const overallGrade = gradeAgainst(team.powerScore ?? 0, allPowerScores);
        const consistencyGrade = gradeAgainst(team.winPercentage, allWinPcts);
        const gamesGrade = gradeAgainst(team.gameWinPercentage, allGameWinPcts);
        const offenseGrade = gradeAgainst(teamStats.sweepRate, allSweepRates);
        const clutchGrade = gradeAgainst(
          teamStats.game3Matches > 0 ? teamStats.clutchWinPct : null,
          allClutchRates
        );
        const scheduleGrade = gradeAgainst(team.sos, allSos);

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
  }, [rankings, latestMatches, careerRankingsData, mode]);

  return {
    leaderboard,
    isLoading: mode === 'season' ? isLoadingRankings || matchesLoading : isLoadingCareer,
  };
}
