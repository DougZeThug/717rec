import { DivisionSeasonRecord, SeasonBreakdown } from '@/types/teamAdvancedStats';

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
