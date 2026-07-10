import { DivisionSeasonRecord, SeasonBreakdown } from '@/types/teamAdvancedStats';

import type { MatchRecord, PlayoffMatchRecord } from './types';

export const categorizeDivision = (
  divisionName: string | null
): 'competitive' | 'intermediate' | 'recreational' | null => {
  if (!divisionName) return null;
  const name = divisionName.toLowerCase();
  if (name.includes('competitive') || name.includes('hidden')) return 'competitive';
  if (name.includes('intermediate') || name === 'cuspers') return 'intermediate';
  if (name.includes('recreational')) return 'recreational';
  return null;
};

export const createEmptyDivisionRecord = (): DivisionSeasonRecord => ({
  wins: 0,
  losses: 0,
  gameWins: 0,
  gameLosses: 0,
});

const getWinRate = (record: { wins: number; losses: number }) => {
  const total = record.wins + record.losses;
  return total > 0 ? record.wins / total : -1;
};

export const calculatePowerScoreTrend = (
  seasonsWithPowerScore: SeasonBreakdown[]
): 'improving' | 'declining' | 'stable' => {
  let powerScoreTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (seasonsWithPowerScore.length >= 2) {
    const midpoint = Math.floor(seasonsWithPowerScore.length / 2);
    const recentAvg =
      seasonsWithPowerScore.slice(0, midpoint).reduce((sum, s) => sum + (s.powerScore || 0), 0) /
      midpoint;
    const olderAvg =
      seasonsWithPowerScore.slice(midpoint).reduce((sum, s) => sum + (s.powerScore || 0), 0) /
      (seasonsWithPowerScore.length - midpoint);
    const diff = recentAvg - olderAvg;
    if (diff > 3) powerScoreTrend = 'improving';
    else if (diff < -3) powerScoreTrend = 'declining';
  }
  return powerScoreTrend;
};

export const calculateBestWorstDivisionTiers = (
  seasons: SeasonBreakdown[]
): {
  bestDivisionTier: 'competitive' | 'intermediate' | 'recreational' | null;
  worstDivisionTier: 'competitive' | 'intermediate' | 'recreational' | null;
} => {
  const divisionTotals = {
    competitive: { wins: 0, losses: 0 },
    intermediate: { wins: 0, losses: 0 },
    recreational: { wins: 0, losses: 0 },
  };

  for (const season of seasons) {
    for (const tier of ['competitive', 'intermediate', 'recreational'] as const) {
      divisionTotals[tier].wins += season.divisionRecords[tier].wins;
      divisionTotals[tier].losses += season.divisionRecords[tier].losses;
    }
  }

  const tiers = ['competitive', 'intermediate', 'recreational'] as const;
  const tiersWithGames = tiers.filter((t) => divisionTotals[t].wins + divisionTotals[t].losses > 0);

  let bestDivisionTier: 'competitive' | 'intermediate' | 'recreational' | null = null;
  let worstDivisionTier: 'competitive' | 'intermediate' | 'recreational' | null = null;

  if (tiersWithGames.length > 0) {
    bestDivisionTier = tiersWithGames.reduce((best, tier) =>
      getWinRate(divisionTotals[tier]) > getWinRate(divisionTotals[best]) ? tier : best
    );
    worstDivisionTier = tiersWithGames.reduce((worst, tier) =>
      getWinRate(divisionTotals[tier]) < getWinRate(divisionTotals[worst]) ? tier : worst
    );
  }

  return { bestDivisionTier, worstDivisionTier };
};

export interface MatchProcessingResult {
  sweeps: number;
  closeWins: number;
  closeLosses: number;
  divisionRecords: {
    competitive: { wins: number; losses: number; gameWins: number; gameLosses: number };
    intermediate: { wins: number; losses: number; gameWins: number; gameLosses: number };
    recreational: { wins: number; losses: number; gameWins: number; gameLosses: number };
  };
  playoffWins: number;
  playoffLosses: number;
}

export const processSeasonMatches = (
  teamId: string,
  seasonId: string,
  seasonMatches: MatchRecord[],
  seasonPlayoffMatches: PlayoffMatchRecord[],
  teamDivisionMap: Map<string, string>
): MatchProcessingResult => {
  let sweeps = 0;
  let closeWins = 0;
  let closeLosses = 0;

  const divisionRecords = {
    competitive: createEmptyDivisionRecord(),
    intermediate: createEmptyDivisionRecord(),
    recreational: createEmptyDivisionRecord(),
  };

  for (const match of seasonMatches) {
    const isTeam1 = match.team1_id === teamId;
    const teamGameWins = isTeam1 ? match.team1_game_wins || 0 : match.team2_game_wins || 0;
    const opponentGameWins = isTeam1 ? match.team2_game_wins || 0 : match.team1_game_wins || 0;
    const isWinner = match.winner_id === teamId;

    if (isWinner) {
      if (teamGameWins === 2 && opponentGameWins === 0) {
        sweeps++;
      } else if (teamGameWins === 2 && opponentGameWins === 1) {
        closeWins++;
      }
    } else if (match.loser_id === teamId) {
      if (opponentGameWins === 2 && teamGameWins === 1) {
        closeLosses++;
      }
    }

    const opponentId = isTeam1 ? match.team2_id : match.team1_id;
    if (opponentId) {
      const opponentDivision = teamDivisionMap.get(`${opponentId}_${seasonId}`);
      const tier = categorizeDivision(opponentDivision || null);
      if (tier) {
        if (isWinner) {
          divisionRecords[tier].wins++;
          divisionRecords[tier].gameWins += teamGameWins;
          divisionRecords[tier].gameLosses += opponentGameWins;
        } else if (match.loser_id === teamId) {
          divisionRecords[tier].losses++;
          divisionRecords[tier].gameWins += teamGameWins;
          divisionRecords[tier].gameLosses += opponentGameWins;
        }
      }
    }
  }

  let playoffWins = 0;
  let playoffLosses = 0;

  for (const match of seasonPlayoffMatches) {
    const isTeam1 = match.team1_id === teamId;
    const teamScore = isTeam1 ? match.team1_score || 0 : match.team2_score || 0;
    const opponentScore = isTeam1 ? match.team2_score || 0 : match.team1_score || 0;
    const isWinner = match.winner_id === teamId;

    if (isWinner) {
      playoffWins++;
      if (teamScore === 2 && opponentScore === 0) {
        sweeps++;
      } else if (teamScore === 2 && opponentScore === 1) {
        closeWins++;
      }
    } else if (match.loser_id === teamId) {
      playoffLosses++;
      if (opponentScore === 2 && teamScore === 1) {
        closeLosses++;
      }
    }

    const bracketWeight = match.bracketInfo?.division_weight || 0.85;
    let tier: 'competitive' | 'intermediate' | 'recreational';
    if (bracketWeight >= 0.89) tier = 'competitive';
    else if (bracketWeight >= 0.4) tier = 'intermediate';
    else tier = 'recreational';

    if (isWinner) {
      divisionRecords[tier].wins++;
      divisionRecords[tier].gameWins += teamScore;
      divisionRecords[tier].gameLosses += opponentScore;
    } else if (match.loser_id === teamId) {
      divisionRecords[tier].losses++;
      divisionRecords[tier].gameWins += teamScore;
      divisionRecords[tier].gameLosses += opponentScore;
    }
  }

  return {
    sweeps,
    closeWins,
    closeLosses,
    divisionRecords,
    playoffWins,
    playoffLosses,
  };
};
