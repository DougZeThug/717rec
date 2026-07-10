import { describe, expect, it } from 'vitest';

import type { SeasonBreakdown } from '@/types/teamAdvancedStats';

import {
  calculateBestWorstDivisionTiers,
  calculatePowerScoreTrend,
  categorizeDivision,
} from '../calculations';

const createSeason = (overrides: Partial<SeasonBreakdown>): SeasonBreakdown => ({
  seasonId: 'season-1',
  seasonName: 'Season 1',
  divisionName: 'Competitive',
  matchWins: 0,
  matchLosses: 0,
  winPct: 0,
  gameWins: 0,
  gameLosses: 0,
  gameWinPct: 0,
  sos: null,
  powerScore: null,
  playoffWins: 0,
  playoffLosses: 0,
  playoffRank: null,
  isChampion: false,
  isRunnerUp: false,
  isTop3: false,
  sweeps: 0,
  sweepRate: 0,
  closeWins: 0,
  closeLosses: 0,
  clutchFactor: null,
  divisionRecords: {
    competitive: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
    intermediate: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
    recreational: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
  },
  ...overrides,
});

describe('team season stat calculations', () => {
  it('categorizes known division names the same way as the hook helper did', () => {
    expect(categorizeDivision('Competitive East')).toBe('competitive');
    expect(categorizeDivision('hidden bracket')).toBe('competitive');
    expect(categorizeDivision('Cuspers')).toBe('intermediate');
    expect(categorizeDivision('Recreational West')).toBe('recreational');
    expect(categorizeDivision('Premier')).toBeNull();
    expect(categorizeDivision(null)).toBeNull();
  });

  it('calculates power score trend from recent seasons versus older seasons', () => {
    expect(
      calculatePowerScoreTrend([
        createSeason({ powerScore: 90 }),
        createSeason({ powerScore: 84 }),
        createSeason({ powerScore: 70 }),
        createSeason({ powerScore: 72 }),
      ])
    ).toBe('improving');

    expect(
      calculatePowerScoreTrend([
        createSeason({ powerScore: 65 }),
        createSeason({ powerScore: 68 }),
        createSeason({ powerScore: 82 }),
        createSeason({ powerScore: 84 }),
      ])
    ).toBe('declining');

    expect(calculatePowerScoreTrend([createSeason({ powerScore: 80 })])).toBe('stable');
  });

  it('calculates best and worst division tiers by aggregate win rate', () => {
    const result = calculateBestWorstDivisionTiers([
      createSeason({
        divisionRecords: {
          competitive: { wins: 3, losses: 1, gameWins: 6, gameLosses: 3 },
          intermediate: { wins: 1, losses: 3, gameWins: 3, gameLosses: 6 },
          recreational: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
        },
      }),
      createSeason({
        divisionRecords: {
          competitive: { wins: 1, losses: 1, gameWins: 3, gameLosses: 3 },
          intermediate: { wins: 2, losses: 2, gameWins: 4, gameLosses: 4 },
          recreational: { wins: 2, losses: 0, gameWins: 4, gameLosses: 1 },
        },
      }),
    ]);

    expect(result).toEqual({
      bestDivisionTier: 'recreational',
      worstDivisionTier: 'intermediate',
    });
  });
});
