import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamTotalsComputed } from '../useTeamTotalsComputed';

// fetchCareerData is re-exported from useCareerData.ts which re-exports from CareerService
vi.mock('@/services/career/CareerService', () => ({
  fetchCareerData: vi.fn(),
  fetchAllTeamsCareerData: vi.fn(),
}));

// Mock all career calculation utilities (they're pure functions, tested separately)
vi.mock('@/utils/career', () => ({
  calculateCareerMatchStats: vi.fn(() => ({
    career_match_wins: 10,
    career_match_losses: 5,
  })),
  calculateCareerPowerScore: vi.fn().mockResolvedValue(85.0),
  calculateCareerSOS: vi.fn(() => 0.55),
  calculateCareerClutchRate: vi.fn(() => ({ clutch_rate: 0.6 })),
  calculateDivisionRecords: vi.fn(() => []),
  calculatePlayoffStats: vi.fn(() => ({
    career_playoff_wins: 3,
    career_playoff_losses: 1,
    competitive_playoff_wins: 2,
  })),
  calculateSweepRate: vi.fn(() => ({ sweep_rate: 0.4 })),
}));

vi.mock('@/utils/career/calculatePlayoffNarratives', () => ({
  calculatePlayoffConsistency: vi.fn(() => 0.75),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { fetchCareerData } from '@/services/career/CareerService';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockCareerData = {
  seasonStats: [
    {
      champion: true,
      runner_up: false,
      division_name: 'Division A',
      playoff_rank: 1,
      seasons: { name: 'Spring 2025' },
    },
  ],
  currentMatches: [],
  archivedMatches: [],
  playoffMatches: [],
  teamDivisionMap: {},
  bracketDivisionWeights: {},
  bracketDivisionDisplayNames: {},
  bracketSeasonMap: {},
  teamDivisionWeight: 1,
  currentSeasonId: 'season-1',
};

describe('useTeamTotalsComputed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when teamId is empty string', () => {
    const { result } = renderHook(() => useTeamTotalsComputed(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.totals).toBeUndefined();
    expect(fetchCareerData).not.toHaveBeenCalled();
  });

  it('returns null totals when fetchCareerData returns null', async () => {
    (fetchCareerData as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { result } = renderHook(() => useTeamTotalsComputed('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totals).toBeNull();
  });

  it('computes and returns totals from career data', async () => {
    (fetchCareerData as ReturnType<typeof vi.fn>).mockResolvedValue(mockCareerData);
    const { result } = renderHook(() => useTeamTotalsComputed('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totals).not.toBeNull();
    expect(result.current.totals?.career_match_wins).toBe(10);
    expect(result.current.totals?.championships).toBe(1);
  });

  it('does not double-count playoff matches in sweep rate denominator', async () => {
    (fetchCareerData as ReturnType<typeof vi.fn>).mockResolvedValue(mockCareerData);
    const { calculateSweepRate } = await import('@/utils/career');
    renderHook(() => useTeamTotalsComputed('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(calculateSweepRate).toHaveBeenCalled());
    const calledWith = (calculateSweepRate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // 10 wins + 5 losses = 15; playoff wins/losses are already included in career_match_* totals
    expect(calledWith.totalMatches).toBe(15);
  });

  it('sets error when fetchCareerData throws', async () => {
    (fetchCareerData as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fetch failed'));
    const { result } = renderHook(() => useTeamTotalsComputed('team-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.totals).toBeUndefined();
  });
});
