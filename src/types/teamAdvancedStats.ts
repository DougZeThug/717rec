export interface DivisionSeasonRecord {
  wins: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
}

export interface SeasonBreakdown {
  seasonId: string;
  seasonName: string;
  divisionName: string;
  // Match stats
  matchWins: number;
  matchLosses: number;
  winPct: number;
  // Game stats
  gameWins: number;
  gameLosses: number;
  gameWinPct: number;
  // Advanced metrics
  sos: number | null;
  powerScore: number | null;
  // Playoff stats
  playoffWins: number;
  playoffLosses: number;
  playoffRank: number | null;
  isChampion: boolean;
  isRunnerUp: boolean;
  isTop3: boolean;
  // Match quality
  sweeps: number;
  sweepRate: number;
  closeWins: number; // 2-1 wins
  closeLosses: number; // 1-2 losses
  clutchFactor: number | null; // closeWins / (closeWins + closeLosses)
  // Division records for that season
  divisionRecords: {
    competitive: DivisionSeasonRecord;
    intermediate: DivisionSeasonRecord;
    recreational: DivisionSeasonRecord;
  };
}

export interface TeamAdvancedStats {
  seasons: SeasonBreakdown[];
  // Aggregated trends
  bestSeason: SeasonBreakdown | null;
  worstSeason: SeasonBreakdown | null;
  averagePowerScore: number;
  powerScoreTrend: 'improving' | 'declining' | 'stable';
  // Best/worst division performance
  bestDivisionTier: 'competitive' | 'intermediate' | 'recreational' | null;
  worstDivisionTier: 'competitive' | 'intermediate' | 'recreational' | null;
}
