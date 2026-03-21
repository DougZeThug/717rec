import { useMemo } from 'react';

import { useTeamMatches } from '@/hooks/useTeamMatches';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import { useWeeklyPowerScoreTrends } from '@/hooks/useWeeklyPowerScoreTrends';
import { calculatePercentile } from '@/utils/percentileUtils';
import {
  calculateGPA,
  calculateGrade,
  calculateImprovementPercentile,
  GradeCategory,
  TeamGrades,
} from '@/utils/reportCardUtils';
import { calculateClutchRecord } from '@/utils/teamDetailsUtils/matchOutcomeUtils';
import { calculateSweepRate } from '@/utils/teamDetailsUtils/sweepRateUtils';

export function useTeamReportCard(teamId: string | undefined) {
  const { rankings, isLoading: isLoadingRankings } = useTeamRankings();
  const { pastMatches, isLoadingMatches } = useTeamMatches(teamId);
  const { data: risersData, isLoading: isLoadingRisers } = useWeeklyPowerScoreTrends('up', 20);
  const { data: fallersData, isLoading: isLoadingFallers } = useWeeklyPowerScoreTrends('down', 20);

  const grades = useMemo((): TeamGrades | null => {
    if (!teamId || !rankings || rankings.length === 0) return null;

    const teamRanking = rankings.find((r) => r.teamId === teamId);
    if (!teamRanking) return null;

    // Collect all values for percentile calculations
    const allPowerScores = rankings.map((r) => r.powerScore);
    const allWinPcts = rankings.map((r) => r.winPercentage);
    const allSos = rankings.map((r) => r.sos);

    // Calculate sweep rates for all teams (we need all for percentile)
    const allSweepRates = rankings.map((r) => {
      if (r.teamId === teamId) {
        return calculateSweepRate(teamId, pastMatches).sweepRate;
      }
      // For other teams, estimate from game win % (sweep rate correlates with dominance)
      const totalMatches = r.wins + r.losses;
      if (totalMatches === 0) return 0;
      return r.gameWinPercentage > 0.6 ? r.gameWinPercentage * 0.8 : r.gameWinPercentage * 0.5;
    });

    // Calculate clutch rates for all teams
    const teamClutchRecord = calculateClutchRecord(teamId, pastMatches);
    const teamSweepStats = calculateSweepRate(teamId, pastMatches);

    // Overall — based on power score percentile
    const overallPercentile = calculatePercentile(teamRanking.powerScore, allPowerScores, true);
    const overall: GradeCategory = {
      label: 'Overall',
      grade: calculateGrade(overallPercentile.percentile),
      percentile: overallPercentile.percentile,
      description: 'Combined power score ranking',
    };

    // Offense — based on sweep rate
    const offensePercentile = calculatePercentile(teamSweepStats.sweepRate, allSweepRates, true);
    const offense: GradeCategory = {
      label: 'Offense',
      grade: calculateGrade(offensePercentile.percentile),
      percentile: offensePercentile.percentile,
      description: 'Dominance in matches (sweep rate)',
    };

    // Clutch — based on game-3 win percentage
    const clutchPct = teamClutchRecord.clutchWinPct;
    // If no game-3 matches, give average grade
    const clutchPercentile = teamClutchRecord.game3Matches > 0 ? Math.round(clutchPct * 100) : 50;
    const clutch: GradeCategory = {
      label: 'Clutch',
      grade: calculateGrade(clutchPercentile),
      percentile: clutchPercentile,
      description: 'Performance in close matches (game 3)',
    };

    // Schedule — based on strength of schedule
    const schedulePercentile = calculatePercentile(teamRanking.sos, allSos, true);
    const schedule: GradeCategory = {
      label: 'Schedule',
      grade: calculateGrade(schedulePercentile.percentile),
      percentile: schedulePercentile.percentile,
      description: 'Strength of opponents faced',
    };

    // Consistency — based on win percentage
    const consistencyPercentile = calculatePercentile(teamRanking.winPercentage, allWinPcts, true);
    const consistency: GradeCategory = {
      label: 'Consistency',
      grade: calculateGrade(consistencyPercentile.percentile),
      percentile: consistencyPercentile.percentile,
      description: 'Win rate reliability',
    };

    // Improvement — based on power score trend
    const risers = (risersData?.trends || []).map((t) => ({
      teamId: t.teamId,
      change: t.delta,
    }));
    const fallers = (fallersData?.trends || []).map((t) => ({
      teamId: t.teamId,
      change: t.delta,
    }));
    const improvementPercentile = calculateImprovementPercentile(teamId, risers, fallers);
    const improvement: GradeCategory = {
      label: 'Trend',
      grade: calculateGrade(improvementPercentile),
      percentile: improvementPercentile,
      description: 'Recent power score movement',
    };

    const allGrades = [
      overall.grade,
      offense.grade,
      clutch.grade,
      schedule.grade,
      consistency.grade,
      improvement.grade,
    ];

    return {
      overall,
      offense,
      clutch,
      schedule,
      consistency,
      improvement,
      gpa: calculateGPA(allGrades),
    };
  }, [teamId, rankings, pastMatches, risersData, fallersData]);

  return {
    grades,
    isLoading: isLoadingRankings || isLoadingMatches || isLoadingRisers || isLoadingFallers,
  };
}
