import { useMemo } from 'react';

import { useCareerRankings } from '@/hooks/useCareerRankings';
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

export type ReportCardMode = 'season' | 'career';

export function useTeamReportCard(teamId: string | undefined, mode: ReportCardMode = 'season') {
  const { rankings, isLoading: isLoadingRankings } = useTeamRankings();
  const { pastMatches, isLoadingMatches } = useTeamMatches(teamId);
  const { data: careerRankingsData, isLoading: isLoadingCareer } = useCareerRankings();
  const { data: risersData, isLoading: isLoadingRisers } = useWeeklyPowerScoreTrends('up', 20);
  const { data: fallersData, isLoading: isLoadingFallers } = useWeeklyPowerScoreTrends('down', 20);

  const grades = useMemo((): TeamGrades | null => {
    if (!teamId) return null;

    // Trend grade (shared between modes)
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

    if (mode === 'career') {
      const careerRankings = careerRankingsData || [];
      if (careerRankings.length === 0) return null;

      const teamCareer = careerRankings.find((r) => r.teamId === teamId);
      if (!teamCareer) return null;

      const allPowerScores = careerRankings.map((r) => r.careerPowerScore);
      const allWinPcts = careerRankings.map((r) => r.careerWinPercentage);
      const allSos = careerRankings.map((r) => r.careerSos);
      const allSweepRates = careerRankings.map((r) => r.careerSweepRate);

      // Overall
      const overallPercentile = calculatePercentile(teamCareer.careerPowerScore, allPowerScores, true);
      const overall: GradeCategory = {
        label: 'Overall',
        grade: calculateGrade(overallPercentile.percentile),
        percentile: overallPercentile.percentile,
        description: 'Career power score ranking',
      };

      // Offense — career sweep rate
      const offensePercentile = calculatePercentile(teamCareer.careerSweepRate, allSweepRates, true);
      const offense: GradeCategory = {
        label: 'Offense',
        grade: calculateGrade(offensePercentile.percentile),
        percentile: offensePercentile.percentile,
        description: 'Career sweep rate',
      };

      // Clutch — career clutch win pct (already 0-100)
      const clutchPercentile = teamCareer.careerClutchGame3s > 0 ? Math.round(teamCareer.careerClutchWinPct) : 50;
      const clutch: GradeCategory = {
        label: 'Clutch',
        grade: calculateGrade(clutchPercentile),
        percentile: clutchPercentile,
        description: 'Career game 3 win rate',
      };

      // Schedule — career SOS
      const schedulePercentile = calculatePercentile(teamCareer.careerSos, allSos, true);
      const schedule: GradeCategory = {
        label: 'Schedule',
        grade: calculateGrade(schedulePercentile.percentile),
        percentile: schedulePercentile.percentile,
        description: 'Career strength of schedule',
      };

      // Consistency — career win %
      const consistencyPercentile = calculatePercentile(teamCareer.careerWinPercentage, allWinPcts, true);
      const consistency: GradeCategory = {
        label: 'Consistency',
        grade: calculateGrade(consistencyPercentile.percentile),
        percentile: consistencyPercentile.percentile,
        description: 'Career win rate',
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
    }

    // Season mode (existing logic)
    if (!rankings || rankings.length === 0) return null;

    const teamRanking = rankings.find((r) => r.teamId === teamId);
    if (!teamRanking) return null;

    const allPowerScores = rankings.map((r) => r.powerScore);
    const allWinPcts = rankings.map((r) => r.winPercentage);
    const allSos = rankings.map((r) => r.sos);

    const allSweepRates = rankings.map((r) => {
      if (r.teamId === teamId) {
        return calculateSweepRate(teamId, pastMatches).sweepRate;
      }
      const totalMatches = r.wins + r.losses;
      if (totalMatches === 0) return 0;
      return r.gameWinPercentage > 0.6 ? r.gameWinPercentage * 0.8 : r.gameWinPercentage * 0.5;
    });

    const teamClutchRecord = calculateClutchRecord(teamId, pastMatches);
    const teamSweepStats = calculateSweepRate(teamId, pastMatches);

    const overallPercentile = calculatePercentile(teamRanking.powerScore, allPowerScores, true);
    const overall: GradeCategory = {
      label: 'Overall',
      grade: calculateGrade(overallPercentile.percentile),
      percentile: overallPercentile.percentile,
      description: 'Combined power score ranking',
    };

    const offensePercentile = calculatePercentile(teamSweepStats.sweepRate, allSweepRates, true);
    const offense: GradeCategory = {
      label: 'Offense',
      grade: calculateGrade(offensePercentile.percentile),
      percentile: offensePercentile.percentile,
      description: 'Dominance in matches (sweep rate)',
    };

    const clutchPct = teamClutchRecord.clutchWinPct;
    const clutchPercentile = teamClutchRecord.game3Matches > 0 ? Math.round(clutchPct) : 50;
    const clutch: GradeCategory = {
      label: 'Clutch',
      grade: calculateGrade(clutchPercentile),
      percentile: clutchPercentile,
      description: 'Performance in close matches (game 3)',
    };

    const schedulePercentile = calculatePercentile(teamRanking.sos, allSos, true);
    const schedule: GradeCategory = {
      label: 'Schedule',
      grade: calculateGrade(schedulePercentile.percentile),
      percentile: schedulePercentile.percentile,
      description: 'Strength of opponents faced',
    };

    const consistencyPercentile = calculatePercentile(teamRanking.winPercentage, allWinPcts, true);
    const consistency: GradeCategory = {
      label: 'Consistency',
      grade: calculateGrade(consistencyPercentile.percentile),
      percentile: consistencyPercentile.percentile,
      description: 'Win rate reliability',
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
  }, [teamId, rankings, pastMatches, careerRankingsData, risersData, fallersData, mode]);

  return {
    grades,
    isLoading:
      mode === 'season'
        ? isLoadingRankings || isLoadingMatches || isLoadingRisers || isLoadingFallers
        : isLoadingCareer || isLoadingRisers || isLoadingFallers,
  };
}
