import { useMemo } from 'react';

import { useCareerRankings } from '@/hooks/useCareerRankings';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import { calculatePercentile } from '@/utils/percentileUtils';
import { calculateGPA, calculateGrade, LetterGrade } from '@/utils/reportCardUtils';

import { ReportCardMode } from './useTeamReportCard';

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  gpa: number;
  overallGrade: LetterGrade;
}

export function useAllTeamReportCards(mode: ReportCardMode) {
  const { rankings, isLoading: isLoadingRankings } = useTeamRankings();
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

      return careerRankings
        .map((team) => {
          const overallGrade = calculateGrade(
            calculatePercentile(team.careerPowerScore, allPowerScores, true).percentile
          );
          const consistencyGrade = calculateGrade(
            calculatePercentile(team.careerWinPercentage, allWinPcts, true).percentile
          );
          const gamesGrade = calculateGrade(
            calculatePercentile(team.careerGameWinPercentage, allGameWinPcts, true).percentile
          );
          const offenseGrade = calculateGrade(
            calculatePercentile(team.careerSweepRate, allSweepRates, true).percentile
          );
          const clutchPercentile =
            team.careerClutchGame3s > 0 ? Math.round(team.careerClutchWinPct) : 50;
          const clutchGrade = calculateGrade(clutchPercentile);
          const scheduleGrade = calculateGrade(
            calculatePercentile(team.careerSos, allSos, true).percentile
          );

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

    const allPowerScores = rankings.map((r) => r.powerScore);
    const allWinPcts = rankings.map((r) => r.winPercentage);
    const allSos = rankings.map((r) => r.sos);
    const allGameWinPcts = rankings.map((r) => r.gameWinPercentage);
    // Approximate sweep rates from game win %
    const allSweepRates = rankings.map((r) => {
      const totalMatches = r.wins + r.losses;
      if (totalMatches === 0) return 0;
      return r.gameWinPercentage > 0.6 ? r.gameWinPercentage * 0.8 : r.gameWinPercentage * 0.5;
    });

    return rankings
      .map((team, idx) => {
        const overallGrade = calculateGrade(
          calculatePercentile(team.powerScore, allPowerScores, true).percentile
        );
        const consistencyGrade = calculateGrade(
          calculatePercentile(team.winPercentage, allWinPcts, true).percentile
        );
        const gamesGrade = calculateGrade(
          calculatePercentile(team.gameWinPercentage, allGameWinPcts, true).percentile
        );
        const offenseGrade = calculateGrade(
          calculatePercentile(allSweepRates[idx], allSweepRates, true).percentile
        );
        const clutchGrade = calculateGrade(50); // Neutral when no per-team match data
        const scheduleGrade = calculateGrade(
          calculatePercentile(team.sos, allSos, true).percentile
        );

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
  }, [rankings, careerRankingsData, mode]);

  return {
    leaderboard,
    isLoading: mode === 'season' ? isLoadingRankings : isLoadingCareer,
  };
}
