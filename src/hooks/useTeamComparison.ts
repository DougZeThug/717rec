import { useMemo } from 'react';

import { Team } from '@/types';

import { useOpponentHistory } from './useHeadToHead';
import { TeamPercentiles, useLeaguePercentiles } from './useLeaguePercentiles';
import { useTeamTotals } from './useTeamTotals';

interface TeamTotalsData {
  career_match_wins: number;
  career_match_losses: number;
  career_game_wins: number;
  career_game_losses: number;
  career_playoff_wins: number;
  career_playoff_losses: number;
  championships: number;
  runner_ups: number;
  career_power_score: number;
  career_sweep_rate: number;
  career_sweeps: number;
  career_sos: number;
  division_records: {
    competitive: { wins: number; losses: number };
    intermediate: { wins: number; losses: number };
    recreational: { wins: number; losses: number };
  };
}

export interface TeamComparisonSide {
  id: string;
  name: string;
  logoUrl: string | null;
  totals: TeamTotalsData | null;
  percentiles: TeamPercentiles | null;
  winPct: number;
  gameWinPct: number;
}

export interface TeamComparisonData {
  team1: TeamComparisonSide | null;
  team2: TeamComparisonSide | null;
  headToHead: {
    team1Wins: number;
    team2Wins: number;
    gameWins1: number;
    gameWins2: number;
    lastPlayed: string | null;
    isFirstMeeting: boolean;
  } | null;
  isLoading: boolean;
}

export const useTeamComparison = (team1: Team | null, team2: Team | null): TeamComparisonData => {
  const { totals: totals1, isLoading: loading1 } = useTeamTotals(team1?.id ?? '');
  const { totals: totals2, isLoading: loading2 } = useTeamTotals(team2?.id ?? '');
  const { getTeamPercentiles, isLoading: loadingPercentiles } = useLeaguePercentiles();
  const { data: h2hHistory, isLoading: loadingH2H } = useOpponentHistory(team1?.id, team2?.id);
  const comparisonData = useMemo((): TeamComparisonData => {
    const isLoading = loading1 || loading2 || loadingPercentiles || loadingH2H;

    const buildTeamSide = (
      team: Team | null,
      totals: TeamTotalsData | null
    ): TeamComparisonSide | null => {
      if (!team) return null;

      const percentiles = getTeamPercentiles(team.id);
      const totalMatches = (totals?.career_match_wins || 0) + (totals?.career_match_losses || 0);
      const totalGames = (totals?.career_game_wins || 0) + (totals?.career_game_losses || 0);
      const winPct = totalMatches > 0 ? ((totals?.career_match_wins || 0) / totalMatches) * 100 : 0;
      const gameWinPct = totalGames > 0 ? ((totals?.career_game_wins || 0) / totalGames) * 100 : 0;

      return {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl,
        totals,
        percentiles,
        winPct,
        gameWinPct,
      };
    };

    // Build head-to-head data
    let headToHead = null;
    if (h2hHistory?.summary) {
      const summary = h2hHistory.summary;
      headToHead = {
        team1Wins: summary.wins,
        team2Wins: summary.losses,
        gameWins1: summary.game_wins,
        gameWins2: summary.game_losses,
        lastPlayed: summary.last_played_at,
        isFirstMeeting: summary.matches_played === 0,
      };
    } else if (team1 && team2 && !loadingH2H) {
      // No history found = first meeting
      headToHead = {
        team1Wins: 0,
        team2Wins: 0,
        gameWins1: 0,
        gameWins2: 0,
        lastPlayed: null,
        isFirstMeeting: true,
      };
    }

    return {
      team1: buildTeamSide(team1, totals1 ?? null),
      team2: buildTeamSide(team2, totals2 ?? null),
      headToHead,
      isLoading,
    };
  }, [
    team1,
    team2,
    totals1,
    totals2,
    getTeamPercentiles,
    loadingPercentiles,
    h2hHistory,
    loading1,
    loading2,
    loadingH2H,
  ]);

  return comparisonData;
};
