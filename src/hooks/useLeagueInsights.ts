import { useMemo } from 'react';

import { useTeamRankings } from '@/hooks/useTeamRankings';
import { useWeeklyPowerScoreTrends } from '@/hooks/useWeeklyPowerScoreTrends';
import { Ranking } from '@/types';

export interface DivisionStrength {
  division: string;
  avgPowerScore: number;
  teamCount: number;
  avgWinPct: number;
  avgSos: number;
}

export interface LeagueOverview {
  totalTeams: number;
  totalMatches: number;
  avgPowerScore: number;
  avgWinPct: number;
  medianPowerScore: number;
}

export interface ParityMetrics {
  standardDeviation: number;
  parityIndex: number; // 0-100, higher = more parity
  topBottomGap: number; // difference between #1 and last
  competitiveTeams: number; // teams within 10 points of average
}

export interface TopPerformer {
  category: string;
  teamName: string;
  teamId: string;
  logoUrl?: string | null;
  value: string;
  description: string;
}

export interface LeagueInsightsData {
  overview: LeagueOverview | null;
  divisionStrength: DivisionStrength[];
  parity: ParityMetrics | null;
  topPerformers: TopPerformer[];
  isLoading: boolean;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function useLeagueInsights(): LeagueInsightsData {
  const { rankings, isLoading: isLoadingRankings } = useTeamRankings();
  const { data: risersData, isLoading: isLoadingRisers } = useWeeklyPowerScoreTrends('up', 5);
  const { data: fallersData, isLoading: isLoadingFallers } = useWeeklyPowerScoreTrends('down', 5);

  const result = useMemo(() => {
    if (!rankings || rankings.length === 0) {
      return {
        overview: null,
        divisionStrength: [],
        parity: null,
        topPerformers: [],
      };
    }

    // Only include teams that have played matches
    const activeTeams = rankings.filter((r) => r.wins + r.losses > 0);
    if (activeTeams.length === 0) {
      return { overview: null, divisionStrength: [], parity: null, topPerformers: [] };
    }

    const powerScores = activeTeams.map((r) => r.powerScore);
    const avgPowerScore = powerScores.reduce((s, v) => s + v, 0) / powerScores.length;
    const totalMatches = activeTeams.reduce((s, r) => s + r.wins + r.losses, 0) / 2; // each match counted twice

    // === Overview ===
    const overview: LeagueOverview = {
      totalTeams: rankings.length,
      totalMatches: Math.round(totalMatches),
      avgPowerScore: Math.round(avgPowerScore * 10) / 10,
      avgWinPct:
        Math.round(
          (activeTeams.reduce((s, r) => s + r.winPercentage, 0) / activeTeams.length) * 1000
        ) / 10,
      medianPowerScore: Math.round(calculateMedian(powerScores) * 10) / 10,
    };

    // === Division Strength ===
    const divisionMap = new Map<string, Ranking[]>();
    for (const r of activeTeams) {
      const div = r.divisionName || 'Unassigned';
      if (!divisionMap.has(div)) divisionMap.set(div, []);
      divisionMap.get(div)!.push(r);
    }

    const divisionStrength: DivisionStrength[] = Array.from(divisionMap.entries())
      .map(([division, teams]) => ({
        division,
        avgPowerScore:
          Math.round((teams.reduce((s, t) => s + t.powerScore, 0) / teams.length) * 10) / 10,
        teamCount: teams.length,
        avgWinPct:
          Math.round((teams.reduce((s, t) => s + t.winPercentage, 0) / teams.length) * 1000) / 10,
        avgSos: Math.round((teams.reduce((s, t) => s + t.sos, 0) / teams.length) * 1000) / 1000,
      }))
      .sort((a, b) => b.avgPowerScore - a.avgPowerScore);

    // === Parity ===
    const stdDev = calculateStandardDeviation(powerScores);
    const maxScore = Math.max(...powerScores);
    const minScore = Math.min(...powerScores);
    const topBottomGap = maxScore - minScore;
    // Parity index: lower std dev = higher parity. Max parity at stdDev=0, scale to 100
    const parityIndex = Math.max(0, Math.round(100 - stdDev * 4));
    const competitiveTeams = activeTeams.filter(
      (r) => Math.abs(r.powerScore - avgPowerScore) <= 10
    ).length;

    const parity: ParityMetrics = {
      standardDeviation: Math.round(stdDev * 10) / 10,
      parityIndex,
      topBottomGap: Math.round(topBottomGap * 10) / 10,
      competitiveTeams,
    };

    // === Top Performers ===
    const topPerformers: TopPerformer[] = [];

    // Highest power score
    const topPower = activeTeams[0]; // already sorted by power score desc
    if (topPower) {
      topPerformers.push({
        category: 'Top Power Score',
        teamName: topPower.teamName,
        teamId: topPower.teamId,
        logoUrl: topPower.logoUrl,
        value: topPower.powerScore.toFixed(1),
        description: `${topPower.wins}-${topPower.losses} record`,
      });
    }

    // Best win percentage
    const bestWinPct = [...activeTeams].sort((a, b) => b.winPercentage - a.winPercentage)[0];
    if (bestWinPct) {
      topPerformers.push({
        category: 'Best Win Rate',
        teamName: bestWinPct.teamName,
        teamId: bestWinPct.teamId,
        logoUrl: bestWinPct.logoUrl,
        value: `${(bestWinPct.winPercentage * 100).toFixed(0)}%`,
        description: `${bestWinPct.wins}-${bestWinPct.losses} record`,
      });
    }

    // Toughest schedule
    const toughestSos = [...activeTeams].sort((a, b) => b.sos - a.sos)[0];
    if (toughestSos) {
      topPerformers.push({
        category: 'Toughest Schedule',
        teamName: toughestSos.teamName,
        teamId: toughestSos.teamId,
        logoUrl: toughestSos.logoUrl,
        value: toughestSos.sos.toFixed(3),
        description: 'Strength of schedule',
      });
    }

    // Longest streak
    const longestStreak = [...activeTeams]
      .filter((r) => r.streak && r.streak.startsWith('W'))
      .sort((a, b) => {
        const aNum = parseInt(a.streak?.replace('W', '') || '0');
        const bNum = parseInt(b.streak?.replace('W', '') || '0');
        return bNum - aNum;
      })[0];
    if (longestStreak && longestStreak.streak) {
      topPerformers.push({
        category: 'Longest Win Streak',
        teamName: longestStreak.teamName,
        teamId: longestStreak.teamId,
        logoUrl: longestStreak.logoUrl,
        value: longestStreak.streak,
        description: 'Current active streak',
      });
    }

    // Most improved (from risers)
    const topRiser = risersData?.trends?.[0];
    if (topRiser) {
      topPerformers.push({
        category: 'Most Improved',
        teamName: topRiser.teamName,
        teamId: topRiser.teamId,
        logoUrl: topRiser.logoUrl,
        value: `+${topRiser.delta.toFixed(1)}`,
        description: 'Power score change this week',
      });
    }

    // Biggest faller
    const topFaller = fallersData?.trends?.[0];
    if (topFaller) {
      topPerformers.push({
        category: 'Biggest Drop',
        teamName: topFaller.teamName,
        teamId: topFaller.teamId,
        logoUrl: topFaller.logoUrl,
        value: topFaller.delta.toFixed(1),
        description: 'Power score change this week',
      });
    }

    return { overview, divisionStrength, parity, topPerformers };
  }, [rankings, risersData, fallersData]);

  return {
    ...result,
    isLoading: isLoadingRankings || isLoadingRisers || isLoadingFallers,
  };
}
