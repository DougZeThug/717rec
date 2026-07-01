import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Ranking } from '@/types';

import { useLeagueInsights } from '../useLeagueInsights';

vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: vi.fn(),
}));

vi.mock('@/hooks/useWeeklyPowerScoreTrends', () => ({
  useWeeklyPowerScoreTrends: vi.fn(),
}));

import { useTeamRankings } from '@/hooks/useTeamRankings';
import { useWeeklyPowerScoreTrends } from '@/hooks/useWeeklyPowerScoreTrends';

const makeRanking = (id: string, power: number, wins = 3, losses = 1, div = 'Div A') =>
  ({
    teamId: id,
    teamName: `Team ${id}`,
    powerScore: power,
    wins,
    losses,
    winPercentage: wins / (wins + losses),
    sos: 0.5,
    streak: 'W2',
    divisionName: div,
    logoUrl: null,
  }) as unknown as Ranking;

describe('useLeagueInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useWeeklyPowerScoreTrends as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it('returns isLoading=true when any sub-hook is loading', () => {
    (useTeamRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      rankings: [],
      isLoading: true,
    });
    const { result } = renderHook(() => useLeagueInsights());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns nulls/empty when rankings is empty', () => {
    (useTeamRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      rankings: [],
      isLoading: false,
    });
    const { result } = renderHook(() => useLeagueInsights());
    expect(result.current.overview).toBeNull();
    expect(result.current.parity).toBeNull();
    expect(result.current.divisionStrength).toEqual([]);
    expect(result.current.topPerformers).toEqual([]);
  });

  it('computes overview from active teams', () => {
    (useTeamRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      rankings: [
        makeRanking('a', 90, 4, 0),
        makeRanking('b', 70, 3, 1),
        makeRanking('c', 50, 2, 2),
      ],
      isLoading: false,
    });
    const { result } = renderHook(() => useLeagueInsights());
    expect(result.current.overview).not.toBeNull();
    expect(result.current.overview?.totalTeams).toBe(3);
    expect(result.current.overview?.totalMatches).toBeGreaterThan(0);
  });

  it('computes divisionStrength grouped by division', () => {
    (useTeamRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      rankings: [
        makeRanking('a', 90, 3, 1, 'Div A'),
        makeRanking('b', 70, 3, 1, 'Div A'),
        makeRanking('c', 50, 3, 1, 'Div B'),
      ],
      isLoading: false,
    });
    const { result } = renderHook(() => useLeagueInsights());
    expect(result.current.divisionStrength).toHaveLength(2);
    const divA = result.current.divisionStrength.find((d) => d.division === 'Div A');
    expect(divA?.teamCount).toBe(2);
  });

  it('computes parity metrics', () => {
    (useTeamRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      rankings: [makeRanking('a', 100, 3, 1), makeRanking('b', 50, 3, 1)],
      isLoading: false,
    });
    const { result } = renderHook(() => useLeagueInsights());
    expect(result.current.parity).not.toBeNull();
    expect(result.current.parity?.topBottomGap).toBe(50);
  });

  it('includes riser in topPerformers when trend data present', () => {
    (useTeamRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      rankings: [makeRanking('a', 90, 3, 1)],
      isLoading: false,
    });
    (useWeeklyPowerScoreTrends as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({
        data: { trends: [{ teamId: 'a', teamName: 'Team a', delta: 5.5, logoUrl: null }] },
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: undefined,
        isLoading: false,
      });
    const { result } = renderHook(() => useLeagueInsights());
    const mostImproved = result.current.topPerformers.find((p) => p.category === 'Most Improved');
    expect(mostImproved).toBeDefined();
    expect(mostImproved?.value).toBe('+5.5');
  });

  it('propagates a rankings fetch error', () => {
    const rankingsError = new Error('rankings down');
    (useTeamRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      rankings: [],
      isLoading: false,
      error: rankingsError,
      refetch: vi.fn(),
    });
    const { result } = renderHook(() => useLeagueInsights());
    expect(result.current.error).toBe(rankingsError);
  });

  it('propagates a trends fetch error', () => {
    (useTeamRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      rankings: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const trendsError = new Error('trends down');
    (useWeeklyPowerScoreTrends as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: trendsError,
      refetch: vi.fn(),
    });
    const { result } = renderHook(() => useLeagueInsights());
    expect(result.current.error).toBe(trendsError);
  });

  it('refetch triggers rankings and both trend queries', () => {
    const refetchRankings = vi.fn();
    const refetchTrends = vi.fn();
    (useTeamRankings as ReturnType<typeof vi.fn>).mockReturnValue({
      rankings: [],
      isLoading: false,
      error: null,
      refetch: refetchRankings,
    });
    (useWeeklyPowerScoreTrends as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: refetchTrends,
    });
    const { result } = renderHook(() => useLeagueInsights());
    result.current.refetch();
    expect(refetchRankings).toHaveBeenCalledTimes(1);
    // Two trend queries (risers + fallers) share the mocked refetch.
    expect(refetchTrends).toHaveBeenCalledTimes(2);
  });
});
