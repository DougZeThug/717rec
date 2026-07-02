import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Ranking } from '@/types';

import { useChartData } from '../useChartData';

const makeRanking = (
  teamId: string,
  winPercentage: number,
  powerScore: number,
  overrides: Partial<Ranking> = {}
): Ranking => ({
  teamId,
  teamName: `Team ${teamId}`,
  wins: 5,
  losses: 5,
  winPercentage,
  gamesWon: 10,
  gamesLost: 10,
  gameWinPercentage: 0.5,
  sos: 0.5,
  powerScore,
  headToHead: {},
  closeMatchLosses: 0,
  ...overrides,
});

describe('useChartData', () => {
  it('sorts win/loss data by win percentage descending', () => {
    const rankings = [
      makeRanking('low', 0.2, 50),
      makeRanking('high', 0.9, 40),
      makeRanking('mid', 0.5, 60),
    ];
    const { result } = renderHook(() => useChartData(rankings, 10));
    expect(result.current.winLossData.map((t) => t.id)).toEqual(['high', 'mid', 'low']);
  });

  it('limits win/loss data to the chart limit', () => {
    const rankings = Array.from({ length: 6 }, (_, i) => makeRanking(`t${i}`, i / 10, 50));
    const { result } = renderHook(() => useChartData(rankings, 3));
    expect(result.current.winLossData).toHaveLength(3);
  });

  it('converts win percentage to a rounded 0-100 number', () => {
    const rankings = [makeRanking('a', 2 / 3, 50)];
    const { result } = renderHook(() => useChartData(rankings, 5));
    expect(result.current.winLossData[0].winPercentage).toBe(66.7);
  });

  it('includes team identity fields in win/loss data', () => {
    const rankings = [
      makeRanking('a', 0.5, 50, { imageUrl: 'img.png', logoUrl: 'logo.png', wins: 3, losses: 3 }),
    ];
    const { result } = renderHook(() => useChartData(rankings, 5));
    expect(result.current.winLossData[0]).toMatchObject({
      id: 'a',
      name: 'Team a',
      wins: 3,
      losses: 3,
      imageUrl: 'img.png',
      logoUrl: 'logo.png',
    });
  });

  it('sorts power score data by power score descending', () => {
    const rankings = [
      makeRanking('low', 0.9, 30),
      makeRanking('high', 0.1, 90),
      makeRanking('mid', 0.5, 60),
    ];
    const { result } = renderHook(() => useChartData(rankings, 10));
    expect(result.current.powerScoreData.map((t) => t.id)).toEqual(['high', 'mid', 'low']);
  });

  it('caps power score data at the top 8 regardless of chart limit', () => {
    const rankings = Array.from({ length: 12 }, (_, i) => makeRanking(`t${i}`, 0.5, i));
    const { result } = renderHook(() => useChartData(rankings, 12));
    expect(result.current.powerScoreData).toHaveLength(8);
  });

  it('returns empty arrays for empty rankings', () => {
    const { result } = renderHook(() => useChartData([], 5));
    expect(result.current.winLossData).toEqual([]);
    expect(result.current.powerScoreData).toEqual([]);
  });
});
